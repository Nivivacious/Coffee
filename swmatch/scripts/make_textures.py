"""Draw the grey swatch textures in assets/tex. The page tints them to each
shade: mid-grey (128) becomes the shade, darker greys deepen it, lighter
greys lift it to a highlight. Alpha is the swatch shape.

    python3 scripts/make_textures.py
"""
import os
import numpy as np
from PIL import Image, ImageFilter

OUT = os.path.join(os.path.dirname(__file__), '..', 'assets', 'tex')
W, H = 480, 240
rng = np.random.default_rng(7)
yy, xx = np.mgrid[0:H, 0:W].astype(float)

def noise(scale, amp):
    small = rng.normal(0, 1, (max(2, H // scale), max(2, W // scale)))
    im = Image.fromarray(((small - small.min()) / (np.ptp(small) + 1e-9) * 255).astype('uint8')).resize((W, H), Image.BICUBIC)
    return (np.asarray(im, float) / 255 - 0.5) * 2 * amp

def soft(mask, r):
    return np.asarray(Image.fromarray((np.clip(mask, 0, 1) * 255).astype('uint8')).filter(ImageFilter.GaussianBlur(r)), float) / 255

def save(name, grey, alpha):
    g = np.clip(grey, 0, 255).astype('uint8')
    a = np.clip(alpha * 255, 0, 255).astype('uint8')
    Image.fromarray(np.dstack([g, g, g, a]), 'RGBA').save(os.path.join(OUT, name + '.png'), optimize=True)

# Lipstick / foundation: one dragged stroke, ragged at the end, with streaks.
t = xx / W
centre = H * 0.5 + 10 * np.sin(t * 3.2) + noise(60, 6)
half = (H * 0.30) * (0.75 + 0.25 * np.sin(np.clip(t, 0, 1) * np.pi)) * (1 - 0.55 * np.clip((t - 0.78) / 0.22, 0, 1))
inside = (np.abs(yy - centre) < half + noise(6, 5)) & (xx > 26 + noise(20, 10)) & (xx < W - 30 + noise(8, 26))
alpha = soft(inside.astype(float), 1.6) * np.clip(1 - np.clip((t - 0.8) / 0.2, 0, 1) * (0.6 + noise(3, 0.5)), 0, 1)
streaks = np.asarray(Image.fromarray(((rng.normal(0, 1, (H, 1)) * np.ones((1, W)) + 3) * 40).clip(0, 255).astype('uint8')).filter(ImageFilter.GaussianBlur((12, 1))), float)
v = (yy - centre) / (half + 1e-6)
grey = 128 - 26 * np.clip(np.abs(v) - 0.55, 0, 1) * 2 + (streaks - 120) * 0.18 + 40 * np.exp(-((v + 0.35) ** 2) / 0.02) * (0.5 + 0.5 * np.sin(t * 2)) + noise(4, 6)
save('smear', grey, alpha)

# Powder: a pressed-then-swiped patch, soft edges, fine grain and a sheen band.
cx, cy = W * 0.5, H * 0.5
r = np.sqrt(((xx - cx) / (W * 0.42)) ** 2 + ((yy - cy) / (H * 0.38)) ** 2) + noise(30, 0.12)
alpha = np.clip((1 - r) * 3.2, 0, 1) * (0.82 + noise(2, 0.18))
grain = np.asarray(Image.fromarray((rng.normal(128, 40, (H, W))).clip(0, 255).astype("uint8")).filter(ImageFilter.GaussianBlur(0.7)), float) - 128
grey = 128 + grain + 30 * np.exp(-(((xx - cx) * 0.6 + (yy - cy) * 0.8 + 20) ** 2) / 1400) + noise(10, 10)
save('powder', grey, alpha)

# Cream: a thick dollop swipe with a glossy ridge.
centre = H * 0.52 + 14 * np.sin(xx / W * 2.4)
half = H * 0.26 * (1 - 0.4 * np.clip((xx / W - 0.72) / 0.28, 0, 1))
v = (yy - centre) / half
inside = (np.abs(v) < 1 + noise(14, 0.08)) & (xx > 34) & (xx < W - 36 + noise(10, 18))
alpha = soft(inside.astype(float), 2.4)
grey = 134 + 55 * np.exp(-((v + 0.4) ** 2) / 0.03) - 22 * np.clip(v - 0.4, 0, 1) + noise(12, 7)
save('cream', grey, alpha)

# Drop: a serum bead with a specular highlight and a soft shadow edge.
r = np.sqrt(((xx - W * 0.5) / (H * 0.42)) ** 2 + ((yy - H * 0.52) / (H * 0.36)) ** 2)
alpha = soft((r < 1).astype(float), 1.5) * 0.92
spec = 120 * np.exp(-(((xx - W * 0.44) / 18) ** 2 + ((yy - H * 0.38) / 10) ** 2))
grey = 118 + 30 * np.clip(r, 0, 1) ** 3 - 20 * (1 - r).clip(0, 1) + spec
save('drop', grey, alpha)
print('ok')
