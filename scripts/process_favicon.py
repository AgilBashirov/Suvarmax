"""Transparent outer background (edge flood-fill), then scale with padding — full icon centered in square."""
from __future__ import annotations

from collections import deque
from pathlib import Path

from PIL import Image

SRC = Path(__file__).resolve().parents[1] / "assets" / "images" / "favicon.png"
WHITE_CUTOFF = 248
OUT_SIZE = 1024
# Like object-fit: contain — whole icon visible, centered; <1 adds margin so it sits comfortably in the tab.
CONTAIN_FILL = 0.88


def luminance(r: int, g: int, b: int) -> float:
    return 0.299 * r + 0.587 * g + 0.114 * b


def is_background(r: int, g: int, b: int, a: int) -> bool:
    return a > 0 and luminance(r, g, b) >= WHITE_CUTOFF


def flood_transparent_edge(im: Image.Image) -> None:
    w, h = im.size
    px = im.load()
    visited = [[False] * w for _ in range(h)]
    q: deque[tuple[int, int]] = deque()

    def try_seed(x: int, y: int) -> None:
        if not (0 <= x < w and 0 <= y < h) or visited[y][x]:
            return
        r, g, b, a = px[x, y]
        if is_background(r, g, b, a):
            visited[y][x] = True
            q.append((x, y))

    for x in range(w):
        try_seed(x, 0)
        try_seed(x, h - 1)
    for y in range(h):
        try_seed(0, y)
        try_seed(w - 1, y)

    while q:
        x, y = q.popleft()
        r, g, b, _ = px[x, y]
        px[x, y] = (r, g, b, 0)
        for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
            if 0 <= nx < w and 0 <= ny < h and not visited[ny][nx]:
                r2, g2, b2, a2 = px[nx, ny]
                if is_background(r2, g2, b2, a2):
                    visited[ny][nx] = True
                    q.append((nx, ny))


def main() -> None:
    im = Image.open(SRC).convert("RGBA")
    flood_transparent_edge(im)

    bbox = im.getbbox()
    if not bbox:
        raise SystemExit("No visible content after background removal")

    cropped = im.crop(bbox)
    cw, ch = cropped.size
    s = min(OUT_SIZE / cw, OUT_SIZE / ch) * CONTAIN_FILL
    new_w = max(1, int(round(cw * s)))
    new_h = max(1, int(round(ch * s)))
    scaled = cropped.resize((new_w, new_h), Image.Resampling.LANCZOS)

    out = Image.new("RGBA", (OUT_SIZE, OUT_SIZE), (0, 0, 0, 0))
    ox = (OUT_SIZE - new_w) // 2
    oy = (OUT_SIZE - new_h) // 2
    out.paste(scaled, (ox, oy), scaled)
    out.save(SRC, format="PNG", optimize=True)
    print(
        f"Wrote {SRC} contain fill={CONTAIN_FILL} centered, "
        f"{cw}x{ch} -> {new_w}x{new_h} at ({ox},{oy}) on {OUT_SIZE}x{OUT_SIZE}"
    )


if __name__ == "__main__":
    main()
