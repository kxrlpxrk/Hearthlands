"""Read-only authoring audit: Python + Pillow, no runtime/build dependency.
Checks the approved source PNGs against measured alpha bounds and SHA-256.
Never rewrites, recolours or regenerates the supplied artwork.
"""
from pathlib import Path
from PIL import Image
import hashlib, json
root = Path(__file__).resolve().parents[1] / 'src/assets/forests/canopies'
manifest = json.loads((root / 'manifest.json').read_text())
pixels = 0
for asset in manifest['assets']:
    path = root / 'png' / Path(asset['file']).name
    image = Image.open(path)
    assert image.mode == 'RGBA', path.name
    assert image.size == (asset['pixelWidth'], asset['pixelHeight']), path.name
    assert hashlib.sha256(path.read_bytes()).hexdigest() == asset['sha256'], path.name
    x, y, right, bottom = image.getchannel('A').getbbox()
    assert {'x': x, 'y': y, 'width': right-x, 'height': bottom-y} == asset['alpha'], path.name
    assert image.getchannel('A').getextrema() == (0, 255), path.name
    pixels += image.width * image.height
    print(f'{asset["id"]}: {image.width}x{image.height}, alpha {x},{y}–{right},{bottom}, source hash verified')
print(f'{len(manifest["assets"])} original RGBA files verified; decoded source pixels: {pixels*4/1024**2:.2f} MiB (excludes caches/browser overhead).')
