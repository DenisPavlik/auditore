/**
 * Image-to-video clips made on fal.ai from approved illustrations. Every clip
 * starts and ends on the same frame so it loops without a seam.
 */

export type MotionClip = {
  /** Output path under art/drafts/video, without extension. */
  id: string;
  /** fal endpoint, e.g. "bytedance/seedance-2.0/image-to-video". */
  endpoint: string;
  /** Approved still, relative to the repo root; the first frame, and the last unless endImage is set. */
  image: string;
  /** Last frame, when the clip moves from one still to another. */
  endImage?: string;
  prompt: string;
  /** Endpoint-specific input on top of the shared fields. */
  input?: Record<string, unknown>;
};

const CINEMAGRAPH = `Locked-off static camera: no zoom, no pan, no dolly, no parallax. The picture stays a hand-painted watercolour and ink illustration on paper for the whole clip; the linework, washes and paper edges never redraw or morph. Only small ambient movement, slow and calm, as in a cinemagraph:`;

const HERO_MOTION: Record<string, string> = {
  autumn: `the candle flame and the flame inside the hanging lantern flicker softly; the grapevine leaves and the hanging grape bunches sway gently in a light breeze; a few vine leaves come loose and drift slowly down through the air and out of frame; the distant swallows glide across the sky; the sleeping ginger cat breathes slowly and twitches one ear once.`,
  winter: `light snowflakes fall slowly and steadily through the whole picture; the candle flame and the lantern flame flicker warmly; a thin curl of steam rises from the bowl of soup; one last dry leaf trembles on a bare branch; the sleeping ginger cat breathes slowly on its blanket.`,
  spring: `the hanging wisteria clusters and the young vine leaves sway gently in a soft morning breeze; a few lilac petals drift slowly through the air; midway through the clip two swallows fly in from the left edge of the sky, sweep across it in one fast curving arc behind the columns and leave the frame on the right, so the sky is empty at the start and again at the end; the ginger cat, sitting upright, slowly licks its paw and blinks.`,
  summer: `fireflies drift and pulse softly with warm light under the vine; the candle flame and the lantern flame flicker; the deep green vine leaves and the green grape clusters sway slightly in the warm evening air; a few olive leaves drift down; the ginger cat stretched out on the chair breathes slowly and flicks the tip of its tail once.`,
};

export const CLIPS: MotionClip[] = Object.entries(HERO_MOTION).map(([season, motion]) => ({
  id: `hero/${season}`,
  endpoint: "bytedance/seedance-2.0/image-to-video",
  // Padded to 16:9 with matching paper so the model has no reason to crop the scene.
  image: `art/approved/hero-${season}-16x9.png`,
  prompt: `${CINEMAGRAPH} ${motion} The architecture, the table, everything on it, the city and the paper margins stay perfectly still and identical to the first frame. The clip ends exactly as it begins.`,
  input: { duration: "8", resolution: "1080p", aspect_ratio: "16:9", generate_audio: false },
}));

const VOLPE_STAGE = `Locked-off static camera on a hand-drawn ink and watercolour illustration of La Volpe, a fox head waiter, standing on plain paper. The drawing style, line work and paper never change or morph; the fox stays in the same place, the same size and the same pose throughout, and only small living movements happen:`;

const VOLPE_MOTION: Record<string, string> = {
  benvenuto: `his raised paw waves twice, slowly and warmly; he blinks once; his ears perk up; his tail sways gently behind him.`,
  ascolta: `he leans in a little closer and back again, listening; the ear turned to the viewer twitches; he blinks slowly; the tip of his tail flicks.`,
  scrive: `his pencil moves in small writing strokes across the notepad, his eyes follow the line he writes; he pauses, taps the pencil once on the pad, and writes again; his tail sways slightly.`,
  consiglia: `his pointing paw taps the open page twice; he raises one eyebrow and gives a small sly smile; he blinks; his tail sways.`,
  pensa: `his eyes drift slowly from one side to the other while he thinks; he taps a claw softly against his chin; his ears turn slightly; his tail curls and uncurls.`,
  brinda: `he raises the glass of red wine a little higher in a toast and lowers it back; the wine sways in the glass; he closes his eyes happily and opens them; his tail swishes.`,
};

CLIPS.push(
  ...Object.entries(VOLPE_MOTION).map(([pose, motion]) => ({
    id: `volpe/${pose}`,
    endpoint: "bytedance/seedance-2.0/image-to-video",
    image: `art/approved/volpe-${pose}-medallion.png`,
    prompt: `${VOLPE_STAGE} ${motion} The clip ends exactly as it begins.`,
    input: { duration: "5", resolution: "720p", aspect_ratio: "1:1", generate_audio: false },
  })),
);

