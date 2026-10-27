"""
Pads an approved 3:2 hero still to 16:9 with matching paper, so image-to-video
models keep the whole scene instead of cropping it.

    python3 -I scripts/pad-hero.py autumn [winter spring summer]

Reads art/approved/hero-<season>.png, writes art/approved/hero-<season>-16x9.png.
"""
import sys

from PIL import Image, ImageChops, ImageFilter

FEATHER = 110  # px over which the still fades into the new paper

for season in sys.argv[1:]:
    still = Image.open(f"art/approved/hero-{season}.png").convert("RGB")
    w, h = still.size
    width = round(h * 16 / 9 / 2) * 2

    # Paper tone from a clean patch of the empty left third, plus a neutral grain.
    patch = list(still.crop((20, 300, 120, 700)).get_flattened_data())
    paper = tuple(sorted(c[i] for c in patch)[len(patch) // 2] for i in range(3))
    grain = Image.effect_noise((width, h), 10).filter(ImageFilter.GaussianBlur(0.6)).point(lambda v: v // 2)
    canvas = ImageChops.add(Image.new("RGB", (width, h), paper), Image.merge("RGB", [grain] * 3), 1, -64)

    mask = Image.new("L", (w, h))
    mask.putdata([int(255 * min(1, x / FEATHER, (w - 1 - x) / FEATHER)) for y in range(h) for x in range(w)])
    canvas.paste(still, ((width - w) // 2, 0), mask)
    canvas.save(f"art/approved/hero-{season}-16x9.png")
    print(f"✓ art/approved/hero-{season}-16x9.png {paper}")
