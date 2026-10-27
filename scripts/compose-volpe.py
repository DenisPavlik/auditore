"""
Sets each approved La Volpe pose on a square stage for his image-to-video loops.

    python3 -I scripts/compose-volpe.py benvenuto [ascolta ...]
    python3 -I scripts/compose-volpe.py --green benvenuto [ascolta ...]

Paper (default) writes art/approved/volpe-<pose>-medallion.png, for a round
medallion. --green stands him on flat chroma green instead, writing
volpe-<pose>-green.png, so the loop can be keyed to a transparent background:
the fox has no green in him, while his cream apron is too close to paper to key.
"""
import sys

from PIL import Image, ImageChops, ImageFilter

SIZE = 1024
PAPER = (239, 228, 208)
FOX_HEIGHT = 0.86  # share of the square the fox stands in

GREEN = (0, 177, 64)
green = "--green" in sys.argv
poses = [arg for arg in sys.argv[1:] if arg != "--green"]

for pose in poses:
    fox = Image.open(f"art/approved/volpe-{pose}.png").convert("RGBA")
    fox = fox.crop(fox.getchannel("A").point(lambda v: 255 if v > 10 else 0).getbbox())
    scale = SIZE * FOX_HEIGHT / fox.height
    fox = fox.resize((round(fox.width * scale), round(fox.height * scale)), Image.Resampling.LANCZOS)

    if green:
        # No contact shadow on green: it would key to a grey smear.
        fox.putalpha(fox.getchannel("A").point(lambda v: v if v > 60 else 0))
        stage = Image.new("RGBA", (SIZE, SIZE), GREEN + (255,))
    else:
        grain = Image.effect_noise((SIZE, SIZE), 10).filter(ImageFilter.GaussianBlur(0.6)).point(lambda v: v // 2)
        stage = ImageChops.add(Image.new("RGB", (SIZE, SIZE), PAPER), Image.merge("RGB", [grain] * 3), 1, -64)
        stage = stage.convert("RGBA")
    stage.alpha_composite(fox, ((SIZE - fox.width) // 2, round(SIZE * 0.95) - fox.height))
    out = f"art/approved/volpe-{pose}-{'green' if green else 'medallion'}.png"
    stage.convert("RGB").save(out)
    print(f"✓ {out}")
