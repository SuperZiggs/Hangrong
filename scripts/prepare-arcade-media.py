"""Export the licensed source fonts and sound cues selected for the game."""
from pathlib import Path
import sys,json,zipfile,subprocess,shutil,hashlib
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'work/asset-python'))
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
import imageio_ffmpeg
raw=ROOT/'assets/arcade/raw';out=ROOT/'public/arcade/assets';licenses=ROOT/'assets/arcade/licenses';licenses.mkdir(parents=True,exist_ok=True)
(out/'fonts').mkdir(parents=True,exist_ok=True)
for name,target,weight in [('baloo2','baloo2-bold-vi.woff2',700),('bevietnampro','be-vietnam-pro-regular-vi.woff2',400)]:
    font=TTFont(raw/(name+'.ttf'))
    if 'fvar' in font:font=instantiateVariableFont(font,{'wght':weight},inplace=True)
    cmap=font.getBestCmap()
    assert all(ord(c) in cmap for c in 'CuộcđuaGiànhkháchĐangkếtnốilạiPhínềntảng')
    font.flavor='woff2';font.save(out/'fonts'/target);shutil.copy2(raw/(name+'-OFL.txt'),licenses/(name+'-OFL.txt'))
mapping={
'ui-confirm':('interface','Audio/click_001.ogg'), 'ui-back':('interface','Audio/back_001.ogg'),
'countdown':('interface','Audio/click_004.ogg'),'start':('interface','Audio/confirmation_001.ogg'),
'pickup':('interface','Audio/drop_001.ogg'),'delivery':('interface','Audio/confirmation_002.ogg'),
'coin':('interface','Audio/bong_001.ogg'),'dash':('impact','Audio/footstep_carpet_001.ogg'),
'bump':('impact','Audio/impactSoft_medium_000.ogg'),'footstep':('impact','Audio/footstep_concrete_000.ogg'),
'error':('interface','Audio/error_001.ogg'),'gate-open':('interface','Audio/confirmation_003.ogg'),
'promo':('interface','Audio/confirmation_004.ogg'),'event-warning':('interface','Audio/error_003.ogg'),
'result-win':('interface','Audio/confirmation_002.ogg'),'result-other':('interface','Audio/confirmation_001.ogg')}
ffmpeg=imageio_ffmpeg.get_ffmpeg_exe();selected={};(out/'audio/sfx').mkdir(parents=True,exist_ok=True)
for name,(pack,original) in mapping.items():
    with zipfile.ZipFile(raw/(pack+'.zip')) as z:
        if original not in z.namelist():
            raise RuntimeError('Chosen source missing: '+original)
        src=raw/('selected-'+name+'.ogg');src.write_bytes(z.read(original))
        for license_name in [n for n in z.namelist() if 'license' in n.lower() and n.endswith('.txt')]:
            (licenses/(pack+'-'+Path(license_name).name)).write_bytes(z.read(license_name))
    for ext in ['ogg','mp3']:
        target=out/f'audio/sfx/{name}.{ext}'
        subprocess.run([ffmpeg,'-hide_banner','-loglevel','error','-y','-i',str(src),'-af','loudnorm=I=-20:TP=-2:LRA=8','-ar','44100','-ac','1',str(target)],check=True)
    selected['audio.'+name]={'pack':pack,'originalFile':original,'source':f'https://kenney.nl/assets/{"impact-sounds" if pack=="impact" else "interface-sounds"}','license':'CC0-1.0'}
(out/'audio/music').mkdir(parents=True,exist_ok=True)
for name,source in [('menu-loop','menu-source.ogg'),('city-loop','city-source.mp3')]:
    for ext in ['ogg','mp3']:
        subprocess.run([ffmpeg,'-hide_banner','-loglevel','error','-y','-i',str(raw/source),'-af','loudnorm=I=-22:TP=-2:LRA=8','-ar','44100','-ac','2',str(out/f'audio/music/{name}.{ext}')],check=True)
(ROOT/'assets/arcade/media-selected.json').write_text(json.dumps(selected,indent=2),encoding='utf-8')
(out/'licenses').mkdir(parents=True,exist_ok=True)
for notice in licenses.iterdir():
    if notice.is_file():shutil.copy2(notice,out/'licenses'/notice.name)
print('Exported2 Vietnamese fonts,16 SFX cues in OGG/MP3 and2 music loops.')
