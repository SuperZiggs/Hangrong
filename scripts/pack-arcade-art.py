"""Normalize reviewed imagegen sheets and draw code-native UI/FX assets.

No generated imagery is repainted. Sheet cuts and scale/anchors are explicit.
"""
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont,ImageFilter,ImageOps
import json,math,shutil,sys
ROOT=Path(__file__).resolve().parents[1]; SRC=ROOT/'assets/arcade';OUT=ROOT/'public/arcade/assets'
catalog=json.loads((ROOT/'docs/arcade/assets.catalog.json').read_text(encoding='utf-8'))
generated={}
for batch in ['environment-production','character-and-title','screens-and-alpha']:
    for row in json.loads((SRC/f'prompts/{batch}.json').read_text(encoding='utf-8')):
        generated[row['key']]=row
        shutil.copy2(row['path'],SRC/'raw'/f"{row['key']}.png")
strips=json.loads((SRC/'strips.json').read_text(encoding='utf-8'))
row=next(r for r in strips if r['direction']=='N' and r['animation']=='run')
row.update(path='raw/run-N-final.png',originPath=generated['run-N-final']['path'],prompt=generated['run-N-final']['prompt'])
(SRC/'strips.json').write_text(json.dumps(strips,ensure_ascii=False,indent=2),encoding='utf-8')
def trim(im):
    im=im.convert('RGBA'); a=im.getchannel('A').point(lambda n:0 if n<12 else n);im.putalpha(a)
    box=a.point(lambda n:255 if n>24 else 0).getbbox()
    if not box:raise ValueError('Empty sprite')
    return im.crop(box)
def cells(name,cols,rows):
    im=Image.open(SRC/f'raw/{name}.png').convert('RGBA')
    return [im.crop((round(x*im.width/cols),round(y*im.height/rows),round((x+1)*im.width/cols),round((y+1)*im.height/rows))) for y in range(rows) for x in range(cols)]
