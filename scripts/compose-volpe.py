"""
Sets each approved La Volpe pose on a square stage for his image-to-video loops.

    python3 -I scripts/compose-volpe.py benvenuto [ascolta ...]
    python3 -I scripts/compose-volpe.py --green benvenuto [ascolta ...]

Paper (default) writes art/approved/volpe-<pose>-medallion.png, for a round
medallion. --green stands him on flat chroma green instead, writing
volpe-<pose>-green.png, so the loop can be keyed to a transparent background:
the fox has no green in him, while his cream apron is too close to paper to key.

    python3 -I scripts/compose-volpe.py --stage sta ascolta [...]

--stage is green too, but keeps every pose at one shared scale and baseline
(taken from the neutral "sta", the approved la-volpe.png) instead of fitting
each pose to the frame, so clips that move from one pose to another start and
end on stills that line up exactly. Writes volpe-<pose>-stage.png.
"""
import sys

from PIL import Image, ImageChops, ImageFilter

SIZE = 1024
PAPER = (239, 228, 208)
FOX_HEIGHT = 0.86  # share of the square the fox stands in

GREEN = (0, 177, 64)
stage_mode = "--stage" in sys.argv
green = "--green" in sys.argv or stage_mode
poses = [arg for arg in sys.argv[1:] if not arg.startswith("--")]


def source(pose):
    return Image.open("art/approved/la-volpe.png" if pose == "sta" else f"art/approved/volpe-{pose}.png").convert("RGBA")


def solid(img):
    return img.getchannel("A").point(lambda v: 255 if v > 10 else 0).getbbox()


# The poses were drawn as edits of la-volpe.png at the same size and baseline,
# so one scale and one offset for the whole canvas keeps them in register.
neutral = solid(source("sta"))
stage_scale = SIZE * FOX_HEIGHT / (neutral[3] - neutral[1])

for pose in poses:
    fox = source(pose)
    if stage_mode:
        fox = fox.resize((round(fox.width * stage_scale), round(fox.height * stage_scale)), Image.Resampling.LANCZOS)
        offset = ((SIZE - fox.width) // 2, round(SIZE * 0.95 - neutral[3] * stage_scale))
    else:
        fox = fox.crop(solid(fox))
        scale = SIZE * FOX_HEIGHT / fox.height
        fox = fox.resize((round(fox.width * scale), round(fox.height * scale)), Image.Resampling.LANCZOS)
        offset = ((SIZE - fox.width) // 2, round(SIZE * 0.95) - fox.height)

    if green:
        # No contact shadow on green: it would key to a grey smear.
        fox.putalpha(fox.getchannel("A").point(lambda v: v if v > 60 else 0))
        stage = Image.new("RGBA", (SIZE, SIZE), GREEN + (255,))
    else:
        grain = Image.effect_noise((SIZE, SIZE), 10).filter(ImageFilter.GaussianBlur(0.6)).point(lambda v: v // 2)
        stage = ImageChops.add(Image.new("RGB", (SIZE, SIZE), PAPER), Image.merge("RGB", [grain] * 3), 1, -64)
        stage = stage.convert("RGBA")
    if stage_mode:
        layer = Image.new("RGBA", (SIZE, SIZE))
        layer.paste(fox, offset)
        stage.alpha_composite(layer)
    else:
        stage.alpha_composite(fox, offset)
    kind = "stage" if stage_mode else "green" if green else "medallion"
    out = f"art/approved/volpe-{pose}-{kind}.png"
    stage.convert("RGB").save(out)
    print(f"✓ {out}")
