import os
from PIL import Image, ImageDraw

def create_crisp_gamepad_icon():
    # 4096 x 4096 master supersampling
    SIZE = 4096
    img = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # 1. White Rounded Rectangle Badge (matching website header .logo-icon)
    margin = int(SIZE * 0.04) # 4% safe padding
    radius = int(SIZE * 0.22) # smooth squircle
    draw.rounded_rectangle([margin, margin, SIZE - margin, SIZE - margin], radius=radius, fill=(255, 255, 255, 255))

    # 2. Inside Gamepad Vector Details
    inner_w = SIZE - 2 * margin
    scale = (inner_w * 0.80) / 20.0  # gamepad width is 20 (x=2 to x=22)
    
    gp_width = 20.0 * scale
    gp_height = 12.0 * scale
    
    origin_x = (SIZE - gp_width) / 2.0 - (2.0 * scale)
    origin_y = (SIZE - gp_height) / 2.0 - (6.0 * scale)

    def pt(x, y):
        return (origin_x + x * scale, origin_y + y * scale)

    fg_color = (9, 9, 11, 255) # Zinc-950
    stroke_w = int(2.3 * scale)

    # A. Outer Gamepad Rounded Rect: x=2, y=6 to x=22, y=18
    gp_x1, gp_y1 = pt(2, 6)
    gp_x2, gp_y2 = pt(22, 18)
    gp_rad = int(3.2 * scale)
    draw.rounded_rectangle([gp_x1, gp_y1, gp_x2, gp_y2], radius=gp_rad, outline=fg_color, width=stroke_w)

    # B. D-Pad Cross (left side)
    draw.line([pt(6, 12), pt(10, 12)], fill=fg_color, width=stroke_w)
    draw.line([pt(8, 10), pt(8, 14)], fill=fg_color, width=stroke_w)
    cap_r = stroke_w / 2.0
    for cx, cy in [(6, 12), (10, 12), (8, 10), (8, 14)]:
        px, py = pt(cx, cy)
        draw.ellipse([px - cap_r, py - cap_r, px + cap_r, py + cap_r], fill=fg_color)

    # C. Action Buttons (right side)
    dot_r = int(1.25 * scale)
    for bx, by in [(15.0, 13.0), (18.0, 11.0)]:
        px, py = pt(bx, by)
        draw.ellipse([px - dot_r, py - dot_r, px + dot_r, py + dot_r], fill=fg_color)

    base_dir = r"c:\xampp\htdocs\D\_DigiManager\DigiManager"
    icons_dir = os.path.join(base_dir, "src-tauri", "icons")
    public_dir = os.path.join(base_dir, "public")

    # Save Master PNGs
    img_1024 = img.resize((1024, 1024), Image.Resampling.LANCZOS)
    img_512 = img.resize((512, 512), Image.Resampling.LANCZOS)
    img_256 = img.resize((256, 256), Image.Resampling.LANCZOS)
    img_128 = img.resize((128, 128), Image.Resampling.LANCZOS)
    img_64 = img.resize((64, 64), Image.Resampling.LANCZOS)
    img_48 = img.resize((48, 48), Image.Resampling.LANCZOS)
    img_32 = img.resize((32, 32), Image.Resampling.LANCZOS)

    img_1024.save(os.path.join(base_dir, "icon.png"), "PNG")
    img_1024.save(os.path.join(public_dir, "icon.png"), "PNG")
    img_1024.save(os.path.join(icons_dir, "icon.png"), "PNG")
    img_512.save(os.path.join(icons_dir, "128x128@2x.png"), "PNG")
    img_128.save(os.path.join(icons_dir, "128x128.png"), "PNG")
    img_64.save(os.path.join(icons_dir, "64x64.png"), "PNG")
    img_32.save(os.path.join(icons_dir, "32x32.png"), "PNG")

    img_512.save(os.path.join(icons_dir, "Square310x310Logo.png"), "PNG")
    img_256.save(os.path.join(icons_dir, "Square284x284Logo.png"), "PNG")
    img_128.save(os.path.join(icons_dir, "Square150x150Logo.png"), "PNG")
    img_128.save(os.path.join(icons_dir, "Square142x142Logo.png"), "PNG")
    img_128.save(os.path.join(icons_dir, "Square107x107Logo.png"), "PNG")
    img_64.save(os.path.join(icons_dir, "Square89x89Logo.png"), "PNG")
    img_64.save(os.path.join(icons_dir, "Square71x71Logo.png"), "PNG")
    img_48.save(os.path.join(icons_dir, "Square44x44Logo.png"), "PNG")
    img_32.save(os.path.join(icons_dir, "Square30x30Logo.png"), "PNG")
    img_48.save(os.path.join(icons_dir, "StoreLogo.png"), "PNG")

    # In Pillow, to save multi-resolution ICO properly:
    ico_sizes = [(16, 16), (20, 20), (24, 24), (32, 32), (40, 40), (48, 48), (64, 64), (128, 128), (256, 256)]
    ico_path = os.path.join(icons_dir, "icon.ico")
    img_1024.save(ico_path, format="ICO", sizes=ico_sizes)
    print(f"Generated multi-size .ico at: {ico_path}")

if __name__ == "__main__":
    create_crisp_gamepad_icon()
