import os
import qrcode
from PIL import Image, ImageDraw, ImageFont

def generate_all_qr_assets():
    qr_dir = "qr"
    os.makedirs(qr_dir, exist_ok=True)
    
    url = "https://anasoncafeqr.vercel.app/"
    
    # Fonts from Windows Fonts
    font_dir = os.path.join(os.environ.get('WINDIR', 'C:\\Windows'), 'Fonts')
    font_title = ImageFont.truetype(os.path.join(font_dir, 'segoeuib.ttf'), 38)
    font_sub = ImageFont.truetype(os.path.join(font_dir, 'segoeuib.ttf'), 20)
    font_hint = ImageFont.truetype(os.path.join(font_dir, 'segoeui.ttf'), 22)
    font_badge = ImageFont.truetype(os.path.join(font_dir, 'segoeuib.ttf'), 42)
    font_sheet_header = ImageFont.truetype(os.path.join(font_dir, 'segoeuib.ttf'), 32)
    font_sheet_sub = ImageFont.truetype(os.path.join(font_dir, 'segoeui.ttf'), 22)

    # 1. Master QR with Centered Logo
    qr = qrcode.QRCode(
        version=2,
        error_correction=qrcode.constants.ERROR_CORRECT_H,
        box_size=16,
        border=2,
    )
    qr.add_data(url)
    qr.make(fit=True)
    qr_img = qr.make_image(fill_color="#0f172a", back_color="white").convert("RGBA")

    # Center Logo
    logo = Image.open("static/assets/logo_light.png").convert("RGBA")
    lw, lh = logo.size
    box_size = int(qr_img.size[0] * 0.26)
    target_lw = box_size - 16
    target_lh = int(target_lw * (lh / lw))
    logo_resized = logo.resize((target_lw, target_lh), Image.Resampling.LANCZOS)

    # Logo Badge Container
    logo_bg = Image.new("RGBA", (box_size, box_size), (0, 0, 0, 0))
    draw_bg = ImageDraw.Draw(logo_bg)
    draw_bg.rounded_rectangle([(0, 0), (box_size - 1, box_size - 1)], radius=16, fill="white", outline="#ff5a26", width=3)
    
    offset_x = (box_size - target_lw) // 2
    offset_y = (box_size - target_lh) // 2
    logo_bg.paste(logo_resized, (offset_x, offset_y), logo_resized)

    pos = ((qr_img.size[0] - box_size) // 2, (qr_img.size[1] - box_size) // 2)
    qr_img.paste(logo_bg, pos, logo_bg)

    master_path = os.path.join(qr_dir, "anason_cafe_qr_master.png")
    qr_img.save(master_path)
    print(f"Saved master QR: {master_path}")

    # Helper function to render a single table card
    cw, ch = 746, 787
    def render_card(table_number):
        card = Image.new("RGB", (cw, ch), "white")
        draw = ImageDraw.Draw(card)

        # Outer cut guide line
        draw.rounded_rectangle([(8, 8), (cw - 9, ch - 9)], radius=24, outline="#cbd5e1", width=2)
        # Inner flame border
        draw.rounded_rectangle([(18, 18), (cw - 19, ch - 19)], radius=18, outline="#ff5a26", width=2)

        # Title: ANASON CAFE
        title = "ANASON CAFE"
        tb = draw.textbbox((0, 0), title, font=font_title)
        draw.text(((cw - (tb[2] - tb[0])) // 2, 40), title, fill="#0f172a", font=font_title)

        # Subtitle: HOOKAH LOUNGE & BİSTRO
        sub = "HOOKAH LOUNGE & BİSTRO"
        sb = draw.textbbox((0, 0), sub, font=font_sub)
        draw.text(((cw - (sb[2] - sb[0])) // 2, 90), sub, fill="#ff5a26", font=font_sub)

        # Paste QR
        qr_resized = qr_img.resize((430, 430), Image.Resampling.LANCZOS)
        card.paste(qr_resized, ((cw - 430) // 2, 130), qr_resized)

        # Prompt hint
        hint = "Menüyü İncelemek İçin Okutunuz"
        hb = draw.textbbox((0, 0), hint, font=font_hint)
        draw.text(((cw - (hb[2] - hb[0])) // 2, 580), hint, fill="#64748b", font=font_hint)

        # Table Badge Pill
        bw, bh = 340, 80
        bx = (cw - bw) // 2
        by = 640
        draw.rounded_rectangle([(bx, by), (bx + bw, by + bh)], radius=40, fill="#0f172a", outline="#ff5a26", width=3)

        masa_text = f"MASA {table_number}"
        mb = draw.textbbox((0, 0), masa_text, font=font_badge)
        mw = mb[2] - mb[0]
        mh = mb[3] - mb[1]
        draw.text(((cw - mw) // 2, by + (bh - mh) // 2 - 4), masa_text, fill="white", font=font_badge)

        return card

    # A4 Dimensions @ 300 DPI: 2480 x 3508 px
    page_w, page_h = 2480, 3508
    margin_x = 80
    margin_top = 150
    gap_x = 40
    gap_y = 40

    a4_images = []

    # 3 Sheets: (1-12), (13-24), (25-36)
    for sheet_idx in range(3):
        start_num = sheet_idx * 12 + 1
        end_num = start_num + 11

        page = Image.new("RGB", (page_w, page_h), "#f8fafc")
        pdraw = ImageDraw.Draw(page)

        # Page Header Info
        header_text = f"ANASON CAFE & BİSTRO • DİJİTAL MENÜ MASA QR KARTLARI (SAYFA {sheet_idx + 1}: MASA {start_num} - {end_num})"
        htb = pdraw.textbbox((0, 0), header_text, font=font_sheet_header)
        pdraw.text(((page_w - (htb[2] - htb[0])) // 2, 45), header_text, fill="#0f172a", font=font_sheet_header)

        sub_header = "Makasla gri kılavuz çizgilerinden keserek masalara veya pleksi stantlara yerleştiriniz • https://anasoncafeqr.vercel.app/"
        stb = pdraw.textbbox((0, 0), sub_header, font=font_sheet_sub)
        pdraw.text(((page_w - (stb[2] - stb[0])) // 2, 95), sub_header, fill="#64748b", font=font_sheet_sub)

        # Draw 12 cards in 4 rows x 3 columns
        for idx in range(12):
            table_num = start_num + idx
            col = idx % 3
            row = idx // 3

            x = margin_x + col * (cw + gap_x)
            y = margin_top + row * (ch + gap_y)

            card_img = render_card(table_num)
            page.paste(card_img, (x, y))

        out_name = f"a4_masalar_sayfa_{sheet_idx + 1}_masa_{start_num:02d}_{end_num:02d}.png"
        out_path = os.path.join(qr_dir, out_name)
        page.save(out_path, dpi=(300, 300))
        print(f"Saved A4 sheet {sheet_idx + 1}: {out_path}")
        a4_images.append(page)

    # Save Multi-page PDF for direct printing
    pdf_path = os.path.join(qr_dir, "anason_cafe_masalar_a4_baski.pdf")
    a4_images[0].save(pdf_path, save_all=True, append_images=a4_images[1:], resolution=300.0)
    print(f"Saved printable PDF: {pdf_path}")

if __name__ == "__main__":
    generate_all_qr_assets()
