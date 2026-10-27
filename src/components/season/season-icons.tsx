import type { SVGProps } from "react";

import type { Season } from "@/lib/seasons";

// Quill-weight line icons; placeholders until the watercolour set is painted.
const base: SVGProps<SVGSVGElement> = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.4,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
};

function Leaf(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <path d="M5 19.5C4.5 11 10 5 19.5 4.5 20 13 14 19 5 19.5Z" />
      <path d="M5 19.5 15 9.5M9.2 15.3l-.4-3.6M12 12.5l3.3.2" />
    </svg>
  );
}

function Snowflake(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <path d="M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9" />
      <path d="M9.8 4.6 12 6.4l2.2-1.8M9.8 19.4 12 17.6l2.2 1.8M4.3 10.2l2.8-.4-1-2.7M19.7 13.8l-2.8.4 1 2.7M5.4 16.3l1-2.6-2.8-.5M18.6 7.7l-1 2.6 2.8.5" />
    </svg>
  );
}

function Blossom(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="2" />
      <path d="M12 10c-2-1.8-2-5 0-6.5 2 1.5 2 4.7 0 6.5ZM13.9 11.4c.8-2.6 3.8-3.6 5.8-2.1-.7 2.4-3.3 3.9-5.8 2.1ZM13.2 13.7c2.7 0 4.6 2.6 3.8 5-2.5.2-4.5-1.8-3.8-5ZM10.8 13.7c.7 3.2-1.3 5.2-3.8 5-.8-2.4 1.1-5 3.8-5ZM10.1 11.4c-2.5 1.8-5.1.3-5.8-2.1 2-1.5 5-.5 5.8 2.1Z" />
    </svg>
  );
}

function Sun(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6" />
    </svg>
  );
}

export const SEASON_ICONS: Record<Season, (props: SVGProps<SVGSVGElement>) => React.JSX.Element> = {
  autumn: Leaf,
  winter: Snowflake,
  spring: Blossom,
  summer: Sun,
};
