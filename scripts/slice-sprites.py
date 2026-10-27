"""
Cuts a transparent particle sheet into separate sprites and packs them into a
single-row atlas for the canvas particle system.

    python3 -I scripts/slice-sprites.py <sheet.png> <season>

Writes public/particles/<season>.webp (cells of CELL x CELL px, left to right)
and prints the sprite count. Elements smaller than MIN_AREA are dropped as specks.
"""
import json
import sys
from collections import deque

import numpy as np
from PIL import Image, ImageFilter

CELL = 160
MIN_AREA = 0.002  # share of the sheet a blob must cover to count as a sprite
PAD = 6

sheet_path, season = sys.argv[1], sys.argv[2]
sheet = Image.open(sheet_path).convert("RGBA")
alpha = np.asarray(sheet.getchannel("A"))

# Find blobs on a downscaled mask (fast, and it bridges hairline gaps inside one leaf).
SCALE = 4
small = np.asarray(sheet.getchannel("A").resize((sheet.width // SCALE, sheet.height // SCALE))) > 12
labels = np.zeros(small.shape, dtype=np.int32)
boxes = []
h, w = small.shape
for y in range(h):
    for x in range(w):
        if not small[y, x] or labels[y, x]:
            continue
        label = y * w + x + 1  # the seed pixel's index: unique, and never 0 (= background)
        queue, area = deque([(y, x)]), 0
        labels[y, x] = label
        y0, y1, x0, x1 = y, y, x, x
        while queue:
            cy, cx = queue.popleft()
            area += 1
            y0, y1, x0, x1 = min(y0, cy), max(y1, cy), min(x0, cx), max(x1, cx)
            for ny, nx in ((cy + 1, cx), (cy - 1, cx), (cy, cx + 1), (cy, cx - 1)):
                if 0 <= ny < h and 0 <= nx < w and small[ny, nx] and not labels[ny, nx]:
                    labels[ny, nx] = label
                    queue.append((ny, nx))
        if area >= MIN_AREA * h * w:
            boxes.append((x0 * SCALE - PAD, y0 * SCALE - PAD, (x1 + 1) * SCALE + PAD, (y1 + 1) * SCALE + PAD, label))

# Reading order: rows top to bottom, then left to right.
boxes.sort(key=lambda b: (round(b[1] / (sheet.height / 4)), b[0]))

atlas = Image.new("RGBA", (CELL * len(boxes), CELL))
for i, (x0, y0, x1, y1, label) in enumerate(boxes):
    # Keep only this blob's pixels, so a neighbour poking into the box is cut away.
    own = Image.fromarray(((labels == label) * 255).astype(np.uint8)).resize(sheet.size, Image.Resampling.NEAREST)
    own = own.filter(ImageFilter.MaxFilter(2 * SCALE + 1))
    masked = sheet.copy()
    masked.putalpha(Image.fromarray(np.minimum(alpha, np.asarray(own))))
    box = (max(0, x0), max(0, y0), min(sheet.width, x1), min(sheet.height, y1))
    sprite = masked.crop(box)
    sprite.thumbnail((CELL, CELL), Image.Resampling.LANCZOS)
    atlas.paste(sprite, (i * CELL + (CELL - sprite.width) // 2, (CELL - sprite.height) // 2))

out = f"public/particles/{season}.webp"
atlas.save(out, "WEBP", quality=88, method=6, exact=False)
print(json.dumps({"season": season, "sprites": len(boxes), "cell": CELL, "file": out}))
