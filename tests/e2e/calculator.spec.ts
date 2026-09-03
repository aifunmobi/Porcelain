import { test, expect } from '@playwright/test';
import { freshDesktop, openApp } from './helpers';

const display = (page: import('@playwright/test').Page) =>
  page.locator('.calculator').locator('div').first();

test.describe('calculator', () => {
  const press = async (page: import('@playwright/test').Page, keys: string[]) => {
    for (const k of keys) await page.click(`.calculator__key:text-is("${k}")`);
  };

  test('formats floating point results', async ({ page }) => {
    await freshDesktop(page);
    await openApp(page, 'Calculator');
    await press(page, ['0', '.', '1', '+', '0', '.', '2', '=']);
    await expect(display(page)).toHaveText(/0\.3$/);
  });

  test('a second operator replaces the first', async ({ page }) => {
    await freshDesktop(page);
    await openApp(page, 'Calculator');
    await press(page, ['5', '+', '×', '3', '=']);
    await expect(display(page)).toHaveText(/15$/);
  });

  test('= repeats the last operation', async ({ page }) => {
    await freshDesktop(page);
    await openApp(page, 'Calculator');
    await press(page, ['2', '+', '3', '=', '=', '=']);
    await expect(display(page)).toHaveText(/11$/);
  });

  test('division by zero shows Error and recovers', async ({ page }) => {
    await freshDesktop(page);
    await openApp(page, 'Calculator');
    await press(page, ['1', '÷', '0', '=']);
    await expect(display(page)).toHaveText(/Error/);
    await press(page, ['AC', '7']);
    await expect(display(page)).toHaveText(/7$/);
  });

  test('accepts keyboard input', async ({ page }) => {
    await freshDesktop(page);
    await openApp(page, 'Calculator');
    await page.locator('.calculator').focus();
    await page.keyboard.type('12*12');
    await page.keyboard.press('Enter');
    await expect(display(page)).toHaveText(/144$/);
  });
});
