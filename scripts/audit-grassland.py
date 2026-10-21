"""Optional source audit: python scripts/audit-grassland.py (requires Pillow).
Read-only: supplied WebPs are never rewritten or 'made seamless'.
"""
import hashlib
import json
from pathlib import Path
from PIL import Image, ImageChops, ImageStat

root = Path(__file__).resolve().parents[1] / 'src/assets/grassland'
manifest = json.loads((root / 'manifest.json').read_text())
integrity = json.loads((root / 'integrity.json').read_text())
for asset in manifest['assets']:
    path = root / 'webp' / Path(asset['file']).name
    assert hashlib.sha256(path.read_bytes()).hexdigest() == integrity[asset['id']]
    image = Image.open(path)
    assert image.size == (896, 896) and image.mode == 'RGB' and image.format == 'WEBP'
    borders = [((0, 0, 1, 896), (895, 0, 896, 896)),
               ((0, 0, 896, 1), (0, 895, 896, 896))]
    errors = [round(sum(ImageStat.Stat(ImageChops.difference(image.crop(a), image.crop(b))).mean) / 3, 1)
              for a, b in borders]
    print(f"{path.name}: unchanged RGB 896²; opposing-edge mean RGB difference {errors}")
print('Borders are not seamless. Keep the pilot opt-in and use the shared feathered masks.')
