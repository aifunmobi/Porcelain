import { test, expect } from '@playwright/test';
import { freshDesktop, openApp } from './helpers';

test.describe('text editor', () => {
  test('the rich surface is hidden in plain mode', async ({ page }) => {
    await freshDesktop(page);
    await openApp(page, 'Text Editor');
    await expect(page.locator('.text-editor__rich')).toBeHidden();
    await expect(page.locator('.text-editor__plain')).toBeVisible();
  });

  test('Rich → Plain keeps text typed before the first block', async ({ page }) => {
    await freshDesktop(page);
    await openApp(page, 'Text Editor');
    await page.click('.text-editor__btn[title="Rich text"]');
    await page.evaluate(() => {
      const r = document.querySelector('.text-editor__rich') as HTMLElement;
      r.innerHTML = 'hello<div>world</div><div><br></div><div>again</div>';
      r.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await page.click('.text-editor__btn[title="Plain text"]');
    await page.click('.text-editor__dialog button.is-primary');
    await expect(page.locator('.text-editor__plain')).toHaveValue('hello\nworld\n\nagain');
  });

  test('Enter in Find cycles matches without editing the document', async ({ page }) => {
    await freshDesktop(page);
    await openApp(page, 'Text Editor');
    await page.locator('.text-editor__plain').fill('foo bar foo');
    await page.keyboard.press('Meta+f');
    const find = page.locator('.text-editor__find-input').first();
    await find.fill('foo');
    await expect(page.locator('.text-editor__find-count')).toHaveText('1 of 2');
    await find.press('Enter');
    await find.press('Enter');
    await expect(page.locator('.text-editor__find-count')).toHaveText('1 of 2');
    await expect(page.locator('.text-editor__plain')).toHaveValue('foo bar foo');
  });

  test('Save As with a relative name lands in Documents and reopens', async ({ page }) => {
    await freshDesktop(page);
    await openApp(page, 'Text Editor');
    await page.locator('.text-editor__plain').fill('kept');
    await page.keyboard.press('Meta+Shift+s');
    await page.locator('.text-editor__dialog-input').fill('note.txt');
    await page.keyboard.press('Enter');
    await expect(page.locator('.text-editor__path')).toHaveText('/Documents/note.txt');
    await expect(page.locator('.text-editor__status-msg')).toHaveText('Saved note.txt');
  });

  test('a mode switch does not autosave over the original file', async ({ page }) => {
    await freshDesktop(page);
    await openApp(page, 'Text Editor');
    await page.locator('.text-editor__plain').fill('plain body');
    await page.keyboard.press('Meta+Shift+s');
    await page.locator('.text-editor__dialog-input').fill('/Documents/plain.txt');
    await page.keyboard.press('Enter');
    await page.click('.text-editor__btn[title="Rich text"]');
    await page.waitForTimeout(3500);
    const content = await page.evaluate(() => {
      const state = JSON.parse(localStorage.getItem('porcelain-filesystem')!).state;
      const node = Object.values(state.files as Record<string, { path: string; content: string }>).find(
        (f) => f.path === '/Documents/plain.txt'
      );
      return node?.content;
    });
    expect(content).toBe('plain body');
  });

  test('opened HTML is sanitised before it reaches the editor', async ({ page }) => {
    await freshDesktop(page);
    await openApp(page, 'Terminal');
    await page.locator('.terminal__input').fill('touch Documents/evil.html');
    await page.keyboard.press('Enter');
    await page.evaluate(() => {
      const key = 'porcelain-filesystem';
      const data = JSON.parse(localStorage.getItem(key)!);
      for (const f of Object.values(data.state.files as Record<string, { path: string; content?: string }>)) {
        if (f.path === '/Documents/evil.html') f.content = '<p>ok</p><img src=x onerror="document.title=\'pwned\'"><a href="javascript:alert(1)">x</a>';
      }
      localStorage.setItem(key, JSON.stringify(data));
    });
    await page.reload();
    await page.waitForSelector('.dock__item');
    await openApp(page, 'Files');
    await page.dblclick('.file-manager__grid-item:has-text("Documents")');
    await page.dblclick('.file-manager__grid-item:has-text("evil.html")');
    await expect(page.locator('.text-editor__rich')).toBeVisible();
    const html = await page.locator('.text-editor__rich').innerHTML();
    expect(html).not.toContain('onerror');
    expect(html).not.toContain('javascript:');
    expect(html).toContain('<p>ok</p>');
    expect(await page.title()).not.toBe('pwned');
  });
});
