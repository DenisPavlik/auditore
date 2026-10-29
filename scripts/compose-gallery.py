"""
Turns the approved gallery paintings into the web files the gallery serves.

    python3 -I scripts/compose-gallery.py

Reads art/approved/galleria-<name>.png and writes public/gallery/<name>.webp,
printing the sizes for scripts/seed-gallery.ts.
"""
import glob
import os
import subprocess

from PIL import Image

OUT = "public/gallery"
os.makedirs(OUT, exist_ok=True)

for png in sorted(glob.glob("art/approved/galleria-*.png")):
    name = os.path.basename(png).removeprefix("galleria-").removesuffix(".png")
    subprocess.run(["cwebp", "-quiet", "-q", "84", png, "-o", f"{OUT}/{name}.webp"], check=True)
    with Image.open(png) as image:
        print(f"{name}: {image.width}x{image.height}")
