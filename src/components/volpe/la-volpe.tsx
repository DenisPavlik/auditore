"use client";

import { useEffect } from "react";

import { VolpeStage } from "./volpe-stage";
import { volpe } from "./volpe-store";

/**
 * La Volpe, the head waiter, standing full height at the bottom right of the
 * page. Until the chat gives him guests to listen to, he stands and now and
 * then cocks an ear to the room on his own.
 */
export function LaVolpe() {
  useEffect(() => {
    let last = volpe.get().playing;
    // He listens after his first stand; after that, after about every other one.
    volpe.want("ascolta");
    const unsubscribe = volpe.subscribe(() => {
      const { playing } = volpe.get();
      if (playing === last) return;
      last = playing;
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

  return <VolpeStage />;
}
