"""
Keys La Volpe's green-screen loops to transparency and encodes them for the web.

    python3 -I scripts/key-volpe.py benvenuto ascolta scrive consiglia pensa brinda

Reads art/drafts/video/volpe-green/<pose>.1.mp4. All poses share one crop (the
union of where the fox ever is), so swapping poses never makes him jump.
Writes public/volpe/<pose>.webm (VP9 alpha: Chromium, Firefox),
<pose>.mp4 (HEVC alpha: Safari) and <pose>.webp (transparent first frame).

Keying works on "greenness", how far green rises above red and blue: the fox's
cream apron and white tail have none, so they stay solid where a colour-distance
key would eat them. The pale paper patch under his feet becomes a soft ink shadow.

    python3 -I scripts/key-volpe.py --set move sta ascolta-in ascolta ascolta-out

    python3 -I scripts/key-volpe.py --set move --pingpong sta:105 sta ...

--set move keys the chained moves (art/drafts/video/volpe-move/) into
public/volpe/move/. A clip name may carry a take, e.g. ascolta-in.2. Moves into
and out of a pose ("-in", "-out") are retimed: the quiet stretches where he only
breathes before and after the gesture play three times faster, so he reacts at
once and the gesture itself keeps its natural pace. First and last frames are
always kept, so the cuts between clips still land on the same picture.

    python3 -I scripts/key-volpe.py --set move --rife ~/tools/rife/rife-ncnn-vulkan ...

Seedance draws fast gestures on twos (every other frame barely moves), so they
judder at 12 fps. With --rife those half-steps are redrawn as true in-betweens
by rife-ncnn-vulkan (github.com/nihui/rife-ncnn-vulkan, model rife-v4.6 next to
the binary); without it they become a blend of their neighbours.
Needs ffmpeg (with libvpx-vp9 and hevc_videotoolbox) and cwebp.
"""
import json
import os
import subprocess
import sys
import tempfile

import numpy as np
from PIL import Image

HEIGHT = 720  # output height in px; shown at most ~420 CSS px, so retina-sharp
INK = np.array([42, 32, 25], dtype=np.float32)


def probe(path):
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height,r_frame_rate",
         "-of", "json", path], capture_output=True, check=True, text=True).stdout
    s = json.loads(out)["streams"][0]
    num, den = s["r_frame_rate"].split("/")
    return s["width"], s["height"], int(num) / int(den)


def frames(path, w, h):
    proc = subprocess.Popen(["ffmpeg", "-v", "error", "-i", path, "-f", "rawvideo", "-pix_fmt", "rgb24", "-"],
                            stdout=subprocess.PIPE)
    size = w * h * 3
    while chunk := proc.stdout.read(size):
        if len(chunk) < size:
            break
        yield np.frombuffer(chunk, np.uint8).reshape(h, w, 3)
    proc.wait()


def shift_reduce(a, radius, fn):
    """Min or max filter over a (2r+1)² square, from shifted copies."""
    out = a.copy()
    for dy in range(-radius, radius + 1):
        for dx in range(-radius, radius + 1):
            out = fn(out, np.roll(np.roll(a, dy, 0), dx, 1))
    return out


def box_blur(a):
    return sum(np.roll(np.roll(a, dy, 0), dx, 1) for dy in (-1, 0, 1) for dx in (-1, 0, 1)) / 9


def key(rgb):
    f = rgb.astype(np.float32)
    r, g, b = f[..., 0], f[..., 1], f[..., 2]
    greenness = g - np.maximum(r, b)
    alpha = np.clip(1 - greenness / 30, 0, 1)
    # Pull edge pixels' green spill down to their own red/blue, never touching cream.
    f[..., 1] = np.minimum(g, np.maximum(r, b))
    # Cut the fringe where the video blended fur into green, then soften the cut.
    alpha = box_blur(shift_reduce(alpha, 2, np.minimum))

    # The paper patch under his feet: large, pale, unsaturated, low in the frame.
    # An opening (erode, then dilate) drops anything claw-sized.
    h = rgb.shape[0]
    lum = f.mean(axis=2)
    sat = f.max(axis=2) - f.min(axis=2)
    band = np.zeros_like(alpha, dtype=bool)
    band[int(h * 0.88):] = True
    patch = (band & (lum > 150) & (sat < 70) & (alpha > 0.5)).astype(np.float32)
    patch = shift_reduce(shift_reduce(patch, 4, np.minimum), 5, np.maximum)
    patch = box_blur(box_blur(patch))
    f = f * (1 - patch[..., None]) + INK * patch[..., None]
    alpha = alpha * (1 - patch * 0.8)

    return np.dstack([np.clip(f, 0, 255), alpha * 255]).astype(np.uint8)


