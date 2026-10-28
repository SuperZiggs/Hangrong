import { expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';

it('preserves the existing arcade engine, shared rules, and tracked art from canonical baseline 8637fa5', () => {
  const result = spawnSync('git', ['diff', '--name-only', '8637fa5', '--', 'game/arcade', 'shared/arcade', 'public/arcade/assets', 'assets/arcade'], { encoding: 'utf8', windowsHide: true });
  expect(result.status, result.stderr).toBe(0);
  expect(result.stdout.trim(), 'Arcade core/art changes require a separately authorized contract change.').toBe('');
});
