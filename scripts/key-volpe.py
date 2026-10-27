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
Needs ffmpeg (with libvpx-vp9 and hevc_videotoolbox) and cwebp.
"""
import json
import subprocess
import sys

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


poses = sys.argv[1:]
sources = {p: f"art/drafts/video/volpe-green/{p}.1.mp4" for p in poses}

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

# Pass 2: key, crop, scale, encode.
for pose, path in sources.items():
    w, h, fps = probe(path)
    base = f"public/volpe/{pose}"
    common = ["-f", "rawvideo", "-pix_fmt", "rgba", "-s", f"{out_w}x{HEIGHT}", "-r", str(fps), "-i", "-", "-an"]
    vp9 = subprocess.Popen(["ffmpeg", "-v", "error", "-y", *common, "-c:v", "libvpx-vp9", "-pix_fmt", "yuva420p",
                            "-crf", "40", "-b:v", "0", "-auto-alt-ref", "0", "-row-mt", "1", f"{base}.webm"],
                           stdin=subprocess.PIPE)
    hevc = subprocess.Popen(["ffmpeg", "-v", "error", "-y", *common, "-c:v", "hevc_videotoolbox", "-alpha_quality",
                             "0.7", "-q:v", "45", "-tag:v", "hvc1", "-pix_fmt", "bgra", "-movflags", "+faststart",
                             f"{base}.mp4"], stdin=subprocess.PIPE)
    first = None
    for rgb in frames(path, w, h):
        rgba = Image.fromarray(key(rgb)[y0:y1, x0:x1], "RGBA").resize((out_w, HEIGHT), Image.Resampling.LANCZOS)
        if first is None:
            first = rgba
        data = rgba.tobytes()
        vp9.stdin.write(data)
        hevc.stdin.write(data)
    for proc in (vp9, hevc):
        proc.stdin.close()
        proc.wait()
    first.save(f"{base}.png")
    subprocess.run(["cwebp", "-quiet", "-q", "85", "-alpha_q", "90", f"{base}.png", "-o", f"{base}.webp"], check=True)
    subprocess.run(["rm", f"{base}.png"], check=True)
    print(f"✓ {base}.webm / .mp4 / .webp")
