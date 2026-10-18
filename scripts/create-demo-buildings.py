"""Original temporary overhead demos. Optional authoring tool: Python + Pillow.
Outputs transparent 1024x512 RGBA PNGs. Not part of runtime or npm build.
"""
from pathlib import Path
from PIL import Image, ImageDraw
ROOT = Path(__file__).resolve().parents[1] / 'src/assets/buildings/png'
ROOT.mkdir(parents=True, exist_ok=True)
S = 3
for turf in (False, True):
    image = Image.new('RGBA', (1024*S, 512*S), (0,0,0,0))
    d = ImageDraw.Draw(image)
    def poly(points, fill, line='#382c21', width=5):
        points=[(int(x*S),int(y*S)) for x,y in points]
        d.polygon(points, fill=fill)
        if line: d.line(points+[points[0]], fill=line, width=width*S, joint='curve')
    def line(points, fill, width=3): d.line([(int(x*S),int(y*S)) for x,y in points],fill=fill,width=width*S)
    if turf:
        # Curving boat-shaped turf roof, timber ribs and a visible side vestibule.
        poly([(340,345),(488,345),(488,449),(340,449)], '#796044')
        poly([(92,256),(148,135),(310,81),(700,81),(867,135),(932,256),(865,370),(705,422),(310,422),(148,369)], '#536e3b')
        poly([(92,256),(148,135),(310,81),(700,81),(867,135),(932,256)], '#82934f')
        # Deterministic turf tufts, not an environmental decoration layer.
        for x,y in [(210,195),(310,148),(420,190),(550,135),(660,202),(790,170),(200,304),(350,352),(520,315),(690,365),(815,308)]:
            line([(x-9,y+3),(x,y-10),(x+8,y+2)], '#a0ac64', 4)
        for x in (205,365,525,685,845): line([(x,119 if x in (205,845) else 90),(x+9,256),(x,388 if x in (205,845) else 412)], '#665b37', 10)
        line([(102,256),(920,256)], '#463628', 16)
        line([(115,250),(903,250)], '#baaa73', 4)
        poly([(350,402),(480,402),(480,450),(350,450)], '#745539')
        line([(360,420),(468,420)], '#c7a56b', 5)
    else:
        # Rectangular timber-shingle gable with cross-wing and two different roof axes.
        poly([(110,112),(870,112),(915,256),(870,400),(110,400),(65,256)], '#ad7948')
        poly([(110,112),(870,112),(915,256),(65,256)], '#d1a46b')
        for y in (148,182,216,290,324,358):
            line([(102,y),(881,y)], '#6a482f', 4)
            for x in range(135+(y%3)*11,850,78): line([(x,y),(x+9,y+28)], '#87613e', 3)
        line([(75,256),(904,256)], '#493326', 15)
        line([(110,124),(870,124)], '#e5bb7b', 4)
        # Overlapping side wing: unmistakable T-shaped footprint/silhouette.
        poly([(490,278),(693,278),(728,448),(457,448)], '#98683e')
        poly([(490,278),(592,255),(592,448),(457,448)], '#d4a56a')
        line([(592,269),(592,448)], '#4a3526', 13)
        for y in (323,367,409): line([(483,y),(707,y)], '#795030', 4)
        # Stone chimney and roof hatch, entirely within logical footprint.
        poly([(241,170),(302,170),(302,224),(241,224)], '#777b71')
        poly([(252,180),(290,180),(290,212),(252,212)], '#343b35', None)
    image.resize((1024,512),Image.Resampling.LANCZOS).save(ROOT / ('demo-viking-turf-longhouse.png' if turf else 'demo-viking-timber-longhouse.png'))
