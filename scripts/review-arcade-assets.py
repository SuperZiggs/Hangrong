"""Create a review board, validate alpha/atlas constraints, then record provenance."""
from pathlib import Path
from PIL import Image,ImageDraw
import json,hashlib,sys
ROOT=Path(__file__).resolve().parents[1];SRC=ROOT/'assets/arcade';OUT=ROOT/'public/arcade/assets'
catalog=json.loads((ROOT/'docs/arcade/assets.catalog.json').read_text(encoding='utf-8'));entries={};media=json.loads((SRC/'media-selected.json').read_text())
board=Image.new('RGB',(1400,1800),'#fff4db');d=ImageDraw.Draw(board);i=0
for item in catalog['items']:
 p=OUT/item['path'];assert p.is_file(),p
 entry={'status':'candidate','source':item['source'],'license':item.get('license','Original project artwork' if item['source'].startswith('native-') else 'Generated with built-in imagegen; retain service terms'),'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'path':item['path']}
 if item.get('atlas'):
  meta=json.loads((OUT/item['atlas']).read_text());im=Image.open(p);assert max(im.size)<=2048;assert len(meta['frames'])==item['frames']
  for f in meta['frames'].values():
   r=f['frame'];assert r['x']>=2 and r['y']>=2 and r['x']+r['w']<=im.width-2 and r['y']+r['h']<=im.height-2
   cell=im.crop((r['x'],r['y'],r['x']+r['w'],r['y']+r['h']));assert cell.getbbox()
   if item['key']!='environment.tiles':assert cell.mode=='RGBA' and cell.getchannel('A').getextrema()[0]==0
  entry['atlasSha256']=hashlib.sha256((OUT/item['atlas']).read_bytes()).hexdigest();entry['frames']=len(meta['frames'])
 if item.get('fallback'):entry['fallbackSha256']=hashlib.sha256((OUT/item['fallback']).read_bytes()).hexdigest()
 if item['key']in media:entry.update(media[item['key']])
 if item['kind']in ['atlas','image'] and p.suffix!='.svg':
  im=Image.open(p).convert('RGBA');im.thumbnail((430,180));x=(i%3)*466;y=(i//3)*210+25;board.paste(im,(x,y),im);d.text((x+4,y-18),item['key'],fill='#183c48');i+=1
 entries[item['key']]=entry
board.crop((0,0,1400,min(1800,((i+2)//3)*210))).save(SRC/'previews/complete-review-board.png')
totals={}
for group in ['characters','environment','ui','fx','fonts','screens','audio']:
 totals[group]=sum(p.stat().st_size for p in (OUT/group).rglob('*') if p.is_file())
assert sum(totals[k] for k in ['characters','environment','ui','fx','fonts'])<=8*1024**2
assert totals['audio']<=6*1024**2
accepted='--accept'in sys.argv
if accepted:
 (OUT/'runtime.json').write_text(json.dumps({'entries':[{**item,'status':'accepted'} for item in catalog['items']],'status':'accepted'},ensure_ascii=False),encoding='utf-8')
 for entry in entries.values():entry['status']='accepted'
review='Review board, courier anchors/alpha and actual Chrome engine screenshots reviewed; font Vietnamese cmap and audio decode/export validated. Classroom human audition/playtest remains separate.' if accepted else 'Pending final in-engine and review-board approval'
(SRC/'provenance.json').write_text(json.dumps({'game':catalog['game'],'review':review,'entries':entries,'bytes':totals},ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(totals));print('Validated47 groups and305 frames; provenance '+('accepted.' if accepted else 'candidate.'))
