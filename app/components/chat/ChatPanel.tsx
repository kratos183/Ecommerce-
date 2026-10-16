"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Send,
  Sparkles,
  Bot,
  User,
  RotateCcw,
  ExternalLink,
  AlertCircle,
  Loader2,
  BookOpen,
} from "lucide-react";

/* ──────────────────────────────────────────────────────────────────────────
   TYPES
   ────────────────────────────────────────────────────────────────────────── */

type Citation = {
  ref: number;
  title: string;
  url: string | null;
  source: string;
  relevance: number;
};

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
  error?: string;
  /** Status line shown above a streaming reply. */
  status?: string;
};

const STARTERS = [
  "What did I order last?",
  "Which product did I buy in my biggest order?",
  "Is my order still active?",
  "What size display do I need for a 60-student classroom?",
  "What is your return policy?",
  "Do you deliver outside Jharkhand?",
];

/* ──────────────────────────────────────────────────────────────────────────
   COMPONENT
   ────────────────────────────────────────────────────────────────────────── */

/**
 * The Obryn assistant.
 *
 * Consumes the SSE stream from /api/chat, appending text deltas as they arrive so
 * the reply appears token by token. Conversation history is sent back with each
 * request, but only the turns the server accepts — the client sends what it has
 * and `/api/chat` trims it.
 */
export default function ChatPanel() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Keep the newest message in view as tokens stream in.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  // Abort an in-flight request if the panel unmounts, so the upstream Groq
  // connection is closed rather than left streaming into nothing.
  useEffect(() => () => abortRef.current?.abort(), []);

  const send = useCallback(
    async (text: string) => {
      const question = text.trim();
      if (!question || busy) return;

      const history = messages
        .filter((m) => !m.error)
        .slice(-6)
        .map((m) => ({ role: m.role, content: m.content }));

      const userMessage: Message = { id: crypto.randomUUID(), role: "user", content: question };
      const replyId = crypto.randomUUID();

      setMessages((prev) => [
        ...prev,
        userMessage,
        { id: replyId, role: "assistant", content: "", status: "Searching the catalogue…" },
      ]);
      setInput("");
      setBusy(true);
      setNotice(null);

      const controller = new AbortController();
      abortRef.current = controller;

      const patch = (update: Partial<Message>) =>
        setMessages((prev) =>
          prev.map((m) => (m.id === replyId ? { ...m, ...update } : m))
        );

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({ message: question, history }),
        });

        if (!response.ok || !response.body) {
          const detail = await response.json().catch(() => ({}));
          patch({
            content: "",
            status: undefined,
            error:
              detail?.error ??
              (response.status === 503
                ? "The assistant is not configured yet."
                : `Request failed (${response.status}).`),
          });
          return;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let answer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const frames = buffer.split("\n\n");
          buffer = frames.pop() ?? "";

          for (const frame of frames) {
            const event = /^event: (.+)$/m.exec(frame)?.[1];
            const dataLine = /^data: (.+)$/m.exec(frame)?.[1];
            if (!event || !dataLine) continue;

            let payload: any;
            try {
              payload = JSON.parse(dataLine);
            } catch {
              continue;
            }

            if (event === "sources") {
              patch({
                status: payload.degraded
                  ? "Searching (keyword fallback)…"
                  : `Reading ${payload.count} reference${payload.count === 1 ? "" : "s"}…`,
              });
            } else if (event === "token") {
              answer += payload.text;
              patch({ content: answer, status: undefined });
            } else if (event === "done") {
              patch({ content: payload.answer, citations: payload.citations, status: undefined });
            } else if (event === "error") {
              patch({ content: answer, status: undefined, error: payload.error });
            }
          }
        }

        // Stream closed without a `done` frame — usually a dropped connection.
        // Only worth reporting if nothing at all arrived, otherwise the partial
        // answer is already on screen and an error would be misleading.
        setMessages((prev) =>
          prev.map((m) =>
            m.id === replyId && !m.content && !m.error
              ? {
                  ...m,
                  status: undefined,
                  error: "The connection closed before the answer finished.",
                }
              : m.id === replyId
                ? { ...m, status: undefined }
                : m
          )
        );
      } catch (error) {
        if (controller.signal.aborted) {
          patch({ status: undefined });
          return;
        }
        patch({
          status: undefined,
          error: error instanceof Error ? error.message : "Could not reach the assistant.",
        });
      } finally {
        setBusy(false);
        abortRef.current = null;
      }
    },
    [busy, messages]
  );

  const stop = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    setBusy(false);
  };

  const empty = messages.length === 0;

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-6 py-4">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 text-white">
            <Sparkles className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-sm font-bold text-slate-900">Ask Obryn</h2>
            <p className="text-[11px] text-slate-500">
              Answers about your orders, our products and our policies
            </p>
          </div>
        </div>

        {messages.length > 0 ? (
          <button
            onClick={() => {
              abortRef.current?.abort();
              setMessages([]);
              setNotice(null);
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-[11px] font-semibold text-slate-600 transition-colors hover:bg-slate-50"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            New chat
          </button>
        ) : null}
      </div>

      {/* ── Transcript ── */}
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
        {notice ? (
          <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>{notice}</p>
          </div>
        ) : null}

        {empty ? (
          <div className="mx-auto max-w-2xl py-6">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
              <h3 className="text-sm font-bold text-slate-900">
                I can see your orders and our catalogue
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-slate-600">
                Ask about anything you have bought, what is in stock, or how our
                delivery, returns and installation work. Every answer is grounded in
                real data — if I do not have the information, I will say so rather
                than guess.
              </p>

              <p className="mt-5 mb-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Try asking
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                {STARTERS.map((starter) => (
                  <button
                    key={starter}
                    onClick={() => send(starter)}
                    className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-left text-xs text-slate-700 transition-all hover:border-orange-300 hover:bg-orange-50"
                  >
                    {starter}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="mx-auto max-w-3xl space-y-5">
            {messages.map((message) => (
              <Bubble key={message.id} message={message} />
            ))}

            {busy ? (
              <button
                onClick={stop}
                className="mx-auto block rounded-lg border border-slate-200 px-3 py-1.5 text-[11px] font-semibold text-slate-500 transition-colors hover:bg-slate-50"
              >
                Stop generating
              </button>
            ) : null}
          </div>
        )}
      </div>

      {/* ── Composer ── */}
      <div className="border-t border-slate-200 bg-white px-6 py-4">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            send(input);
          }}
          className="mx-auto flex max-w-3xl items-end gap-3"
        >
          <div className="flex-1">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                // Enter sends; Shift+Enter is a newline. Anything with a modifier
                // pressed belongs to the browser, not to us.
                if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                  event.preventDefault();
                  send(input);
                }
              }}
              rows={1}
              maxLength={1000}
              placeholder="Ask about an order, a product, or our policies…"
              className="max-h-32 min-h-[44px] w-full resize-none rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-colors focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
            />
            <div className="mt-1.5 flex items-center justify-between px-1 text-[10px] text-slate-400">
              <span className="inline-flex items-center gap-1">
                <BookOpen className="h-3 w-3" />
                Answers are grounded in your orders and our real catalogue
              </span>
              <span>{input.length}/1000</span>
            </div>
          </div>

          <button
            type="submit"
            disabled={busy || !input.trim()}
            aria-label="Send message"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-200"
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   MESSAGE BUBBLE
   ────────────────────────────────────────────────────────────────────────── */

