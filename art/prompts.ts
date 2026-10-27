/**
 * Every illustration on the site is generated from this file so the set stays
 * in one hand. STYLE is appended to each prompt; edit it, and the whole set
 * shifts together.
 */

export const STYLE = `Style: a page from a Florentine Renaissance sketchbook. Fine sepia iron-gall ink linework drawn with a quill, varied line weight, light cross-hatching in the shadows, then loose transparent watercolour washes laid over the ink. Visible cold-pressed paper grain, soft pigment granulation, colour pooling at the edges of each wash, white paper left showing as highlights. Palette limited to Renaissance pigments: burnt sienna #9A4426, ultramarine #2F4A86, green earth #6F7F4E, lead-tin yellow #C89B22, sepia ink #2A2019, warm lime-plaster paper #EFE8DA.`;

const NO_TEXT = "no lettering, no signatures, no captions, no watermarks, no frames or borders";

export type ImagePrompt = {
  /** Output path under art/drafts, without extension. */
  id: string;
  size: "1024x1024" | "1536x1024" | "1024x1536" | "2560x1440";
  quality: "low" | "medium" | "high";
  transparent: boolean;
  /** Approved image (relative to the repo root) to edit instead of drawing from scratch. */
  reference?: string;
  prompt: string;
};

export const PROMPTS: ImagePrompt[] = [
  {
    id: "test/hero-autumn",
    size: "1536x1024",
    quality: "medium",
    transparent: false,
    prompt: `Scene: the terrace of a small trattoria in Florence on an autumn evening, around 1490 in spirit. A vaulted loggia of grey pietra serena columns and lime-plastered walls, a wisteria pergola gone gold and rust, the red-brick cupola of the cathedral rising over the rooftops in the far distance.
Subject: one table under the loggia, set for two: a straw-wrapped flask of Chianti, two stemmed glasses, a torn loaf of Tuscan bread, a bowl of chestnuts, a pewter candlestick with a lit candle. A few vine and plane leaves drift down through the air.
Important Details: warm low sunlight from the right, long soft shadows, the table and columns sit in the right two thirds of the picture; the left third is a pale, almost empty wash of sky and plaster so a headline can sit there. The painting dissolves into bare paper at every edge with ragged, uneven wash boundaries.
Use Case: hero illustration for a restaurant website, displayed full width behind a headline.
Constraints: ${NO_TEXT}, no people, the scene stays quiet and uncluttered.
${STYLE}`,
  },
  {
    id: "hero/autumn",
    size: "1536x1024",
    quality: "high",
    transparent: false,
    prompt: `Scene: the terrace of a small trattoria in Florence on an autumn evening, around 1490 in spirit. A vaulted loggia of grey pietra serena columns and lime-plastered walls; an old grapevine climbs both columns and drapes across the whole top edge of the picture in a heavy canopy of gold, rust and wine-red leaves, with dark purple bunches of grapes hanging down between them. Beyond the parapet, terracotta rooftops, two cypresses and the red-brick cupola of the cathedral in the far distance under a pale sky with a few swallows.
Subject: one table under the loggia, set for two: a straw-wrapped flask of Chianti, two stemmed glasses with a little red wine, a torn loaf of Tuscan bread, a bowl of roasted chestnuts, a wedge of pecorino on a board, a pewter candlestick with a lit candle. A wicker basket of porcini mushrooms and a sprig of rosemary rest on the parapet; a copper lantern hangs from the vine; a ginger cat sleeps curled on the rush seat of one chair. A few vine leaves drift down through the air.
Important Details: warm low sunlight from the right, long soft shadows, the table, columns and vine sit in the right two thirds of the picture; the left third is a pale, almost empty wash of sky and plaster with only the vine canopy reaching into its top corner, so a headline can sit there. The painting dissolves into bare paper at every edge with ragged, uneven wash boundaries.
Use Case: hero illustration for a restaurant website, displayed full width behind a headline, later animated as a subtle cinemagraph (candle flame, swaying vine, drifting leaves).
Constraints: ${NO_TEXT}, no people, the scene stays calm and readable despite the details.
${STYLE}`,
  },
  ...(
    [
      [
        "winter",
        `Winter, a clear evening at blue hour just after a light snowfall. The grapevine is bare: dark twisted branches and tendrils along the same paths, a few last dry curled leaves, a soft line of snow along the branches, the parapet, the column capitals and the city roofs; the hills beyond are white. The lantern and the candle glow warmer and brighter against the cool ultramarine dusk. On the table: the same flask and glasses with red wine, a steaming terracotta bowl of ribollita, the bread, a dish of roasted chestnuts, a few blood oranges. The basket on the parapet holds pine cones and a sprig of rosemary with a dusting of snow. The cat sleeps curled on a folded wool blanket on the same chair. A few snowflakes drift in the air instead of leaves; the swallows are gone.`,
      ],
      [
        "spring",
        `Spring, a fresh morning. The grapevine is in young leaf: small bright green leaves and tender shoots along the same branches, and long hanging clusters of lilac wisteria blossom woven through the canopy where the grapes were. Soft cool morning light, a clean pale blue sky with a few swallows returning, green hills, cypresses and a blossoming almond tree in the distance. On the table: the flask and glasses with pale white wine, bread, a bowl of fresh fava beans in their pods, two small purple artichokes, a wedge of young pecorino, a little jug of wildflowers in place of the candlestick. The basket on the parapet holds wild asparagus and lemons. The cat is awake on the same chair, sitting upright and washing a paw. A few wisteria petals drift in the air instead of leaves.`,
      ],
      [
        "summer",
        `Summer, a warm golden evening just after sunset. The grapevine is lush and deep green with heavy clusters of small unripe green grapes along the same branches. A warm peach and apricot sky, the city glowing in the last light, the lantern lit, a few fireflies glowing softly under the vine. On the table: the flask and glasses with chilled white wine, bread, a bowl of panzanella with red tomatoes and basil, a slice of watermelon, the candle lit. The basket on the parapet holds ripe tomatoes and a bunch of basil, and a terracotta pot with a small lemon tree stands by the column. The cat is stretched out long on the same chair in the warm air. A few olive leaves drift in the air instead of vine leaves.`,
      ],
    ] as const
  ).map(
    ([season, change]): ImagePrompt => ({
      id: `hero/${season}`,
      size: "1536x1024",
      quality: "high",
      transparent: false,
      reference: "art/approved/hero-autumn.png",
      prompt: `Repaint this illustration in another season.
Change: ${change}
Preserve: the exact composition, viewpoint and framing; the loggia, both columns, the parapet, the table, both chairs, the lantern, the basket position and the cathedral skyline all stay in the same place and at the same size; the empty pale left third for a headline; the ragged watercolour edges dissolving into bare paper; the ink linework and watercolour technique, so the two pictures can cross-fade into each other.
Constraints: ${NO_TEXT}, no people.
${STYLE}`,
    }),
  ),
  {
    id: "test/la-volpe",
    size: "1024x1024",
    quality: "high",
    transparent: true,
    prompt: `Subject: La Volpe, a red fox who works as the head waiter of a Florentine trattoria, shown full length, standing upright on his hind legs, three-quarter view, turned slightly toward the viewer. He wears a white linen shirt with rolled sleeves, a burnt-sienna waistcoat, and a long cream apron tied at the waist; a folded white napkin hangs over his left forearm, and his right paw holds a small leather-bound menu. Bushy tail with a white tip curling behind him.
Important Details: warm, clever, welcoming expression: amber eyes with a glint, one ear slightly tilted, a small knowing smile, as if he is about to recommend the special. Proportions of a charming storybook character, slightly large head, compact body, readable as a small mascot at 120 pixels tall. Soft contact shadow under his feet only.
Use Case: mascot character for a restaurant website chat assistant, placed in a corner of the screen.
Constraints: isolated character only, ${NO_TEXT}, no hood, no hidden blade, no weapons, no logos.
${STYLE}`,
  },
  {
    id: "test/particles-autumn",
    size: "1024x1024",
    quality: "medium",
    transparent: true,
    prompt: `Subject: a botanical study sheet of nine separate autumn leaves from the Tuscan countryside, arranged in a loose 3 by 3 grid with generous empty space between them so each leaf can be cut out on its own: two grapevine leaves, two sweet chestnut leaves, two plane tree leaves, one oak leaf, one fig leaf, one olive sprig with three leaves.
Important Details: each leaf drawn flat, seen from above, at a slightly different angle and stage of turning: ochre, rust, burnt sienna, a little faded green at the veins. Crisp outer silhouette on each leaf, fine ink veins, watercolour bleeding gently inside the outline.
Use Case: sprite sheet for falling-leaf animation on a website.
Constraints: every leaf fully separated from the others with nothing touching, no shadows, no stems crossing, ${NO_TEXT}.
${STYLE}`,
  },
];
