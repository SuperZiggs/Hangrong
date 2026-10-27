import {readFileSync,existsSync} from 'node:fs';
import {join} from 'node:path';
import {describe,it,expect} from 'vitest';
const catalog=JSON.parse(readFileSync('docs/arcade/assets.catalog.json','utf8'));
describe('complete shipped arcade asset catalogue',()=>{
 it('distributes font license notices beside the public font payload',()=>{for(const name of ['baloo2-OFL.txt','bevietnampro-OFL.txt']){const path=join('public/arcade/assets/licenses',name);expect(existsSync(path),`Missing distributed notice${name}`).toBe(true);expect(readFileSync(path,'utf8')).toMatch(/SIL OPEN FONT LICENSE/i);}});
 for(const item of catalog.items)it(`ships ${item.key} with required files and frame count`,()=>{
  const path=join('public/arcade/assets',item.path);expect(existsSync(path),`Missing production asset ${item.key}`).toBe(true);
  expect(readFileSync(path).length).toBeGreaterThan(50);
  if(item.atlas){const atlas=JSON.parse(readFileSync(join('public/arcade/assets',item.atlas),'utf8'));expect(Object.keys(atlas.frames)).toHaveLength(item.frames);}
  if(item.fallback)expect(existsSync(join('public/arcade/assets',item.fallback))).toBe(true);
 });
 it('records source and checksum for every required group',()=>{
  expect(existsSync('assets/arcade/provenance.json'),'Missing provenance').toBe(true);
  const p=JSON.parse(readFileSync('assets/arcade/provenance.json','utf8'));
  for(const item of catalog.items){expect(p.entries[item.key]).toMatchObject({status:'accepted',source:expect.any(String),sha256:expect.stringMatching(/^[a-f0-9]{64}$/)});}
 });
});
