#!/usr/bin/env python3
"""Generates a stylized text cover (600x800 PNG) with zero dependencies —
box art is a licensing minefield (PLAN.md §9), pixel type is not.

Usage: gen_cover.py <slug> <line1> [line2]
e.g.:  gen_cover.py wow-335a WOW 3.3.5A
"""
import struct
import sys
import zlib
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

# 5x7 pixel font, one string per row, '1' = lit
FONT = {
    "A": ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
    "B": ["11110", "10001", "10001", "11110", "10001", "10001", "11110"],
    "C": ["01110", "10001", "10000", "10000", "10000", "10001", "01110"],
    "D": ["11110", "10001", "10001", "10001", "10001", "10001", "11110"],
    "E": ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
    "F": ["11111", "10000", "10000", "11110", "10000", "10000", "10000"],
    "G": ["01110", "10001", "10000", "10111", "10001", "10001", "01110"],
    "H": ["10001", "10001", "10001", "11111", "10001", "10001", "10001"],
    "I": ["11111", "00100", "00100", "00100", "00100", "00100", "11111"],
    "J": ["00111", "00010", "00010", "00010", "00010", "10010", "01100"],
    "K": ["10001", "10010", "10100", "11000", "10100", "10010", "10001"],
    "L": ["10000", "10000", "10000", "10000", "10000", "10000", "11111"],
    "M": ["10001", "11011", "10101", "10101", "10001", "10001", "10001"],
    "N": ["10001", "11001", "10101", "10011", "10001", "10001", "10001"],
    "O": ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
    "P": ["11110", "10001", "10001", "11110", "10000", "10000", "10000"],
    "Q": ["01110", "10001", "10001", "10001", "10101", "10010", "01101"],
    "R": ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
    "S": ["01111", "10000", "10000", "01110", "00001", "00001", "11110"],
    "T": ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
    "U": ["10001", "10001", "10001", "10001", "10001", "10001", "01110"],
    "V": ["10001", "10001", "10001", "10001", "10001", "01010", "00100"],
    "W": ["10001", "10001", "10001", "10101", "10101", "10101", "01010"],
    "X": ["10001", "01010", "00100", "00100", "00100", "01010", "10001"],
    "Y": ["10001", "10001", "01010", "00100", "00100", "00100", "00100"],
    "Z": ["11111", "00001", "00010", "00100", "01000", "10000", "11111"],
    "0": ["01110", "10001", "10011", "10101", "11001", "10001", "01110"],
    "1": ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
    "2": ["01110", "10001", "00001", "00110", "01000", "10000", "11111"],
    "3": ["11110", "00001", "00001", "01110", "00001", "00001", "11110"],
    "4": ["00010", "00110", "01010", "10010", "11111", "00010", "00010"],
    "5": ["11111", "10000", "11110", "00001", "00001", "10001", "01110"],
    "6": ["01110", "10000", "10000", "11110", "10001", "10001", "01110"],
    "7": ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
    "8": ["01110", "10001", "10001", "01110", "10001", "10001", "01110"],
    "9": ["01110", "10001", "10001", "01111", "00001", "00001", "01110"],
    ".": ["00000", "00000", "00000", "00000", "00000", "01100", "01100"],
    "-": ["00000", "00000", "00000", "01110", "00000", "00000", "00000"],
    " ": ["00000", "00000", "00000", "00000", "00000", "00000", "00000"],
}

W, H = 600, 800
BG = (16, 24, 40)        # dark navy
ACCENT = (45, 212, 167)  # gamelator teal
TEXT = (248, 240, 220)   # warm off-white


def blank():
    return [[BG] * W for _ in range(H)]


def rect(px, x0, y0, w, h, color):
    for y in range(max(0, y0), min(H, y0 + h)):
        for x in range(max(0, x0), min(W, x0 + w)):
            px[y][x] = color


def draw_text(px, text, cy, scale, color):
    glyphs = [FONT.get(ch.upper(), FONT[" "]) for ch in text]
    total_w = len(glyphs) * 6 * scale - scale  # 5px glyph + 1px space
    x0 = (W - total_w) // 2
    for gi, glyph in enumerate(glyphs):
        gx = x0 + gi * 6 * scale
        for row, bits in enumerate(glyph):
            for col, bit in enumerate(bits):
                if bit == "1":
                    rect(px, gx + col * scale, cy + row * scale, scale, scale, color)


def write_png(path, px):
    raw = b"".join(b"\x00" + bytes(c for p in row for c in p) for row in px)

    def chunk(tag, data):
        payload = tag + data
        return struct.pack(">I", len(data)) + payload + struct.pack(">I", zlib.crc32(payload))

    ihdr = struct.pack(">IIBBBBB", W, H, 8, 2, 0, 0, 0)
    path.write_bytes(b"\x89PNG\r\n\x1a\n"
                     + chunk(b"IHDR", ihdr)
                     + chunk(b"IDAT", zlib.compress(raw, 9))
                     + chunk(b"IEND", b""))


def main():
    if len(sys.argv) < 3:
        print(__doc__, file=sys.stderr)
        sys.exit(2)
    slug, line1 = sys.argv[1], sys.argv[2]
    line2 = sys.argv[3] if len(sys.argv) > 3 else None

    px = blank()
    rect(px, 0, 0, W, 8, ACCENT)
    rect(px, 0, H - 8, W, 8, ACCENT)
    scale1 = max(4, min(16, (W - 40) // (max(1, len(line1)) * 6)))
    draw_text(px, line1, H // 2 - (scale1 * 7) // (1 if line2 else 2) - (60 if line2 else 0),
              scale1, TEXT)
    if line2:
        scale2 = max(3, min(10, (W - 80) // (max(1, len(line2)) * 6)))
        draw_text(px, line2, H // 2 + 40, scale2, ACCENT)

    out = ROOT / "games" / slug / "cover.png"
    out.parent.mkdir(parents=True, exist_ok=True)
    write_png(out, px)
    print(f"wrote {out}")


if __name__ == "__main__":
    main()
