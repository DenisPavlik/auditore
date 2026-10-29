"use client";

import { useEffect, useRef } from "react";

import { nextClip, volpe, type Clip } from "./volpe-store";

/** Same split as the loops: WebKit plays HEVC with alpha, everyone else VP9 alpha. */
function sourceFor(clip: Clip) {
  const webkit = navigator.vendor.startsWith("Apple");
  return `/volpe/move/${clip}.${webkit ? "mp4" : "webm"}`;
}

/**
 * La Volpe as a chain of moves (public/volpe/move/): he stands, and every
 * action is a way in, a loop that lasts as long as it needs to, and a way back.
 * Each clip starts on the frame the previous one ends on, so two stacked videos
 * hand over with a hard cut and nothing to see. The hidden one always holds the
 * clip that comes next, loaded and waiting on its first frame. Every stage on
 * the page plays the same moves, so he is the same fox wherever he stands.
 */
export function VolpeStage({ className = "" }: { className?: string }) {
  const stage = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const videos = [...stage.current!.querySelectorAll("video")];
    let front = 0;
    let current: Clip = "sta";
    let switching = false;

    const back = () => videos[1 - front];

    function load(video: HTMLVideoElement, clip: Clip) {
      if (video.dataset.clip === clip) return;
      video.dataset.clip = clip;
      video.src = sourceFor(clip);
      video.load();
    }

    /** Point the hidden video at whatever should follow, and loop the visible one while nothing changes. */
    function plan() {
      const next = nextClip(current, volpe.get().want);
      videos[front].loop = next === current;
      if (next !== current) load(back(), next);
    }

    /** Resolves once the video is showing its first frame, paused, so it can be revealed without a blank. */
    async function cue(video: HTMLVideoElement) {
      if (video.currentTime !== 0) {
        video.currentTime = 0;
        await new Promise((resolve) => video.addEventListener("seeked", resolve, { once: true }));
      }
      if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
        await new Promise((resolve) => video.addEventListener("loadeddata", resolve, { once: true }));
      }
    }

    async function handOver() {
      if (switching) return;
      const next = nextClip(current, volpe.get().want);
      if (next === current) return;
      switching = true;
      const incoming = back();
      const outgoing = videos[front];
      load(incoming, next);
      await cue(incoming);
      // The outgoing clip is holding its last frame and the incoming one shows its first, the same
      // drawing: swap them in one step, then let the new one run. Never a frame with neither.
      incoming.style.opacity = "1";
      outgoing.style.opacity = "0";
      front = 1 - front;
      current = next;
      volpe.playing(current);
      outgoing.pause();
      try {
        await incoming.play();
      } catch {
        // Autoplay refused: he stays on this frame, which is still him standing there.
      }
      switching = false;
      plan();
    }

    function onEnded(event: Event) {
      if (event.target === videos[front]) void handOver();
    }

    videos[0].style.opacity = "1";
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    // A change of mind only stops the current loop from repeating: every clip plays to its
    // last frame, which is where the next one starts.
    const unsubscribe = volpe.subscribe(plan);
    for (const video of videos) video.addEventListener("ended", onEnded);
    load(videos[0], "sta");
    void videos[0].play().catch(() => {});
    plan();

    return () => {
      unsubscribe();
      for (const video of videos) {
        video.removeEventListener("ended", onEnded);
        video.pause();
      }
    };
  }, []);

  return (
    <div
      ref={stage}
      aria-hidden
      className={`pointer-events-none aspect-[430/720] select-none ${className}`}
    >
      {[0, 1].map((i) => (
        <video
          key={i}
          muted
          playsInline
          preload="auto"
          poster={i === 0 ? "/volpe/move/sta.webp" : undefined}
          className="absolute inset-0 size-full object-contain object-bottom"
          style={{ opacity: 0 }}
        />
      ))}
    </div>
  );
}
