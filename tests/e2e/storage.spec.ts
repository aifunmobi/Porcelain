import { test, expect } from '@playwright/test';
import { freshDesktop, openApp, pressGlobal, expectNoErrors } from './helpers';

test.describe('browser storage', () => {
  test('a screenshot is written to Pictures with its bytes in IndexedDB, not localStorage', async ({ page }) => {
    const errors = await freshDesktop(page);
    await pressGlobal(page, { key: '#', code: 'Digit3', metaKey: true, shiftKey: true });
    await expect(page.locator('.screenshot')).toBeVisible();
    await expect(page.locator('.screenshot__status').filter({ hasText: /Saved to/ })).toBeVisible({ timeout: 15_000 });

    const stored = await page.evaluate(async () => {
      const state = JSON.parse(localStorage.getItem('porcelain-filesystem')!).state;
      const shot = Object.values(state.files as Record<string, { path: string; content: string; size: number }>).find((f) =>
        f.path.startsWith('/Pictures/Screenshot')
      );
      const rows = await new Promise<number>((resolve) => {
        const req = indexedDB.open('porcelain-blobs');
        req.onsuccess = () => {
          const db = req.result;
          const count = db.transaction('blobs').objectStore('blobs').count();
          count.onsuccess = () => resolve(count.result);
        };
        req.onerror = () => resolve(-1);
      });
      return { content: shot?.content, size: shot?.size ?? 0, rows, localBytes: localStorage.getItem('porcelain-filesystem')!.length };
    });
    expect(stored.content).toMatch(/^idb:\/\//);
    expect(stored.size).toBeGreaterThan(10_000);
    expect(stored.rows).toBe(1);
    expect(stored.localBytes).toBeLessThan(20_000);
    expectNoErrors(errors);
  });

  test('a stored image reopens in Preview and survives a reload', async ({ page }) => {
    await freshDesktop(page);
    await pressGlobal(page, { key: '#', code: 'Digit3', metaKey: true, shiftKey: true });
    await expect(page.locator('.screenshot__status').filter({ hasText: /Saved to/ })).toBeVisible({ timeout: 15_000 });
    await page.reload();
    await page.waitForSelector('.dock__item');
    await openApp(page, 'Files');
    await page.dblclick('.file-manager__grid-item:has-text("Pictures")');
    const shot = page.locator('.file-manager__grid-item:has-text("Screenshot")');
    await expect(shot).toBeVisible();
    await expect(shot.locator('img')).toHaveJSProperty('naturalWidth', 1280);
    await shot.dblclick();
    await expect(page.locator('.preview')).toBeVisible();
    await expect(page.locator('.preview img').first()).toHaveJSProperty('naturalWidth', 1280);
  });
});