args = sys.argv[1:]
clip_set = None
if args[:1] == ["--set"]:
    clip_set, args = args[1], args[2:]
# --rife path/to/rife-ncnn-vulkan redraws the half-steps of a fast gesture as true
# in-betweens (see half_steps); without it they become a blend of their neighbours.
rife = None
if "--rife" in args:
    at = args.index("--rife")
    rife = args[at + 1]
    del args[at:at + 2]

# --pingpong sta:105 plays frames 0-105 forward and back: a clean loop cut from a
# take that is good up to that frame and then snaps.
pingpong = {}
while "--pingpong" in args:
    at = args.index("--pingpong")
    name, _, last = args[at + 1].partition(":")
    pingpong[name] = int(last)
    del args[at:at + 2]


def split_take(name):
    pose, _, take = name.partition(".")
    return pose, take or "1"


if clip_set:
    sources = {split_take(a)[0]: f"art/drafts/video/volpe-{clip_set}/{split_take(a)[0]}.{split_take(a)[1]}.mp4" for a in args}
    out_dir = f"public/volpe/{clip_set}"
else:
    sources = {p: f"art/drafts/video/volpe-green/{p}.1.mp4" for p in args}
    out_dir = "public/volpe"
subprocess.run(["mkdir", "-p", out_dir], check=True)

QUIET = 0.6  # mean per-frame change (0-255) below which he is only breathing


def keep_frames(path, w, h):
    """Indices of the frames to keep: every one for loops, quiet ones thinned for moves."""
    small = [rgb[::8, ::8].astype(np.int16) for rgb in frames(path, w, h)]
    if not (path.rsplit("/", 1)[-1].split(".")[0].endswith(("-in", "-out"))):
        return set(range(len(small)))
    change = [0.0] + [float(np.abs(small[i] - small[i - 1]).mean()) for i in range(1, len(small))]
    # Smooth over a few frames so a single still frame mid-gesture is not dropped.
    busy = [max(change[max(0, i - 3):i + 4]) > QUIET for i in range(len(small))]
    keep, quiet_run = set(), 0
    for i, b in enumerate(busy):
        quiet_run = 0 if b else quiet_run + 1
        if b or quiet_run % 3 == 1:
            keep.add(i)
    keep.update({0, len(small) - 1})
    return keep


def half_steps(path, w, h):
    """Frames where Seedance only half-moved during a fast gesture: it animates
    big moves on twos, so every other frame barely differs from the one before
    and the gesture judders at 12 fps."""
    small = [rgb[::8, ::8].astype(np.int16) for rgb in frames(path, w, h)]
    change = [0.0] + [float(np.abs(small[i] - small[i - 1]).mean()) for i in range(1, len(small))]
    return {i for i in range(1, len(small) - 1)
            if (around := max(change[i - 1], change[i + 1])) > 1.5 and change[i] < 0.3 * around}


def in_between(a, b):
    """The frame halfway between two green-screen frames, drawn by RIFE (rife-v4.6)."""
    with tempfile.TemporaryDirectory() as tmp:
        Image.fromarray(a).save(f"{tmp}/0.png")
        Image.fromarray(b).save(f"{tmp}/1.png")
        model = os.path.join(os.path.dirname(rife), "rife-v4.6")
        subprocess.run([rife, "-0", f"{tmp}/0.png", "-1", f"{tmp}/1.png", "-o", f"{tmp}/mid.png", "-m", model],
                       check=True, capture_output=True)
        return np.asarray(Image.open(f"{tmp}/mid.png").convert("RGB"))


def blend(a, b):
    """Halfway between two keyed frames, mixed premultiplied so no green fringe creeps in."""
    a, b = a.astype(np.float32), b.astype(np.float32)
    alpha = (a[..., 3:] + b[..., 3:]) / 2
    rgb = (a[..., :3] * a[..., 3:] + b[..., :3] * b[..., 3:]) / 2 / np.maximum(alpha, 1)
    return np.concatenate([rgb, alpha], -1).round().astype(np.uint8)

