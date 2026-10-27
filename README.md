# Auditore · Trattoria Fiorentina

A website for a fictional Florentine trattoria, painted like a page from a Renaissance sketchbook. The whole site turns with the seasons: palette, living hero scene, falling leaves, snow or petals, and a seasonal menu. Guests pick their own table on a floor plan and get an instant confirmation.

Work in progress. See [PLAN.md](PLAN.md) for the roadmap (in Ukrainian).

## Stack

- Next.js 16 (App Router, Cache Components), React 19, TypeScript, Tailwind CSS v4
- Neon Postgres + Drizzle ORM; double bookings are rejected by a Postgres exclusion constraint
- Illustrations: OpenAI GPT Image 2.5; living hero loops: Seedance 2.0 on fal.ai
- Deployed on Vercel

## Development

```bash
bun install
vercel env pull          # database credentials into .env.local
bun run db:migrate
bun run db:seed
bun run dev
```

Hand-managed keys (`OPENAI_API_KEY`, `FAL_KEY`, `ANTHROPIC_API_KEY`) live in `.env`, which `vercel env pull` never touches.

## Art pipeline

| Step | Command |
|---|---|
| Draw (prompts in `art/prompts.ts`) | `bun scripts/generate-image.ts hero/autumn` |
| Pad a hero to 16:9 for video | `python3 -I scripts/pad-hero.py autumn` |
| Animate (clips in `art/motion.ts`) | `bun scripts/animate.ts hero/autumn` |
| Encode loop + poster for the web | `bun scripts/encode-video.ts <in.mp4> public/hero/autumn art/approved/hero-autumn-16x9.png` |

Raw generations land in `art/drafts` (ignored); approved stills live in `art/approved`.
