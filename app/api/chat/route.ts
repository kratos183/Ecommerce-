import { NextResponse, NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { describeError } from "@/lib/supabase";
import { buildPersonalBrief } from "@/lib/rag/personal";
import { retrieve } from "@/lib/rag/retrieve";
import { buildSystemPrompt, toCitations, type PromptInput, type HistoryTurn } from "@/lib/rag/prompt";
import { GroqError, isGroqConfigured, activeModel, streamChat, type ChatMessage } from "@/lib/rag/groq";

/**
 * POST /api/chat — the Ecommerce assistant.
 *
 * The pipeline, in order:
 *   1. Authenticate. Personal context is only ever built for a real session.
 *   2. Retrieve — embed the question, hybrid search (vector + full-text, fused
 *      with RRF in SQL).
 *   3. Assemble — the customer's own orders are read fresh from Postgres and
 *      injected alongside the retrieved documents. Private data is never embedded.
 *   4. Generate — stream from Groq with a system prompt that forbids answering
 *      from anywhere except the retrieved context.
 *   5. Emit — a single SSE stream carrying text deltas, then the citations, so
 *      the UI can show what the answer was based on.
 *
 * Streaming matters here: the model loads a lot of context and a customer staring
 * at a spinner for six seconds will assume it is broken.
 */

/** Runs on Node, not the edge — the embedding model needs a Node runtime. */
export const runtime = "nodejs";

/** Long enough for a cold model load plus a full answer. */
export const maxDuration = 60;

const MAX_QUESTION_LENGTH = 1000;
/** Enough turns to follow up on a previous answer without unbounded history. */
const MAX_HISTORY_TURNS = 6;

export async function POST(request: NextRequest) {
  const session = await getSessionUser(request);
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  if (!isGroqConfigured()) {
    return NextResponse.json(
      {
        error:
          "The assistant is not configured yet. Add GROQ_API_KEY to .env.local — a free key takes a minute at console.groq.com/keys.",
        code: "groq_not_configured",
      },
      { status: 503 }
    );
  }

  let body: { message?: string; history?: { role: string; content: string }[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const question = String(body.message ?? "").trim().slice(0, MAX_QUESTION_LENGTH);
  if (!question) {
    return NextResponse.json({ error: "Ask something first" }, { status: 400 });
  }

  // Stop fetching the customer's name if it cannot be read — the assistant works
  // without it, and a profile lookup should not be able to fail the request.
  const name = await readCustomerName(session.id);

  // Retrieval and the personal brief are independent, so run them together.
  const [retrieval, personal] = await Promise.all([
    retrieve(question, { limit: 6 }),
    buildPersonalBrief(session.id),
  ]);

  const history = sanitiseHistory(body.history);

  const promptInput: PromptInput = {
    customerName: name,
    question,
    chunks: retrieval.chunks,
    personal,
    history,
    degraded: retrieval.degraded,
  };

  const messages: ChatMessage[] = [
    { role: "system", content: buildSystemPrompt(promptInput) },
    ...history,
    { role: "user", content: question },
  ];

  // If the request is cancelled mid-answer the generator is aborted, which closes
  // the upstream Groq connection instead of leaving it streaming.
  const abort = new AbortController();
  request.signal.addEventListener("abort", () => abort.abort(), { once: true });

  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      /** Everything the UI needs, collected as the answer streams through. */
      const cited = new Set<number>();
      let answer = "";

      const send = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };

      try {
        // Sent before generation so the UI can render "searching the catalogue".
        send("sources", {
          count: retrieval.chunks.length,
          degraded: retrieval.degraded,
          foundOrders: personal.hasOrders,
          model: activeModel(),
        });

        for await (const delta of streamChat(messages, { signal: abort.signal })) {
          answer += delta;
          // Catch citations as they are written so they can be filtered at the end.
          for (const match of delta.matchAll(/\[(\d{1,2})\]/g)) {
            cited.add(Number(match[1]));
          }
          send("token", { text: delta });
        }

        // Only cite references that actually appear in the answer — showing a
        // source the reply never used is worse than showing none.
        const all = toCitations(retrieval.chunks);
        send("done", {
          answer,
          citations: all.filter((citation) => cited.has(citation.ref)),
          suggested: retrieval.chunks.slice(0, 3).map((chunk) => ({
            title: chunk.title,
            url: chunk.url,
          })),
        });
      } catch (error) {
        const message =
          error instanceof GroqError
            ? error.message
            : "Something went wrong generating a response. Please try again.";

        if (!abort.signal.aborted) {
          console.error("POST /api/chat error:", message);
          send("error", { error: message });
        }
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      // Nginx and similar proxies buffer SSE by default, which defeats streaming.
      "X-Accel-Buffering": "no",
    },
  });
}

/** Reads the customer's display name. Returns undefined rather than throwing. */
async function readCustomerName(userId: number): Promise<string | undefined> {
  try {
    const { data, error } = await db()
      .from("users")
      .select("name")
      .eq("id", userId)
      .maybeSingle();

    if (error) throw error;
    return data?.name ? String(data.name) : undefined;
  } catch (error) {
    console.error("readCustomerName() failed:", describeError(error));
    return undefined;
  }
}

/**
 * Keeps the conversation history the model needs and drops the rest.
 *
 * Only the most recent turns are kept, and anything over-long is truncated, so a
 * client cannot inflate the prompt by replaying a long history.
 */
function sanitiseHistory(
  raw: { role: string; content: string }[] | undefined
): HistoryTurn[] {
  if (!Array.isArray(raw)) return [];

  return raw
    .slice(-MAX_HISTORY_TURNS)
    .map((turn) => ({
      role: turn.role === "assistant" ? ("assistant" as const) : ("user" as const),
      content: String(turn.content ?? "").slice(0, 2000),
    }))
    .filter((turn) => turn.content.trim().length > 0);
}