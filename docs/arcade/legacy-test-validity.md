# Legacy landing focus test validity audit

Independent audit, 27 October 2026. Scope: the first landing accessibility test in `tests/e2e/acceptance.spec.ts`; no arcade acceptance assertion or production code was changed.

## Decision

The failure is a technically invalid readiness assumption in the legacy test, rather than a changed focus behavior in the inspected legacy production path. Add exactly one condition-based readiness assertion before the existing focus action:

```diff
   await assertNoOverflow(page);
+  await expect(codeInput(page)).toBeEnabled();
   await codeInput(page).focus();
   await expect(codeInput(page)).toBeFocused();
   await page.keyboard.press('Tab');
```

The existing visible-form, 360px overflow, actual focus, and keyboard Tab assertions remain unchanged. There is no fixed sleep, retry around failed focus, timeout increase, deleted assertion, or production workaround.

## Evidence

- Before this correction, `tests/e2e/acceptance.spec.ts` and `components/game/JoinScreen.tsx` were identical to baseline `b7d0ad9`. Git blob identities matched: test `9a3c4a9304fa14b99162cd508a9ed373b099a2a9`, JoinScreen `79b7848de023d2a4daaaa1e501ec90e77ee8b2be`.
- `git diff b7d0ad9 -- components/game/JoinScreen.tsx app/page.tsx app/layout.tsx app/globals.css playwright.config.ts` produced no differences.
- Baseline and current JoinScreen both initialize `ready=false`, render the room-code input with `disabled={!ready}`, and set readiness in `useEffect`. Visible server-rendered form controls therefore do not yet imply an enabled, focusable input.
- The supplied failure evidence, `test-results/all-browser-final/e2e-acceptance-landing-acc-67687-t-360px-with-keyboard-focus-browser/error-context.md`, records `focus()` followed by `toBeFocused()` seeing the input disabled five times, then enabled twelve times but still inactive. A disabled input ignores the earlier focus request; enabling it later does not reissue that request.
- Installed Playwright's `node_modules/playwright-core/lib/coreBundle.js` `focus` / `_focus` path directly invokes injected `focusNode`; it does not wait for the input's enabled state. The original test asserted visibility only before requesting focus.
- The additional readiness assertion must itself pass within the existing expectation timeout. It continues to fail if hydration never enables the input and still exercises the original real focus and Tab behavior once the form is interactive.

This narrow audit does not assess startup-performance budgets or the whole arcade branch. It establishes the technical precondition needed by this test's existing keyboard-accessibility assertions.

## Test integrity hashes

SHA256 of `tests/e2e/acceptance.spec.ts`:

| Version | SHA256 |
|---|---|
| Before readiness correction | `C0E2895DEAE1EFF85D93B42FA0FC8439C0656AFD169C9B8291519F7B79FB2094` |
| After readiness correction | `E20AE3428E53443900F63C7C9D28DBB39F2FDB3E9D85B8E66AF4323A5742BB4F` |

## Exact verification

Working directory: `E:\MLN122\.worktrees\cuoc-dua-gianh-khach`. Local browser access used accepted `require_escalated` execution. Only this one test ran; no broad suite or app edit was performed while the parent gameplay test was active.

```powershell
$env:ACCEPTANCE_BASE_URL='http://127.0.0.1:5189'
$env:ACCEPTANCE_REPORT_FILE='test-results/legacy-landing-validity.json'
$env:ACCEPTANCE_ARTIFACT_DIR='test-results/legacy-landing-validity'
& 'C:\Users\DINH LOC\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' node_modules/@playwright/test/cli.js test tests/e2e/acceptance.spec.ts --project=browser --grep 'landing: accessible Vietnamese room form works at 360px with keyboard focus'
```

Result: **exit 0, `1 passed (56.7s)`**. Chrome reported the test body passing in 3.9s; completion and exit status were awaited before recording success. JSON evidence is `test-results/legacy-landing-validity.json`.

An initial grep with beginning/end anchors selected no tests because Playwright matches the fully qualified title; that attempt is excluded from verification. The command above selected exactly one test.