// The same loops on chroma green, keyed to transparency so La Volpe can stand
// full height on the page itself rather than inside a medallion.
const VOLPE_GREEN_STAGE = `Locked-off static camera on a hand-drawn ink and watercolour illustration of La Volpe, a fox head waiter, standing in front of a flat, solid, evenly lit chroma-key green background. The green stays perfectly uniform for the whole clip: no texture, no shadows, no gradients, no light changes on it. The drawing style and line work never change or morph; the fox stays in the same place, the same size and the same pose throughout, and only small living movements happen:`;

CLIPS.push(
  ...Object.entries(VOLPE_MOTION).map(([pose, motion]) => ({
    id: `volpe-green/${pose}`,
    endpoint: "bytedance/seedance-2.0/image-to-video",
    image: `art/approved/volpe-${pose}-green.png`,
    prompt: `${VOLPE_GREEN_STAGE} ${motion} The clip ends exactly as it begins.`,
    input: { duration: "5", resolution: "720p", aspect_ratio: "1:1", generate_audio: false },
  })),
);

// La Volpe as a set of moves that chain into each other. Everything starts from
// and returns to one neutral stance ("sta", menu held at his chest): for each
// action, "<pose>-in" goes from the stance into the pose, "<pose>" holds the pose
// as a loop of any length, "<pose>-out" brings him back. Shared first and last
// frames make every cut land on the same picture, so no cross-fade is needed.
const VOLPE_MOVE_STAGE = `Locked-off static camera on a hand-drawn ink and watercolour illustration of La Volpe, a fox head waiter, standing in front of a flat, solid, evenly lit chroma-key green background. The green stays perfectly uniform for the whole clip: no texture, no shadows, no gradients, no light changes on it. The drawing style and line work never change or morph; he never walks, turns away or changes size, and his feet stay planted on the same spot. Smooth, natural, unhurried character animation:`;

const stage = (pose: string) => `art/approved/volpe-${pose}-stage.png`;

type Move = { id: string; from: string; to: string; seconds: number; motion: string };

const VOLPE_MOVES: Move[] = [
  {
    id: "sta",
    from: "sta",
    to: "sta",
    seconds: 6,
    motion: `he simply stands and waits, relaxed and content. Only tiny idle movements, all of them small and slow and spread evenly over the whole clip: his chest rises and falls as he breathes, he blinks once, one ear flicks once, his gaze drifts a little to the side and comes back to the viewer. His tail stays where it is and only its white tip curls gently. His paws, the menu and the napkin do not move. Nothing ever jumps or snaps back; every movement eases out and returns softly to where it started. The clip ends exactly as it begins.`,
  },
  {
    id: "ascolta-in",
    from: "sta",
    to: "ascolta",
    seconds: 4,
    motion: `as if a guest has started to speak, his ears perk up; keeping the menu at his chest, he raises his other paw, the napkin still over that forearm, and cups it behind his ear, and leans in a little with his head tilted, attentive and curious. One continuous fluid movement in the first two seconds, then he settles and holds that listening pose, breathing, so the clip ends exactly on the last frame given.`,
  },
  {
    id: "ascolta",
    from: "ascolta",
    to: "ascolta",
    seconds: 5,
    motion: `he keeps listening closely with his paw cupped behind his ear: he leans in a touch further and eases back, nods slightly once as if agreeing, the ear behind his paw twitches, he blinks, the tip of his tail flicks. The clip ends exactly as it begins.`,
  },
  {
    id: "ascolta-out",
    from: "ascolta",
    to: "sta",
    seconds: 4,
    motion: `he has heard enough and gives a small satisfied nod; he lowers the paw from his ear back to his side, the napkin still over that forearm and the menu still at his chest, straightens up and relaxes into his neutral stance. One continuous fluid movement in the first two seconds, then he holds the stance, breathing, so the clip ends exactly on the last frame given.`,
  },
];

CLIPS.push(
  ...VOLPE_MOVES.map((move) => ({
    id: `volpe-move/${move.id}`,
    endpoint: "bytedance/seedance-2.0/image-to-video",
    image: stage(move.from),
    endImage: stage(move.to),
    prompt: `${VOLPE_MOVE_STAGE} ${move.motion}`,
    input: { duration: String(move.seconds), resolution: "720p", aspect_ratio: "1:1", generate_audio: false },
  })),
);

// On a phone he waits half hidden behind the right edge of the screen, peeking out.
CLIPS.push({
  id: "volpe-peek/sbircia",
  endpoint: "bytedance/seedance-2.0/image-to-video",
  image: "art/approved/volpe-sbircia-peek.png",
  prompt: `${VOLPE_GREEN_STAGE} he is peeking out from behind the right edge of the picture, curious and friendly, as if about to ask "can I help you?". Over the clip: he tilts his head a little to one side and back, his ears perk up and one of them flicks, he blinks once, his whiskers twitch, and his fingers tap once on the edge he is holding. The vertical cut along the right side of him and the paw curled over it stay exactly where they are; he never leans further out or slides back. Every movement eases out and returns softly to where it started. The clip ends exactly as it begins.`,
  input: { duration: "5", resolution: "720p", aspect_ratio: "9:16", generate_audio: false },
});
