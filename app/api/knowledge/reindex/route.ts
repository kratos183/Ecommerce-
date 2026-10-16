import { NextResponse, NextRequest } from "next/server";
import { verifyToken } from "@/lib/auth";
import { EMBEDDING_MODEL } from "@/lib/rag/embeddings";
import { collectChunks, isIndexed, reindexKnowledge } from "@/lib/rag/ingest";
import { describeError } from "@/lib/supabase";

/**
 * POST /api/knowledge/reindex — rebuild the vector index. Admin only.
 *
 * Embedding the catalogue loads the model (~90 MB download the first time, then
 * cached) and runs one inference per chunk, so expect a few seconds rather than
 * milliseconds. Idempotent, so it is safe to call on a schedule or after an
 * import.
 *
 * GET returns the current state without doing any work — useful for checking
 * whether the assistant will be answering from real data or falling back.
 */

export const runtime = "nodejs";

/**
 * 60 seconds, not 300.
 *
 * Vercel rejects a larger value on the Hobby plan at deploy time — it is a build
 * error, not a runtime clamp — and Hobby is the plan most people start on. The
 * 300 that used to be here made the project undeployable on a free account.
 *
 * Reindexing runs one local embedding inference per chunk. If that overruns on
 * your dataset, run it from your own machine against the hosted database instead
 * of the deployed endpoint; it needs only the two Supabase variables and is
 * admin-only either way. See SETUP.md section 5.5.
 */
export const maxDuration = 60;

function requireAdmin(request: NextRequest) {
  const token = request.cookies.get("token")?.value;
  if (!token) return false;
  return verifyToken(token)?.role === "admin";
}

export async function GET(request: NextRequest) {
  if (!requireAdmin(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { products, documents, chunks } = await collectChunks();

    return NextResponse.json({
      model: EMBEDDING_MODEL,
      indexed: await isIndexed(),
      pending: { products, documents, chunks },
    });
  } catch (error) {
    console.error("GET /api/knowledge/reindex error:", describeError(error));
    return NextResponse.json({ error: "Could not read the knowledge base" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!requireAdmin(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const report = await reindexKnowledge();

    console.log(
      `Reindexed ${report.chunks} chunks from ${report.products} products and ` +
        `${report.documents} documents in ${report.durationMs}ms`
    );

    return NextResponse.json({ success: true, model: EMBEDDING_MODEL, ...report });
  } catch (error) {
    const message = describeError(error);
    console.error("POST /api/knowledge/reindex error:", message);

    // The likeliest cause by far is that supabase/rag.sql has not been applied,
    // so say that rather than surfacing a raw PostgREST message.
    if (message.includes("knowledge_chunks") || message.includes("vector")) {
      return NextResponse.json(
        {
          error:
            "The knowledge table is missing or the vector extension is not enabled. Apply supabase/rag.sql in the Supabase SQL editor.",
          detail: message,
        },
        { status: 503 }
      );
    }

    return NextResponse.json({ error: "Reindex failed", detail: message }, { status: 500 });
  }
}