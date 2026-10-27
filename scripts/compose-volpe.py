"""
Sets each approved La Volpe pose on a square of paper, the stage for his
image-to-video loops. On the site the square is cut to a round medallion, so
the fox is centred and kept inside the circle.

    python3 -I scripts/compose-volpe.py benvenuto [ascolta ...]

Reads art/approved/volpe-<pose>.png, writes art/approved/volpe-<pose>-medallion.png.
"""
import sys

from PIL import Image, ImageChops, ImageFilter

SIZE = 1024
PAPER = (239, 228, 208)
FOX_HEIGHT = 0.86  # share of the square the fox stands in

for pose in sys.argv[1:]:
    fox = Image.open(f"art/approved/volpe-{pose}.png").convert("RGBA")
    fox = fox.crop(fox.getchannel("A").point(lambda v: 255 if v > 10 else 0).getbbox())
    scale = SIZE * FOX_HEIGHT / fox.height
    fox = fox.resize((round(fox.width * scale), round(fox.height * scale)), Image.Resampling.LANCZOS)

    grain = Image.effect_noise((SIZE, SIZE), 10).filter(ImageFilter.GaussianBlur(0.6)).point(lambda v: v // 2)
    stage = ImageChops.add(Image.new("RGB", (SIZE, SIZE), PAPER), Image.merge("RGB", [grain] * 3), 1, -64)
    stage = stage.convert("RGBA")
    stage.alpha_composite(fox, ((SIZE - fox.width) // 2, round(SIZE * 0.95) - fox.height))
    stage.convert("RGB").save(f"art/approved/volpe-{pose}-medallion.png")
    print(f"✓ art/approved/volpe-{pose}-medallion.png")
