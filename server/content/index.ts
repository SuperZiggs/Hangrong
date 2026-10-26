import { BANK } from './data';
import type { Mission } from './types';
export type { Choice, Task, Mission } from './types';
export function getCatalog(): Mission[] { return structuredClone(BANK); }
export function validateCatalog(catalog: Mission[]): string[] {
  const errors: string[] = [];
  if(new Set(catalog.map(m=>m.id)).size!==catalog.length) errors.push('Trùng mã tình huống');
  for(const r of [1,2,3]) if(catalog.filter(m=>m.roundIndex===r).length<6)errors.push(`Vòng ${r} thiếu tình huống`);
  for(const m of catalog){
    if(!m.fictional||!m.context||!m.sourceRefs.length||m.tasks.length!==3)errors.push(`Nội dung thiếu: ${m.id}`);
    for(const t of m.tasks)if(t.choices.length!==4||new Set(t.choices.map(c=>c.id)).size!==4||t.choices.filter(c=>c.id===t.correctChoiceId).length!==1||!t.explanation||t.points!==10)errors.push(`Nhiệm vụ lỗi: ${t.id}`);
  }
  return errors;
}