# Pass 1: where is the fox, across every pose and (sampled) frame?
x0 = y0 = 10**9
x1 = y1 = 0
for pose, path in sources.items():
    w, h, _ = probe(path)
    for i, rgb in enumerate(frames(path, w, h)):
        if i % 4:
            continue
        ys, xs = np.nonzero(key(rgb)[..., 3] > 24)
        x0, x1, y0, y1 = min(x0, xs.min()), max(x1, xs.max()), min(y0, ys.min()), max(y1, ys.max())
pad = 12
x0, y0, x1, y1 = max(0, x0 - pad), max(0, y0 - pad), min(w, x1 + pad), min(h, y1 + pad)
crop_w, crop_h = x1 - x0, y1 - y0
out_w = round(HEIGHT * crop_w / crop_h / 2) * 2
print(f"crop {x0},{y0} {crop_w}x{crop_h} -> {out_w}x{HEIGHT} (aspect {crop_w / crop_h:.3f})")

EXIT = 2.5  # mean change (0-255) from a loop's first frame below which a frame can cut to the next clip
manifest = {}

# Pass 2: key, crop, scale, encode.
for pose, path in sources.items():
    w, h, fps = probe(path)
    base = f"{out_dir}/{pose}"
    keep = keep_frames(path, w, h)
    raw = list(frames(path, w, h))
    halves = half_steps(path, w, h)
    if rife:
        # Real in-betweens, drawn from the untouched neighbours before keying.
        raw = [in_between(raw[i - 1], raw[i + 1]) if i in halves else rgb for i, rgb in enumerate(raw)]
    keyed = [key(rgb)[y0:y1, x0:x1] for rgb in raw]
    if not rife:
        # A mix of the neighbours at least reads as motion blur at 24 fps instead of a judder.
        for i in halves:
            keyed[i] = blend(keyed[i - 1], keyed[i + 1])
    print(f"  {pose}: {len(halves)} half-steps redrawn{' by RIFE' if rife else ' as blends'}")
    stills = [Image.fromarray(im, "RGBA").resize((out_w, HEIGHT), Image.Resampling.LANCZOS)
              for i, im in enumerate(keyed) if i in keep and (pose not in pingpong or i <= pingpong[pose])]
    if pose in pingpong:
        # Forward, then back again, ending one frame short so the loop wraps onto frame 0.
        stills += stills[-2:0:-1]

    first_small = np.asarray(stills[0], np.int16)[::8, ::8]
    # Frames that look like the first one again: a loop can hand over to the next clip there.
    exits = [round(i / fps, 3) for i, im in enumerate(stills)
             if i and np.abs(np.asarray(im, np.int16)[::8, ::8] - first_small).mean() < EXIT]

    common = ["-f", "rawvideo", "-pix_fmt", "rgba", "-s", f"{out_w}x{HEIGHT}", "-r", str(fps), "-i", "-", "-an"]
    vp9 = subprocess.Popen(["ffmpeg", "-v", "error", "-y", *common, "-c:v", "libvpx-vp9", "-pix_fmt", "yuva420p",
                            "-crf", "40", "-b:v", "0", "-auto-alt-ref", "0", "-row-mt", "1", f"{base}.webm"],
                           stdin=subprocess.PIPE)
    hevc = subprocess.Popen(["ffmpeg", "-v", "error", "-y", *common, "-c:v", "hevc_videotoolbox", "-alpha_quality",
                             "0.7", "-q:v", "45", "-tag:v", "hvc1", "-pix_fmt", "bgra", "-movflags", "+faststart",
                             f"{base}.mp4"], stdin=subprocess.PIPE)
    for im in stills:
        data = im.tobytes()
        vp9.stdin.write(data)
        hevc.stdin.write(data)
    for proc in (vp9, hevc):
        proc.stdin.close()
        proc.wait()
    stills[0].save(f"{base}.png")
    subprocess.run(["cwebp", "-quiet", "-q", "85", "-alpha_q", "90", f"{base}.png", "-o", f"{base}.webp"], check=True)
    subprocess.run(["rm", f"{base}.png"], check=True)
    manifest[pose] = {"duration": round(len(stills) / fps, 3), "exits": exits}
    print(f"✓ {base}.webm / .mp4 / .webp ({len(stills) / fps:.2f}s, {len(exits)} exit frames)")

if clip_set:
    with open(f"{out_dir}/manifest.json", "w") as fh:
        json.dump(manifest, fh, indent=2)
    print(f"✓ {out_dir}/manifest.json")
