import { describe, it, expect } from 'vitest';
import { getCatalog, validateCatalog } from '../../server/content';
describe('ngân hàng tình huống', () => {
  it('has six missions per round, three tasks, four choices and one valid answer', () => {
    const c = getCatalog();
    expect(c).toHaveLength(18);
    for (const round of [1,2,3]) expect(c.filter(x=>x.roundIndex===round)).toHaveLength(6);
    expect(validateCatalog(c)).toEqual([]);
    for (const m of c) {
      expect(m.fictional).toBe(true);
      expect(m.context.length).toBeGreaterThan(150);
      expect(m.sourceRefs.length).toBeGreaterThan(0);
      expect(m.tasks).toHaveLength(3);
      for(const t of m.tasks) {
        expect(t.choices).toHaveLength(4);
        expect(new Set(t.choices.map(x=>x.id)).size).toBe(4);
        expect(t.choices.filter(x=>x.id===t.correctChoiceId)).toHaveLength(1);
        expect(t.explanation.length).toBeGreaterThan(25);
        expect(t.points).toBe(10);
      }
    }
  });
  it('rejects malformed question banks', () => {
    expect(validateCatalog([]).length).toBeGreaterThan(0);
  });
});
