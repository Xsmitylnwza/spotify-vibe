from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent
FONT = ImageFont.truetype('C:/Windows/Fonts/segoeui.ttf', 17)
SMALL = ImageFont.truetype('C:/Windows/Fonts/segoeui.ttf', 13)
names = ['Polished original', 'Plump proportions', 'Soft light', 'Diamond wink', 'Glossy porcelain', 'Soft clay', 'Flat minimal', 'Subtle glass', 'Swooping ghost', 'V-notch buddy', 'Floating ribbon', 'Pill dome', 'Wide cloud buddy']
sheet = Image.new('RGB', (1200, 1536), '#eef0fc')
d = ImageDraw.Draw(sheet)
d.text((20, 12), 'Vibe Studio / ghost concepts / 01-04 close, 05-08 styles, 09-13 bolder', font=FONT, fill='#202447')
d.text((20, 40), 'Each card: 224px preview + actual 64px and 32px thumbnails; view at 100% for size review.', font=SMALL, fill='#555b7e')
small_sheet = Image.new('RGB', (900, 250), '#eef0fc')
sd = ImageDraw.Draw(small_sheet)
sd.text((16, 10), 'Actual 32px / nearest-neighbor 64px inspection copies', font=FONT, fill='#202447')
for i, title in enumerate(names):
    f = ROOT / f'option-{i+1:02d}.png'
    im = Image.open(f).convert('RGB')
    if im.size != (1024, 1024):
        im = im.resize((1024, 1024), Image.Resampling.LANCZOS)
        im.save(f)
    x, y = (i % 4) * 300, 80 + (i // 4) * 360
    d.rounded_rectangle((x+8, y, x+292, y+348), 12, fill='white')
    d.text((x+20, y+10), f'{i+1:02d}  {title}', font=FONT, fill='#202447')
    sheet.paste(im.resize((224, 224), Image.Resampling.LANCZOS), (x+38, y+42))
    t64 = im.resize((64,64), Image.Resampling.LANCZOS)
    t32 = im.resize((32,32), Image.Resampling.LANCZOS)
    sheet.paste(t64, (x+72,y+280))
    sheet.paste(t32, (x+176,y+296))
    d.text((x+141,y+307), '64', font=SMALL, fill='#555b7e')
    d.text((x+215,y+307), '32', font=SMALL, fill='#555b7e')
    sx = 16 + i * 67
    small_sheet.paste(t32, (sx,45))
    small_sheet.paste(t32.resize((64,64), Image.Resampling.NEAREST), (sx,100))
    sd.text((sx,180), f'{i+1:02d}', font=FONT, fill='#202447')
sheet.save(ROOT / 'contact-sheet.png')
small_sheet.save(ROOT / '32px-check.png')
assert len(list(ROOT.glob('option-*.png'))) == 13
assert all(Image.open(f).size == (1024,1024) for f in ROOT.glob('option-*.png'))
print('Verified: 13 PNG options at 1024x1024; contact-sheet 1200x1536 with actual 64/32px; 32px inspection sheet.')