def fit(im,size,bounds=None,foot=None):
    im=trim(im);w,h=bounds or(size-12,size-12);s=min(w/im.width,h/im.height);im=im.resize((round(im.width*s),round(im.height*s)),Image.Resampling.LANCZOS)
    out=Image.new('RGBA',(size,size));out.alpha_composite(im,((size-im.width)//2,(foot if foot is not None else (size+im.height)//2)-im.height));return out
def isolated(name,expected):
    # Alpha connected components recover artist spacing without cutting neighbors.
    import numpy as np
    im=Image.open(SRC/f'raw/{name}.png').convert('RGBA');mask=np.array(im.getchannel('A'))[::3,::3]>128;h,w=mask.shape;boxes=[]
    for y in range(h):
      for x in range(w):
        if not mask[y,x]:continue
        todo=[(x,y)];mask[y,x]=False;pts=[]
        while todo:
          px,py=todo.pop();pts.append((px,py))
          for nx,ny in [(px-1,py),(px+1,py),(px,py-1),(px,py+1)]:
            if 0<=nx<w and 0<=ny<h and mask[ny,nx]:mask[ny,nx]=False;todo.append((nx,ny))
        if len(pts)>250:
          xs,ys=zip(*pts);boxes.append((max(0,min(xs)*3-5),max(0,min(ys)*3-5),min(im.width,max(xs)*3+8),min(im.height,max(ys)*3+8)))
    boxes.sort(key=lambda b:(int((b[1]+b[3])/2>=im.height/2),b[0]))
    if len(boxes)!=expected:raise ValueError(f'{name}: found {len(boxes)}, expected {expected}')
    return [im.crop(b) for b in boxes]
def pack(key,frames):
    item=next(x for x in catalog['items'] if x['key']==key);assert len(frames)==item['frames'],key
    size=item['frameSize'][0];cols=min(8,2048//(size+4),len(frames));stride=size+4
    sheet=Image.new('RGBA',(cols*stride,math.ceil(len(frames)/cols)*stride));meta={'frames':{},'meta':{'image':Path(item['path']).name,'scale':'1','size':{'w':sheet.width,'h':sheet.height}}}
    for i,(name,im) in enumerate(frames):
        assert im.size==(size,size);x=i%cols*stride+2;y=i//cols*stride+2;sheet.alpha_composite(im,(x,y))
        # Two-pixel extrusion prevents bilinear atlas bleed at non-integer zoom.
        sheet.paste(im.crop((0,0,size,1)).resize((size,2)),(x,y-2));sheet.paste(im.crop((0,size-1,size,size)).resize((size,2)),(x,y+size))
        sheet.paste(im.crop((0,0,1,size)).resize((2,size)),(x-2,y));sheet.paste(im.crop((size-1,0,size,size)).resize((2,size)),(x+size,y))
        meta['frames'][name]={'frame':{'x':x,'y':y,'w':size,'h':size},'rotated':False,'trimmed':False,'spriteSourceSize':{'x':0,'y':0,'w':size,'h':size},'sourceSize':{'w':size,'h':size}}
    target=OUT/item['path'];target.parent.mkdir(parents=True,exist_ok=True);sheet.save(target,optimize=True)
    (OUT/item['atlas']).write_text(json.dumps(meta,ensure_ascii=False),encoding='utf-8')
    sheet.save(SRC/'previews'/f'{key}.png')
pack('characters.parcel',[(f'parcel/{d}',fit(im,96,(31,29),62)) for d,im in zip('NESW',cells('parcel',4,1))])
pack('characters.customers',[(f'customer/{i%4}/{i//4+1:02}',fit(im,96,(65,80),88)) for i,im in enumerate(cells('customers-alpha',4,2))])
propnames=['trees','planters','lamps','benches','crates','signs','bollards','umbrellas'];bounds=[(112,116),(66,60),(62,107),(103,69),(53,53),(53,66),(35,47),(107,104)]
pack('environment.props',[(f'{propnames[i//4]}/{i%4}',fit(im,128,bounds[i//4],120)) for i,im in enumerate(cells('props',8,4))])
names=['storefront/0','storefront/1','storefront/2','storefront/3','depot','p-tower','p-gate/closed','p-gate/open','shared-bridge/closed','shared-bridge/open','private-channel/closed','private-channel/open','promotion/closed','promotion/open']
pack('environment.structures',[(name,fit(im,256,(230,230),244)) for name,im in zip(names,isolated('structures',14))])
# The artist sheet has semantic horizontal bands rather than equal row heights.
tiles=Image.open(SRC/'raw/tiles.png').convert('RGBA');k=tiles.height/1254
cuts=[0,156,313,470,625,749,858,968,1088,1254]
bands=[[tiles.crop((round(x*tiles.width/8),round(cuts[y]*k),round((x+1)*tiles.width/8),round(cuts[y+1]*k))).resize((64,64),Image.Resampling.LANCZOS) for x in range(8)] for y in range(9)]
groups={'ground':(bands[0]+bands[1])[:12],'roads':(bands[2]+bands[3]+bands[4])[:20],'curbs':(bands[5]+bands[6])[:12],'water':bands[7],'bridges':bands[8]+[im.transpose(Image.Transpose.ROTATE_90) for im in bands[8][1:5]]}
pack('environment.tiles',[(f'{name}/{i:02}',im) for name,ims in groups.items() for i,im in enumerate(ims)])
for key,name in [('title','title-key-art'),('lobby','lobby-backdrop'),('loading','loading-vignette'),('results','results-backdrop')]:
    target=OUT/f'screens/{name}.webp';target.parent.mkdir(parents=True,exist_ok=True);size=(1024,512) if key=='loading' else(1536,864)
    ImageOps.fit(Image.open(SRC/f'raw/{key}.png').convert('RGB'),size,method=Image.Resampling.LANCZOS).save(target,quality=86,method=6)
INK='#183c48';CREAM='#fff4db';TEAL='#18a999';GOLD='#ffc857';CORAL='#f26b5e';VIOLET='#5964d8'
def native(size,draw):
    im=Image.new('RGBA',(size*3,size*3));d=ImageDraw.Draw(im);draw(d,3);return im.resize((size,size),Image.Resampling.LANCZOS)
def poly(d,pts,color,scale=3,outline=INK,width=2):d.polygon([(x*scale,y*scale) for x,y in pts],fill=color,outline=outline,width=width*scale)
def star(cx,cy,r,n=5,inner=.45):return [(cx+math.sin(i*math.pi/n)*r*(1 if i%2==0 else inner),cy-math.cos(i*math.pi/n)*r*(1 if i%2==0 else inner)) for i in range(n*2)]
def marker(i):
    def draw(d,s):
        if i==0:d.ellipse((7*s,7*s,57*s,57*s),fill='white',outline=INK,width=3*s)
        else:poly(d,[[(9,9),(55,9),(55,55),(9,55)],[(32,3),(61,32),(32,61),(3,32)],[(32,5),(60,56),(4,56)]][i-1],'white',s,width=3)
    return native(64,draw)
pack('characters.markers',[(name,marker(i)) for i,name in enumerate(['circle','square','diamond','triangle'])])
im=Image.new('RGBA',(64,32));d=ImageDraw.Draw(im);d.ellipse((8,7,56,25),fill=(24,60,72,75));im=im.filter(ImageFilter.GaussianBlur(3));im.save(OUT/'characters/shadow.png')
fontpath=SRC/'raw/baloo2.ttf'
def txt(d,text,xy,size,fill=INK):d.text((xy[0]*3,xy[1]*3),text,font=ImageFont.truetype(str(fontpath),size*3),fill=fill,anchor='mm')
iconitems=next(x for x in catalog['items'] if x['key']=='ui.icons')['names']
def icon(name,index):
 def draw(d,s):
    d.rounded_rectangle((5*s,5*s,59*s,59*s),radius=14*s,fill=CREAM,outline=INK,width=2*s)
    c=[TEAL,CORAL,VIOLET,GOLD][index%4]
    if name=='coin':d.ellipse((17*s,15*s,47*s,49*s),fill=GOLD,outline=INK,width=2*s);txt(d,'$',(32,33),23)
    elif name in ['parcel','pickup','delivery','private-channel']:
        poly(d,[(17,22),(32,16),(48,22),(48,44),(32,51),(17,44)],c,s);d.line((32*s,25*s,32*s,49*s),fill=INK,width=2*s);d.line((17*s,22*s,32*s,29*s,48*s,22*s),fill=INK,width=2*s)
    elif name in ['timer','cooldown']:d.ellipse((17*s,17*s,47*s,49*s),fill=c,outline=INK,width=2*s);d.line((32*s,23*s,32*s,34*s,41*s,38*s),fill=CREAM,width=3*s)
    elif name in ['dash','bypass','resume','reconnect']:poly(d,[(14,26),(33,26),(33,16),(52,33),(33,49),(33,39),(14,39)],c,s)
    elif name=='pause':d.rounded_rectangle((20*s,18*s,29*s,47*s),3*s,fill=c);d.rounded_rectangle((36*s,18*s,45*s,47*s),3*s,fill=c)
    elif name in ['mute','sound']:poly(d,[(15,27),(24,27),(36,18),(36,47),(24,38),(15,38)],c,s);txt(d,'×' if name=='mute' else')',(47,32),23)
    elif name in ['promotion','ranking','success']:poly(d,star(32,32,21),c,s)
    elif name in ['warning','offline']:poly(d,[(32,13),(53,50),(11,50)],GOLD,s);txt(d,'!',(32,35),25)
    elif name=='fullscreen':
        for pts in [[(18,28),(18,18),(28,18)],[(36,18),(46,18),(46,28)],[(18,36),(18,46),(28,46)],[(36,46),(46,46),(46,36)]]:d.line([(x*s,y*s) for x,y in pts],fill=c,width=4*s)
    else:txt(d,{'p-gate':'P','contribution':'+','help':'?','exit':'×'}.get(name,'+'),(32,33),30,c)
 return native(64,draw)
pack('ui.icons',[(name,icon(name,i)) for i,name in enumerate(iconitems)])
shutil.copy2(OUT/'ui/icons.json',ROOT/'game/arcade/assets/ui-icons.json')
def panel(i):
 def draw(d,s):
    d.rounded_rectangle((6*s,9*s,123*s,124*s),radius=(12+i%3*3)*s,fill=INK)
    d.rounded_rectangle((4*s,4*s,120*s,117*s),radius=(12+i%3*3)*s,fill=[CREAM,'#ffffff','#d5f1de','#ece9ff'][i%4],outline=INK,width=2*s)
    d.line((18*s,23*s,106*s,23*s),fill=[TEAL,CORAL,VIOLET,GOLD][i%4],width=(3+i%3)*s)
    if i>=4:d.rounded_rectangle((17*s,89*s,107*s,104*s),7*s,fill=[TEAL,CORAL,VIOLET,GOLD][i%4])
    if i>=8:poly(d,star(63,58,18),GOLD,s)
 return native(128,draw)
pack('ui.panels',[(f'panel/{i:02}',panel(i)) for i in range(12)])
keynames=next(x for x in catalog['items'] if x['key']=='ui.keycaps')['names'];labels=['W','A','S','D','↑','←','↓','→','E','SPACE','ESC','TAB']
def keycap(text):
 def draw(d,s):
    d.rounded_rectangle((4*s,8*s,60*s,61*s),10*s,fill='#c8b993',outline=INK,width=2*s);d.rounded_rectangle((4*s,3*s,60*s,54*s),10*s,fill=CREAM,outline=INK,width=2*s);txt(d,text,(32,28),12 if len(text)>2 else 27)
 return native(64,draw)
pack('ui.keycaps',[(name,keycap(label)) for name,label in zip(keynames,labels)])
def badge(i):
 def draw(d,s):
    poly(d,[(25,55),(42,60),(33,90),(19,78),(10,81)],CORAL,s);poly(d,[(53,60),(71,54),(86,82),(72,79),(63,91)],VIOLET,s)
    d.ellipse((13*s,7*s,83*s,77*s),fill=GOLD,outline=INK,width=3*s);poly(d,star(48,42,23,5+i%3),[CREAM,TEAL,CORAL,VIOLET,'#d9ecff','#f5a6ba'][i],s)
 return native(96,draw)
pack('ui.badges',[(name,badge(i)) for i,name in enumerate(['champion','courier','pathfinder','builder','independent','team-player'])])
for item in [x for x in catalog['items'] if x['key'].startswith('fx.')]:
 name=item['key'].split('.')[1];count=item['frames'];frames=[]
 for frame in range(count):
    t=(frame+1)/count
    def draw(d,s):
        c=GOLD if 'coin' in name or 'confetti' in name or 'stars' in name else TEAL if 'delivery' in name or 'unlock' in name else VIOLET
        alpha=round(245*(1-t*.75));rgba=(*ImageColor.getrgb(c),alpha)
        if name=='promo-confetti':
            for j in range(12):
                x=20+(j*37)%88;y=20+(j*19)%45+t*40;d.rounded_rectangle((x*s,y*s,(x+5)*s,(y+9)*s),s,fill=(*ImageColor.getrgb([TEAL,CORAL,VIOLET,GOLD][j%4]),alpha))
        elif name=='coin-sparkle':
            rx=5+abs(math.cos(t*math.tau))*13;d.ellipse(((64-rx)*s,44*s,(64+rx)*s,82*s),fill=rgba,outline=(*ImageColor.getrgb(INK),alpha),width=2*s);poly(d,star(92,36,9*(1-t*.5),4),rgba,s,outline=rgba,width=1)
        elif name=='warning-ping':poly(d,[(64,18-8*t),(108+8*t,98+8*t),(20-8*t,98+8*t)],(242,107,94,round(alpha*.5)),s,outline=(242,107,94,alpha),width=3)
        elif name=='spawn-marker':
            d.ellipse((28*s,59*s,100*s,92*s),outline=(255,200,87,alpha),width=3*s);poly(d,[(55,25),(73,25),(73,47),(84,47),(64,65),(44,47),(55,47)],(255,200,87,alpha),s,outline=(255,200,87,alpha),width=1)
        elif name=='route-unlock':
            for j in range(3):d.arc(((20+j*9)*s,(30-j*7-t*18)*s,(108-j*9)*s,(104-j*7-t*18)*s),180,360,fill=(24,169,153,alpha),width=4*s)
        elif 'ring' in name or 'pulse' in name:
            radius=17+36*t;d.ellipse(((64-radius)*s,(64-radius*.45)*s,(64+radius)*s,(64+radius*.45)*s),outline=rgba,width=max(1,round(5*(1-t)+1))*s)
        elif 'trail' in name:
            for j in range(4):d.rounded_rectangle(((12+j*7)*s,(37+j*12)*s,(75+t*35)*s,(41+j*12)*s),2*s,fill=rgba)
        else:
            for j in range(7):
                a=j*math.tau/7;r=13+34*t;x=64+math.cos(a)*r;y=64+math.sin(a)*r;poly(d,star(x,y,7*(1-t*.6),4),rgba,s,outline=rgba,width=1)
    from PIL import ImageColor
    frames.append((f'{name}/{frame+1:02}',native(128,draw)))
 pack(item['key'],frames)
(OUT/'screens/wordmark.svg').write_text('<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="300" viewBox="0 0 1000 300"><rect x="12" y="12" width="976" height="276" rx="60" fill="#fff4db" stroke="#183c48" stroke-width="10"/><path d="M55 230L100 70l80 40-45 160Z" fill="#18a999"/><text x="540" y="128" text-anchor="middle" font-family="Baloo 2,Arial,sans-serif" font-size="89" font-weight="700" fill="#183c48">CUỘC ĐUA</text><text x="540" y="240" text-anchor="middle" font-family="Baloo 2,Arial,sans-serif" font-size="97" font-weight="700" fill="#5964d8">GIÀNH KHÁCH</text></svg>',encoding='utf-8')
print('Packed environment, parcel/customers, native UI and10 FX atlases; exported4 backdrops.')
sys.path.insert(0,str(ROOT/'work/asset-python'))
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
font=TTFont(OUT/'fonts/baloo2-bold-vi.woff2');glyphs=font.getGlyphSet();cmap=font.getBestCmap();paths=[]
for text,baseline,color in [('CUỘC ĐUA',132,INK),('GIÀNH KHÁCH',244,VIOLET)]:
    advances=[font['hmtx'].metrics[cmap[ord(c)]][0] for c in text];scale=min(.1,790/sum(advances));cursor=560-sum(advances)*scale/2
    for char,advance in zip(text,advances):
        pen=SVGPathPen(glyphs);glyphs[cmap[ord(char)]].draw(pen);path=pen.getCommands()
        if path:paths.append(f'<path d="{path}" transform="translate({cursor:.3f},{baseline}) scale({scale:.6f},-{scale:.6f})" fill="{color}"/>')
        cursor+=advance*scale
(OUT/'screens/wordmark.svg').write_text('<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="300" viewBox="0 0 1000 300" role="img" aria-label="Cuộc đua giành khách"><rect x="12" y="12" width="976" height="276" rx="60" fill="#fff4db" stroke="#183c48" stroke-width="10"/><path d="M55 230L100 70l80 40-45 160Z" fill="#18a999"/>'+''.join(paths)+'</svg>',encoding='utf-8')
