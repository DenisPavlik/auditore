import Anthropic from "@anthropic-ai/sdk";
import type { BetaMessageParam } from "@anthropic-ai/sdk/resources/beta";
import { headers } from "next/headers";
import { z } from "zod/v4";

import {
  admitVisitor,
  MESSAGE_LIMIT,
  TURN_LIMIT,
  VOLPE_MODEL,
  VOLPE_SYSTEM,
  volpeClock,
  volpeTools,
  type VolpeEvent,
} from "@/lib/volpe";

/** What the desk hears back, one JSON object per line. */
export type ChatLine =
  | { type: "text"; text: string }
  /** A new bubble starts: he spoke, used a tool, and speaks again. */
  | { type: "break" }
  | VolpeEvent
  /** The whole conversation so far, to send back with the next message. */
  | { type: "done"; transcript: BetaMessageParam[] }
  | { type: "error"; text: string };

// Made on the first message, so a build without the key still succeeds.
let client: Anthropic | undefined;

const Body = z.object({
  // Earlier turns come back exactly as this route handed them out; the API checks their shape.
  transcript: z.array(z.looseObject({ role: z.enum(["user", "assistant"]), content: z.unknown() })).max(TURN_LIMIT * 8),
  message: z.string().trim().min(1).max(MESSAGE_LIMIT),
});

const SORRY = {
  busy: "Scusi, the dining room is full of voices right now. Ask me again in a moment, or call us.",
  limit: "We have talked a great deal today! For anything more, the telephone at the desk is always answered.",
  long: "We have talked a long while: let me start a fresh page for you. Close the desk and open it again.",
  refused: "Ah, that is not something I can help with. Shall we talk about dinner instead?",
};

/** A guest's message to La Volpe; his answer streams back as he writes it. */
export async function POST(request: Request) {
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "bad request" }, { status: 400 });
  const { message } = parsed.data;
  const transcript = parsed.data.transcript as unknown as BetaMessageParam[];

  const encoder = new TextEncoder();
  const lines = new TransformStream<ChatLine, Uint8Array>({
    transform: (line, controller) => controller.enqueue(encoder.encode(`${JSON.stringify(line)}\n`)),
  });
  const write = lines.writable.getWriter();
  const send = (line: ChatLine) => void write.write(line);
  const respond = () =>
    new Response(lines.readable, { headers: { "content-type": "application/x-ndjson; charset=utf-8", "cache-control": "no-store" } });

  const guestTurns = transcript.filter((m) => m.role === "user" && typeof m.content === "string").length;
  if (guestTurns >= TURN_LIMIT) {
    send({ type: "error", text: SORRY.long });
    void write.close();
    return respond();
  }

  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (!(await admitVisitor(ip))) {
    send({ type: "error", text: SORRY.limit });
    void write.close();
    return respond();
  }

  void (async () => {
    client ??= new Anthropic();
    const runner = client.beta.messages.toolRunner({
      model: VOLPE_MODEL,
      max_tokens: 2048,
      output_config: { effort: "low" },
      system: [
        { type: "text", text: VOLPE_SYSTEM, cache_control: { type: "ephemeral" } },
        { type: "text", text: volpeClock() },
      ],
      tools: volpeTools(send),
      messages: [...transcript, { role: "user", content: message }],
      stream: true,
      max_iterations: 6,
    });

    try {
      let spoke = false;
      let refused = false;
      for await (const turn of runner) {
        let started = false;
        for await (const event of turn) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            if (spoke && !started) send({ type: "break" });
            started = spoke = true;
            send({ type: "text", text: event.delta.text });
          }
        }
        const reply = await turn.finalMessage();
        if (reply.stop_reason === "refusal") {
          refused = true;
          break;
        }
      }
      if (refused) {
        // A declined turn is left out, so the conversation can go on without it.
        send({ type: "text", text: SORRY.refused });
        send({ type: "done", transcript });
        return;
      }
      const final = await runner.done();
      const history = [...runner.params.messages];
      if (history.at(-1)?.role !== "assistant") history.push({ role: "assistant", content: final.content });
      send({ type: "done", transcript: history });
    } catch (error) {
      console.error("[volpe] chat failed", error);
      send({ type: "error", text: SORRY.busy });
    } finally {
      void write.close();
    }
  })();

  return respond();
}
