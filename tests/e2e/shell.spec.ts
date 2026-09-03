import { test, expect } from '@playwright/test';
import { freshDesktop, openApp, pressGlobal, expectNoErrors } from './helpers';

test.describe('shell', () => {
  test('boots with the dock, menu bar and desktop icons, no console errors', async ({ page }) => {
    const errors = await freshDesktop(page);
    await expect(page.locator('.menubar')).toBeVisible();
    await expect(page.locator('.dock__item')).toHaveCount(17);
    await expect(page.locator('.desktop__icon')).toHaveCount(5);
    expectNoErrors(errors);
  });

  test('maximize fills the strip between menu bar and dock, restore returns the old size', async ({ page }) => {
    await freshDesktop(page);
    const win = await openApp(page, 'Text Editor');
    await win.locator('.window__control--maximize').click();
    const geo = await page.evaluate(() => {
      const r = document.querySelector('.window--active')!.getBoundingClientRect();
      const m = document.querySelector('.window-manager')!.getBoundingClientRect();
      return { top: r.top - m.top, bottom: m.bottom - r.bottom, left: r.left, right: m.right - r.right };
    });
    expect(geo).toEqual({ top: 0, bottom: 0, left: 0, right: 0 });
    await win.locator('.window__control--maximize').click();
    const box = await win.boundingBox();
    expect(Math.round(box!.width)).toBe(700);
    expect(Math.round(box!.height)).toBe(500);
  });

  test('a minimized window keeps its app mounted', async ({ page }) => {
    await freshDesktop(page);
    const win = await openApp(page, 'Text Editor');
    await win.locator('.text-editor__plain').fill('still here');
    await win.locator('.window__control--minimize').click();
    await expect(page.locator('.text-editor')).toHaveCount(1);
    await expect(page.locator('.text-editor')).toBeHidden();
    await page.click('button.dock__item[aria-label="Text Editor"]');
    await expect(page.locator('.text-editor__plain')).toHaveValue('still here');
  });

  test('⌘K opens Spotlight, which opens apps', async ({ page }) => {
    await freshDesktop(page);
    await page.keyboard.press('Meta+k');
    await page.locator('.spotlight__input').fill('calc');
    await expect(page.locator('.spotlight__result-name').first()).toHaveText('Calculator');
    await page.keyboard.press('Enter');
    await expect(page.locator('.calculator')).toBeVisible();
  });

  test('⌘⇧3 opens Screenshot even though Shift turns the key into #', async ({ page }) => {
    await freshDesktop(page);
    await pressGlobal(page, { key: '#', code: 'Digit3', metaKey: true, shiftKey: true });
    await expect(page.locator('.screenshot')).toBeVisible();
  });

  test('⌘W closes the active window', async ({ page }) => {
    await freshDesktop(page);
    await openApp(page, 'Calculator');
    await pressGlobal(page, { key: 'w', code: 'KeyW', metaKey: true });
    await expect(page.locator('.calculator')).toHaveCount(0);
  });

  test('settings survive a reload', async ({ page }) => {
    await freshDesktop(page);
    await openApp(page, 'Settings');
    await page.click('.settings__nav-item:has-text("Display")');
    await page.click('.settings__theme-option:has-text("Dark")');
    await expect(page.locator('html')).toHaveClass(/dark/);
    await page.reload();
    await expect(page.locator('html')).toHaveClass(/dark/);
  });
});
