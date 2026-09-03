import { test, expect } from '@playwright/test';
import { freshDesktop, openApp } from './helpers';

const run = async (page: import('@playwright/test').Page, cmd: string) => {
  await page.locator('.terminal__input').fill(cmd);
  await page.keyboard.press('Enter');
};

test.describe('terminal', () => {
  test('resolves relative paths, trailing slashes and ~', async ({ page }) => {
    await freshDesktop(page);
    await openApp(page, 'Terminal');
    await run(page, 'cd Documents/');
    await expect(page.locator('.terminal__prompt')).toHaveText('/Documents $');
    await run(page, 'cat ../Documents/./Welcome.txt');
    await expect(page.locator('.terminal__output')).toContainText('Welcome to Porcelain OS!');
    await run(page, 'cd ~');
    await expect(page.locator('.terminal__prompt')).toHaveText('/ $');
  });

  test('ll and la aliases work', async ({ page }) => {
    await freshDesktop(page);
    await openApp(page, 'Terminal');
    await run(page, 'll Documents');
    await expect(page.locator('.terminal__line--output').last()).toContainText('Welcome.txt');
    await expect(page.locator('.terminal__output')).not.toContainText('No such directory');
  });

  test('mkdir a/b nests and refuses duplicates', async ({ page }) => {
    await freshDesktop(page);
    await openApp(page, 'Terminal');
    await run(page, 'mkdir a');
    await run(page, 'mkdir a/b');
    await run(page, 'tree a');
    await expect(page.locator('.terminal__line--output').last()).toContainText('└── 📁 b');
    await run(page, 'mkdir a');
    await expect(page.locator('.terminal__line--error').last()).toContainText('File exists');
  });

  test('tab completion of a folder then enter works', async ({ page }) => {
    await freshDesktop(page);
    await openApp(page, 'Terminal');
    await page.locator('.terminal__input').fill('cd Doc');
    await page.keyboard.press('Tab');
    await expect(page.locator('.terminal__input')).toHaveValue('cd Documents/');
    await page.keyboard.press('Enter');
    await expect(page.locator('.terminal__prompt')).toHaveText('/Documents $');
  });
});