function Bubble({ message }: { message: Message }) {
  const isUser = message.role === "user";

  if (message.error && !message.content) {
    return (
      <div className="flex items-start gap-3">
        <Avatar isUser={false} />
        <div className="rounded-2xl rounded-tl-md border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-800">
          <p className="font-semibold">The assistant could not answer that</p>
          <p className="mt-1 leading-relaxed">{message.error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3">
      <Avatar isUser={isUser} />

      <div className="min-w-0 flex-1">
        {message.status && !message.content ? (
          <p className="inline-flex items-center gap-2 rounded-2xl rounded-tl-md bg-slate-100 px-4 py-3 text-xs text-slate-500">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            {message.status}
          </p>
        ) : (
          <>
            <div
              className={`inline-block max-w-full whitespace-pre-wrap break-words rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                isUser
                  ? "rounded-tr-md bg-slate-900 text-white"
                  : "rounded-tl-md border border-slate-200 bg-white text-slate-800"
              }`}
            >
              {message.content}
            </div>

            {message.error ? (
              <p className="mt-2 flex items-center gap-1.5 text-[11px] text-red-600">
                <AlertCircle className="h-3.5 w-3.5" />
                {message.error}
              </p>
            ) : null}

            {message.citations?.length ? (
              <div className="mt-2.5">
                <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Based on
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {message.citations.map((citation) => {
                    const body = (
                      <>
                        <span className="inline-flex h-4 w-4 items-center justify-center rounded bg-slate-200 text-[9px] font-bold text-slate-600">
                          {citation.ref}
                        </span>
                        <span className="max-w-[16rem] truncate">{citation.title}</span>
                      </>
                    );

                    return citation.url ? (
                      <Link
                        key={citation.ref}
                        href={citation.url}
                        className="inline-flex max-w-full items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[10px] text-slate-600 transition-colors hover:border-orange-300 hover:bg-orange-50 hover:text-orange-700"
                      >
                        {body}
                        <ExternalLink className="h-2.5 w-2.5 shrink-0" />
                      </Link>
                    ) : (
                      <span
                        key={citation.ref}
                        className="inline-flex max-w-full items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] text-slate-600"
                      >
                        {body}
                      </span>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}

function Avatar({ isUser }: { isUser: boolean }) {
  return (
    <span
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${
        isUser
          ? "bg-slate-900 text-white"
          : "bg-gradient-to-br from-orange-500 to-amber-500 text-white"
      }`}
    >
      {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
    </span>
  );
}