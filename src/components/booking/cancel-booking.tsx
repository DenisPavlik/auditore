"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/** Gives the table back, after asking once more. */
export function CancelBooking({ token }: { token: string }) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "asking" | "sending">("idle");
  const [problem, setProblem] = useState<string | null>(null);

  async function cancel() {
    setState("sending");
    const response = await fetch(`/api/booking/${token}`, { method: "DELETE" }).catch(() => null);
    const reply = (await response?.json().catch(() => null)) as { ok: boolean; reason?: string } | null;
    if (reply?.ok) {
      router.replace(`/prenota/${token}`);
      router.refresh();
      return;
    }
    setProblem(reply?.reason ?? "The line dropped. Please try again.");
    setState("asking");
  }

  if (state === "idle") {
    return (
      <button type="button" onClick={() => setState("asking")} className="ink-link px-2 text-lg text-pietra italic">
        Cancel the booking
      </button>
    );
  }
  return (
    <span className="flex flex-wrap items-center gap-3 text-lg italic">
      Give the table back?
      <button
        type="button"
        disabled={state === "sending"}
        onClick={() => void cancel()}
        className="rounded-full px-4 py-1.5 font-display text-xs tracking-[0.22em] not-italic text-accent-ink uppercase ring-1 ring-accent/60 disabled:opacity-60"
      >
        {state === "sending" ? "…" : "Yes, cancel"}
      </button>
      <button type="button" onClick={() => setState("idle")} className="ink-link text-pietra">
        Keep it
      </button>
      {problem && <span className="w-full text-accent-ink not-italic">{problem}</span>}
    </span>
  );
}
