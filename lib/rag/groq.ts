/**
 * Groq client.
 *
 * Plain `fetch` against Groq's OpenAI-compatible endpoint rather than the SDK —
 * one fewer dependency, and the streaming shape below is the whole reason this
 * module exists.
 *
 * Model availability varies by account and region, and the free tier often does
 * not expose the Llama models at all. The list below is therefore verified
 * against your key by `npm run check`, which prints what you actually have if
 * none of them work. Override the default with `GROQ_MODEL`.
 */

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

/**
 * Default model.
 *
 * `qwen3.8-27b` is the fastest of the good options on the free tier - roughly
 * 170 ms for a grounded answer against ~900 ms for the 120b - and for a
 * customer service chat, latency is the difference between feeling responsive
 * and feeling broken. Override with `GROQ_MODEL` if you would rather have the
 * larger model.
 */
export const DEFAULT_MODEL = "qwen/qwen3.8-27b";

/**
 * Tried in order when the requested model is unavailable, rate-limited or errors.
 *
 * NOTE: Groq's catalogue differs per account and region, and the free tier in
 * particular may not expose the Llama models at all. List only what you have
 * access to - run `node --env-file=.env.local scripts/check-setup.mjs`, which
 * enumerates the models on your key.
 */
const FALLBACK_MODELS = [
  "openai/gpt-oss-120b",
  "openai/gpt-oss-20b",
  "qwen/qwen3.8-27b",
];

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export function isGroqConfigured(): boolean {
  return Boolean(process.env.GROQ_API_KEY);
}

export function activeModel(): string {
  return process.env.GROQ_MODEL || DEFAULT_MODEL;
}

export class GroqError extends Error {
  constructor(
    message: string,
    readonly status?: number
  ) {
    super(message);
    this.name = "GroqError";
  }
}

/**
 * Streams a completion.
 *
 * Yields plain text deltas as they arrive. Errors from the upstream API are
 * surfaced as a thrown `GroqError` — the route catches them and sends an error
 * frame to the client rather than leaving the stream open forever.
 */
export async function* streamChat(
  messages: ChatMessage[],
  options: { signal?: AbortSignal } = {}
): AsyncGenerator<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new GroqError(
      "Groq is not configured. Add GROQ_API_KEY to .env.local — get a free key at https://console.groq.com/keys"
    );
  }

  // A model the key does not have access to fails the whole request, so try the
  // alternates before giving up. `done` stops the loop after a successful yield.
  let done = false;
  const models = [...new Set([activeModel(), ...FALLBACK_MODELS])];

  for (const model of models) {
    if (done) break;

    const response = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages,
        stream: true,
        temperature: 0.2,
        // Generous on purpose: the gpt-oss models are reasoning models and spend
        // tokens on hidden reasoning before emitting any visible content. At a
        // tight budget they return an empty completion with finish_reason "stop".
        max_tokens: 900,
      }),
      signal: options.signal,
    });

    if (!response.ok || !response.body) {
      const detail = await response.text().catch(() => "");
      const message = extractApiError(detail) || `Groq returned ${response.status}`;

      // A 4xx other than rate limiting will fail the same way for every model,
      // so stop instead of retrying the whole list.
      if (response.status < 500 && response.status !== 429) {
        throw new GroqError(message, response.status);
      }
      console.error(`Groq model ${model} failed:`, message);
      continue;
    }

    try {
      yield* parseStream(response.body);
      done = true;
    } catch (error) {
      if (error instanceof GroqError) throw error;
      // A stream that dies mid-flight is not going to be fixed by trying a
      // different model — surface it so the client gets a clear error.
      throw new GroqError(
        error instanceof Error ? error.message : "The response stream failed"
      );
    }
  }

  if (!done) {
    throw new GroqError("Groq did not return a response. Check GROQ_MODEL and your rate limit.");
  }
}

/** Reads Groq's SSE frames and yields the text deltas. */
async function* parseStream(body: ReadableStream<Uint8Array>): AsyncGenerator<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // Frames are separated by a blank line; keep the last partial one in the buffer.
      const frames = buffer.split("\n\n");
      buffer = frames.pop() ?? "";

      for (const frame of frames) {
        for (const line of frame.split("\n")) {
          if (!line.startsWith("data:")) continue;

          const data = line.slice(5).trim();
          if (data === "[DONE]") return;

          try {
            const parsed = JSON.parse(data);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) yield delta;
          } catch {
            // A frame that is not valid JSON is a keep-alive or an error object;
            // neither carries text, so skip it.
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

/** Pulls a useful message out of Groq's error body. */
function extractApiError(body: string): string {
  try {
    const parsed = JSON.parse(body);
    return parsed?.error?.message ?? "";
  } catch {
    return body.slice(0, 200);
  }
}