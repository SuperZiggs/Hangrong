"""Reference-calibrate whole strips, then share one final scale and foot anchor."""
from pathlib import Path
import json, math, statistics
from PIL import Image
import numpy as np
ROOT=Path(__file__).resolve().parents[1]
SOURCE=ROOT/'assets/arcade'
OUT=ROOT/'public/arcade/assets/characters'
OUT.mkdir(parents=True,exist_ok=True)
rows=json.loads((SOURCE/'strips.json').read_text(encoding='utf-8'))
def content(image):
    b=image.getchannel('A').point(lambda x:255 if x>24 else 0).getbbox()
    if not b: raise ValueError('Empty sprite frame')
    return image.crop(b)
def cap_width(image):
    a=np.array(image); h=a.shape[0]; widths=[]
    for line in a[round(h*.17):round(h*.4),:,3]:
        xs=np.where(line>128)[0]
        if len(xs):widths.append(int(xs.max()-xs.min()+1))
    return statistics.median(widths) if widths else image.width*.7
calibrated=[]
for row in rows:
    image=Image.open(SOURCE/row['path']).convert('RGBA');n=row['frames']
    frames=[content(image.crop((round(i*image.width/n),0,round((i+1)*image.width/n),image.height))) for i in range(n)]
    seed=content(Image.open(SOURCE/f"seeds/courier-{row['direction']}-reference.png").convert('RGBA'))
    reference_cap=cap_width(seed)*76/seed.height
    scale=reference_cap/statistics.median(cap_width(f) for f in frames)
    for i,frame in enumerate(frames):calibrated.append((f"courier/{row['direction']}/{row['animation']}/{i+1:02}",frame,scale))
max_w=max(f.width*s for _,f,s in calibrated);max_h=max(f.height*s for _,f,s in calibrated)
global_scale=min(1,88/max_w,84/max_h)
frames_dir=SOURCE/'frames/courier';frames_dir.mkdir(parents=True,exist_ok=True)
columns=8;stride=100;atlas=Image.new('RGBA',(columns*stride,math.ceil(len(calibrated)/columns)*stride))
metadata={'frames':{},'meta':{'image':'courier.png','scale':'1','size':{'w':atlas.width,'h':atlas.height}}}
for index,(name,frame,scale) in enumerate(calibrated):
    scale*=global_scale
    resized=frame.resize((max(1,round(frame.width*scale)),max(1,round(frame.height*scale))),Image.Resampling.LANCZOS)
    cell=Image.new('RGBA',(96,96));cell.alpha_composite(resized,((96-resized.width)//2,88-resized.height))
    x=index%columns*stride+2;y=index//columns*stride+2;atlas.alpha_composite(cell,(x,y))
    metadata['frames'][name]={'frame':{'x':x,'y':y,'w':96,'h':96},'rotated':False,'trimmed':False,'spriteSourceSize':{'x':0,'y':0,'w':96,'h':96},'sourceSize':{'w':96,'h':96}}
    cell.save(frames_dir/(name.replace('/','-')+'.png'))
atlas.save(OUT/'courier.png',optimize=True)
(OUT/'courier.json').write_text(json.dumps(metadata,ensure_ascii=False),encoding='utf-8')
preview=SOURCE/'previews';preview.mkdir(parents=True,exist_ok=True)
atlas.save(preview/'courier-contact-sheet.png')
runtime=ROOT/'public/arcade/assets/runtime.json'
entries=[]
catalog=json.loads((ROOT/'docs/arcade/assets.catalog.json').read_text(encoding='utf-8'))
for item in catalog['items']:
    if (ROOT/'public/arcade/assets'/item['path']).is_file():entries.append(item)
runtime.write_text(json.dumps({'entries':entries,'status':'candidate-until-asset-qa'},ensure_ascii=False),encoding='utf-8')
print(f'Normalized {len(calibrated)} frames, shared final scale {global_scale:.3f}; same foot anchor(48,88).')
