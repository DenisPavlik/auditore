"use client";

import { useEffect, useState } from "react";

import { VolpeDesk } from "./volpe-desk";
import { VolpePeek } from "./volpe-peek";
import { VolpeStage } from "./volpe-stage";
import { volpe } from "./volpe-store";

const PHONE = "(max-width: 639px)";

/**
 * La Volpe, the head waiter. On a tablet or a desk he stands full height at the
 * bottom right of the page; on a phone he peeks from behind the edge of the
 * screen. Either way a click brings him to his desk. Until the chat gives him
 * guests to listen to, he stands and now and then cocks an ear to the room.
 */
export function LaVolpe() {
  const [phone, setPhone] = useState<boolean | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const query = window.matchMedia(PHONE);
    const update = () => setPhone(query.matches);
    update();
    query.addEventListener("change", update);
    const unsubscribe = volpe.subscribe(() => setOpen(volpe.get().open));
    return () => {
      query.removeEventListener("change", update);
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    let last = volpe.get().playing;
    // He listens after his first stand; after that, after about every other one.
    volpe.want("ascolta");
    const unsubscribe = volpe.subscribe(() => {
      const { playing, open } = volpe.get();
      if (playing === last) return;
      last = playing;
      // At his desk the guest decides when he listens.
      if (open) return;
      // A clip hands over only at its end, so this decides what follows the one that just began.
      if (playing === "sta") volpe.want(!document.hidden && Math.random() < 0.5 ? "ascolta" : null);
      // One listening beat, then back to standing.
      if (playing === "ascolta") volpe.want(null);
    });
    return () => {
      unsubscribe();
      volpe.want(null);
    };
  }, []);

  if (phone === null) return null;

  return (
    <>
      {phone ? (
        <VolpePeek />
      ) : (
        // One stage at a time: at his desk he stands there instead.
        !open && (
          <button
            type="button"
            onClick={() => volpe.setOpen(true)}
            aria-label="Ask La Volpe, the head waiter"
            className="volpe-standing fixed right-6 bottom-0 z-20 h-56 lg:h-[clamp(16rem,40vh,30rem)]"
          >
            {/* Turned to face the page he stands beside, as he does at his desk. */}
            <VolpeStage className="relative h-full -scale-x-100" />
          </button>
        )
      )}
      <VolpeDesk />
    </>
  );
}
