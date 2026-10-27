/**
 * What La Volpe has been asked to do, shared between whoever drives him (the
 * chat later, his own idle habits for now) and the stage that plays his moves.
 */
export const ACTIONS = ["ascolta"] as const;
export type Action = (typeof ACTIONS)[number];

/** A neutral stance, or one action's way in, its loop, and its way out. */
export type Clip = "sta" | `${Action}-in` | Action | `${Action}-out`;

type State = { want: Action | null; playing: Clip };

// Kept on globalThis so a hot reload of this module in development doesn't
// leave the stage and its controls talking to two different copies.
const shared = ((globalThis as { __volpe?: { state: State; listeners: Set<() => void> } }).__volpe ??= {
  state: { want: null, playing: "sta" },
  listeners: new Set(),
});

function emit(next: Partial<State>) {
  shared.state = { ...shared.state, ...next };
  for (const listener of shared.listeners) listener();
}

export const volpe = {
  subscribe(listener: () => void) {
    shared.listeners.add(listener);
    return () => shared.listeners.delete(listener);
  },
  get: () => shared.state,
  /** Ask him to start an action, or pass null to let him return to standing. */
  want: (action: Action | null) => emit({ want: action }),
  playing: (clip: Clip) => emit({ playing: clip }),
};

/** The clip that should follow `current` while he is asked to do `want`. */
export function nextClip(current: Clip, want: Action | null): Clip {
  if (current === "sta") return want ? `${want}-in` : "sta";
  if (current.endsWith("-in")) return current.slice(0, -3) as Action;
  if (current.endsWith("-out")) return "sta";
  return want === current ? current : (`${current}-out` as Clip);
}
