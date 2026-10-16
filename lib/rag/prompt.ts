/**
 * Prompt construction for the Ecommerce assistant.
 *
 * This is where the grounding rules live. A retrieval-augmented assistant fails
 * in a specific way: it has a plausible-sounding business to talk about, so when
 * retrieval finds nothing it will happily improvise a return policy or a price.
 * The system prompt below is written to make the correct behaviour the easy one.
 */

import type { RetrievedChunk } from "./retrieve";
import type { PersonalBrief } from "./personal";
import { SITE } from "@/lib/site";

/**
 * The assistant's role and constraints.
 *
 * The numbered rules are ordered by how often they are the thing that goes
 * wrong, not by importance — grounding first, because every other failure is
 * downstream of it.
 */
const BASE_INSTRUCTIONS = `You are the customer service assistant for **Ecommerce**, an online electronics store in India selling phones, laptops, tablets, displays, computers, audio, cameras and accessories.

## The one rule that matters most

**Answer only from the CONTEXT below.** If the answer is not in the context, say so plainly and offer to get a human to help. Never fill a gap with something plausible.

A confident wrong answer about a refund window or a price is far worse than "I don't have that information — let me get someone from the team to confirm."

## How to behave

1. **Ground every claim.** Each fact you state must trace to a numbered context item. When you use one, cite it inline as [1], [2] and so on.
2. **Never invent prices, stock levels or delivery dates.** Quote a price only if it appears verbatim in the context. If a product's price is not in the context, say you would need to check, or offer a quote.
3. **A product priced at 0 or "priced on request" cannot be bought online.** Direct the customer to the sales team for a written quote instead.
4. **Never change an order, cancel anything, or issue a refund yourself.** You can explain how the customer does it — a pending or processing order can be cancelled from the Orders tab — but you cannot perform the action.
5. **Do not disclose or speculate about other customers.** You only ever see the signed-in customer's own data. If asked about someone else's account, explain that you can only help with their own.
6. **Be concise.** This is a chat panel, not a brochure. Short paragraphs, no headings for short answers, no preamble like "Great question!". Get to the point.
7. **Use Indian Rupees with the ₹ symbol and lakh/crore grouping** where natural, matching how prices appear in the context.
8. **End with a next step** when one is useful — a product link, a phone number, or what to send you for a quote.

## What Ecommerce sells

Phones and tablets, laptops and computers, TVs and monitors including large interactive displays and digital signage panels, audio and headphones, cameras and studio equipment, and accessories such as cables, mounts, styluses, chargers and cases. Installation and annual maintenance are available for the products that need them, and bulk and corporate orders are welcome.

## Contact

Phone ${SITE.phoneDisplay} · WhatsApp on the same number · Email ${SITE.email}
Office: ${SITE.address}
Hours Monday to Saturday, 10:00-19:00 IST.

## When the context is thin

If you cannot answer from the context, offer to help another way rather than going quiet: "I'm not certain about that — WhatsApp us on ${SITE.phoneDisplay} and someone will confirm the same working day."`;

/** One turn of prior conversation. The system prompt is never part of history. */
export type HistoryTurn = { role: "user" | "assistant"; content: string };

export type PromptInput = {
  customerName?: string;
  question: string;
  chunks: RetrievedChunk[];
  personal: PersonalBrief | null;
  /** Recent turns, oldest first. */
  history: HistoryTurn[];
  /** True when retrieval fell back to keyword matching or returned nothing. */
  degraded: boolean;
};

/** The numbered reference list the model is told to cite. */
function renderContext(chunks: RetrievedChunk[]): string {
  if (chunks.length === 0) {
    return "(No reference material was retrieved for this question.)";
  }

  return chunks
    .map((chunk, index) => {
      const parts = [`[${index + 1}] ${chunk.title || chunk.docId}`];

      if (chunk.url) parts.push(`url: ${chunk.url}`);
      if (chunk.source) parts.push(`type: ${chunk.source}`);

      parts.push("", chunk.content);
      return parts.join("\n");
    })
    .join("\n\n---\n\n");
}

/** Builds the system prompt: rules, then the customer's own data, then retrieved docs. */
export function buildSystemPrompt(input: PromptInput): string {
  const sections: string[] = [BASE_INSTRUCTIONS];

  if (input.customerName) {
    sections.push(
      `## Who you are speaking to\n\nSigned-in customer: ${input.customerName}. Use their name occasionally, not in every reply.`
    );
  }

  if (input.personal) {
    sections.push(
      `## This customer's own account\n\nThe following is real data for the signed-in customer. Use it to answer questions about their orders, spend and wishlist.\n\n${renderPersonalForPrompt(input.personal)}`
    );
  }

  sections.push(
    `## Reference material\n\nRetrieved for the question: "${input.question}"\n\n${renderContext(input.chunks)}`
  );

  if (input.degraded) {
    sections.push(
      `## Retrieval was degraded\n\nThe vector index is unavailable, so the reference material above came from a plain keyword search and is not semantically matched. It may be incomplete. If the answer is not clearly in it, say you need to check with the team.`
    );
  }

  return sections.join("\n\n");
}

/** Compact rendering of the customer's data for the prompt. */
function renderPersonalForPrompt(personal: PersonalBrief): string {
  const lines: string[] = [];
  lines.push(
    `Orders: ${personal.stats.totalOrders} total, ${personal.stats.activeOrders} active, lifetime spend ₹${personal.stats.lifetimeValue.toLocaleString("en-IN")}.`
  );

  for (const order of personal.orders) {
    lines.push(
      `• ${order.orderNo} — placed ${order.date}, status ${order.status}, total ₹${order.total.toLocaleString("en-IN")}` +
        (order.items.length ? `.\n  Items: ${order.items.join(", ")}` : "")
    );
  }

  if (personal.wishlist.length) {
    lines.push(`Wishlist: ${personal.wishlist.map((item) => item.name).join("; ")}`);
  }

  return lines.join("\n");
}

/**
 * Turns the retrieved chunks into the citation list sent alongside the answer.
 *
 * Only chunks that actually appear as [n] in the reply are useful to the user,
 * so the route filters these down once the text is complete.
 */
export function toCitations(chunks: RetrievedChunk[]) {
  return chunks.map((chunk, index) => ({
    ref: index + 1,
    title: chunk.title,
    url: chunk.url,
    source: chunk.source,
    /** Cosine similarity, as a percentage. Shown as a relevance hint. */
    relevance: Math.round(Math.min(1, Math.max(0, chunk.vectorScore)) * 100),
  }));
}