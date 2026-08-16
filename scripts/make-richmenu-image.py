"""
สร้างรูป Rich Menu สำหรับ LINE OA (2500 x 1686 px, 6 ปุ่ม 3x2)

รัน: python3 scripts/make-richmenu-image.py
ผลลัพธ์: scripts/richmenu.png
"""

from PIL import Image, ImageDraw, ImageFont
import os

W, H = 2500, 1686
COLS, ROWS = 3, 2
CELL_W, CELL_H = W // COLS, H // ROWS

FONT_BOLD = "/usr/share/fonts/truetype/tlwg/Garuda-Bold.ttf"
FONT_REG = "/usr/share/fonts/truetype/tlwg/Garuda.ttf"

# โทนสีเดียวกับเว็บ (น้ำเงิน + slate)
BG = (248, 250, 252)
LINE = (226, 232, 240)
NAVY = (15, 23, 42)
BLUE = (37, 99, 235)
MUTED = (100, 116, 139)
WHITE = (255, 255, 255)

# (หัวข้อ, คำอธิบาย, ไฮไลต์เป็นปุ่มหลักไหม, ชนิดไอคอน)
BUTTONS = [
    ("จองรถ", "เลือกรถและจองเลย", True, "car"),
    ("รถทั้งหมด", "ดูรถว่าง + ราคา", False, "list"),
    ("เช็คสถานะ", "ติดตามการจอง", False, "search"),
    ("วิธีการจอง", "4 ขั้นตอนง่ายๆ", False, "book"),
    ("ติดต่อเรา", "แชทกับแอดมิน", False, "chat"),
    ("โทรหาเรา", "053-000-000", False, "phone"),
]


def rounded_rect(draw, box, radius, fill, outline=None, width=2):
    draw.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=width)


def draw_icon(draw, kind, cx, cy, size, color):
    """วาดไอคอนแบบง่ายด้วยเส้น เพื่อไม่ต้องพึ่งไฟล์ภายนอก"""
    s = size
    w = max(6, s // 10)

    if kind == "car":
        body = [cx - s, cy - s // 6, cx + s, cy + s // 2]
        rounded_rect(draw, body, radius=s // 4, fill=color)
        roof = [cx - s * 0.62, cy - s * 0.72, cx + s * 0.62, cy - s * 0.05]
        rounded_rect(draw, roof, radius=s // 5, fill=color)
        r = s // 4
        draw.ellipse([cx - s * 0.62 - r, cy + s * 0.28, cx - s * 0.62 + r, cy + s * 0.28 + 2 * r], fill=color)
        draw.ellipse([cx + s * 0.62 - r, cy + s * 0.28, cx + s * 0.62 + r, cy + s * 0.28 + 2 * r], fill=color)

    elif kind == "list":
        for i in range(3):
            y = cy - s * 0.55 + i * s * 0.55
            draw.ellipse([cx - s, y - w, cx - s + 2 * w, y + w], fill=color)
            draw.line([cx - s * 0.5, y, cx + s, y], fill=color, width=w)

    elif kind == "search":
        r = int(s * 0.62)
        draw.ellipse([cx - r - s * 0.15, cy - r - s * 0.15, cx + r - s * 0.15, cy + r - s * 0.15],
                     outline=color, width=w)
        draw.line([cx + r * 0.45, cy + r * 0.45, cx + s * 0.85, cy + s * 0.85], fill=color, width=w)

    elif kind == "book":
        rounded_rect(draw, [cx - s * 0.75, cy - s * 0.8, cx + s * 0.75, cy + s * 0.8],
                     radius=s // 6, fill=None, outline=color, width=w)
        for i in range(3):
            y = cy - s * 0.35 + i * s * 0.35
            draw.line([cx - s * 0.4, y, cx + s * 0.4, y], fill=color, width=w)

    elif kind == "chat":
        rounded_rect(draw, [cx - s * 0.85, cy - s * 0.75, cx + s * 0.85, cy + s * 0.35],
                     radius=s // 3, fill=color)
        draw.polygon([(cx - s * 0.3, cy + s * 0.3), (cx - s * 0.05, cy + s * 0.8),
                      (cx + s * 0.2, cy + s * 0.3)], fill=color)

    elif kind == "phone":
        rounded_rect(draw, [cx - s * 0.5, cy - s * 0.85, cx + s * 0.5, cy + s * 0.85],
                     radius=s // 4, fill=None, outline=color, width=w)
        draw.line([cx - s * 0.2, cy + s * 0.55, cx + s * 0.2, cy + s * 0.55], fill=color, width=w)


def main():
    img = Image.new("RGB", (W, H), BG)
    draw = ImageDraw.Draw(img)

    title_font = ImageFont.truetype(FONT_BOLD, 108)
    sub_font = ImageFont.truetype(FONT_REG, 62)

    pad = 26

    for idx, (title, subtitle, primary, icon) in enumerate(BUTTONS):
        col, row = idx % COLS, idx // COLS
        x0, y0 = col * CELL_W, row * CELL_H
        box = [x0 + pad, y0 + pad, x0 + CELL_W - pad, y0 + CELL_H - pad]

        if primary:
            rounded_rect(draw, box, radius=48, fill=BLUE)
            title_color, sub_color, icon_color = WHITE, (219, 234, 254), WHITE
        else:
            rounded_rect(draw, box, radius=48, fill=WHITE, outline=LINE, width=4)
            title_color, sub_color, icon_color = NAVY, MUTED, BLUE

        cx = x0 + CELL_W // 2
        draw_icon(draw, icon, cx, y0 + int(CELL_H * 0.34), int(CELL_H * 0.115), icon_color)

        tw = draw.textlength(title, font=title_font)
        draw.text((cx - tw / 2, y0 + int(CELL_H * 0.52)), title, font=title_font, fill=title_color)

        sw = draw.textlength(subtitle, font=sub_font)
        draw.text((cx - sw / 2, y0 + int(CELL_H * 0.70)), subtitle, font=sub_font, fill=sub_color)

    out = os.path.join(os.path.dirname(os.path.abspath(__file__)), "richmenu.png")
    img.save(out, "PNG", optimize=True)
    size_kb = os.path.getsize(out) / 1024
    print(f"saved: {out} ({size_kb:.0f} KB)")
    if size_kb > 1024:
        print("คำเตือน: ไฟล์ใหญ่เกิน 1MB ซึ่งเป็นลิมิตของ LINE")


if __name__ == "__main__":
    main()
