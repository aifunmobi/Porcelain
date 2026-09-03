import { expect, type Page } from '@playwright/test';

/** Load the desktop with a clean slate: no persisted settings, files or trash. */
export const freshDesktop = async (page: Page) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`console: ${m.text()}`);
  });
  await page.goto('/');
  await page.evaluate(async () => {
    localStorage.clear();
    const dbs = await indexedDB.databases?.();
    await Promise.all(
      (dbs ?? []).map(
        (db) =>
          new Promise<void>((resolve) => {
            if (!db.name) return resolve();
            const req = indexedDB.deleteDatabase(db.name);
            req.onsuccess = req.onerror = req.onblocked = () => resolve();
          })
      )
    );
  });
  await page.reload();
  await page.waitForSelector('.dock__item');
  return errors;
};

export const openApp = async (page: Page, name: string) => {
  // Trash is not in the dock; it lives on the desktop.
  if (name === 'Trash') {
    await page.locator('.desktop__icon:has-text("Trash")').dblclick();
  } else {
    await page.click(`button.dock__item[aria-label="${name}"]`);
  }
  await expect(page.locator('.window--active')).toBeVisible();
  return page.locator('.window--active');
};

/** Fire a global shortcut the way the browser reports it (Shift changes e.key). */
export const pressGlobal = (page: Page, init: KeyboardEventInit) =>
  page.evaluate((i) => window.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, ...i })), init);

export const expectNoErrors = (errors: string[]) => {
  expect(errors, errors.join('\n')).toEqual([]);
};
