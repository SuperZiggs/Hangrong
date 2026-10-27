from pathlib import Path
import json, shutil, sys
root=Path(__file__).resolve().parents[1];source=root/'assets/arcade'
batch=json.loads(Path(sys.argv[1]).read_text(encoding='utf-8'))
strips=json.loads((source/'strips.json').read_text(encoding='utf-8'))
for row in batch:
    direction=row['direction'];animation=row['animation']
    assert direction in ['N','E','S','W'] and animation in ['idle','run','dash','bump','celebrate']
    raw=source/'raw'/f'{animation}-{direction}.png'
    if raw.exists():
        i=2
        while raw.with_stem(raw.stem+f'-v{i}').exists():i+=1
        raw=raw.with_stem(raw.stem+f'-v{i}')
    shutil.copy2(row['path'],raw)
    entry={**row,'originPath':row['path'],'path':str(raw.relative_to(source)).replace('\\','/')}
    strips=[s for s in strips if (s['direction'],s['animation'])!=(direction,animation)];strips.append(entry)
(source/'strips.json').write_text(json.dumps(strips,ensure_ascii=False,indent=2),encoding='utf-8')
print('Recorded',len(batch),'whole-strip outputs; total',sum(s['frames'] for s in strips),'frames.')
