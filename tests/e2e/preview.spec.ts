import { test, expect } from '@playwright/test';
import { freshDesktop, openApp } from './helpers';

test.describe('preview', () => {
  test('markdown renders without executing injected attributes or javascript links', async ({ page }) => {
    await freshDesktop(page);
    await openApp(page, 'Terminal');
    await page.locator('.terminal__input').fill('touch Documents/notes.md');
    await page.keyboard.press('Enter');
    await page.evaluate(() => {
      const key = 'porcelain-filesystem';
      const data = JSON.parse(localStorage.getItem(key)!);
      for (const f of Object.values(data.state.files as Record<string, { path: string; content?: string }>)) {
        if (f.path === '/Documents/notes.md') {
          f.content = '# Title\n\n![a"onerror="document.title=\'pwned\'](x)\n\n[go](javascript:alert(1)) and `**not bold**`\n\n- one\n- two';
        }
      }
      localStorage.setItem(key, JSON.stringify(data));
    });
    await page.reload();
    await page.waitForSelector('.dock__item');
    // Files sends .md to the Text Editor, so open it through Preview's own picker.
    await openApp(page, 'Preview');
    await page.click('.preview__btn[title="Open…"]');
    await page.click('.preview__picker-item:has-text("notes.md")');
    await page.click('.preview__picker-actions button.is-primary');
    const md = page.locator('.preview__markdown');
    await expect(md).toBeVisible();
    await expect(md.locator('h1')).toHaveText('Title');
    await expect(md.locator('li')).toHaveCount(2);
    await expect(md.locator('code')).toHaveText('**not bold**');
    expect(await md.locator('[onerror]').count()).toBe(0);
    expect(await md.locator('a[href^="javascript"]').count()).toBe(0);
    expect(await page.title()).not.toBe('pwned');
  });
});
