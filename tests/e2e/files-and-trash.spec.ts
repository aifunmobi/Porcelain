import { test, expect } from '@playwright/test';
import { freshDesktop, openApp, expectNoErrors } from './helpers';

const grid = (page: import('@playwright/test').Page, name: string) =>
  page.locator(`.file-manager__grid-item:has-text("${name}")`);

test.describe('files and trash', () => {
  test('creates, renames and cancels a rename with Escape', async ({ page }) => {
    await freshDesktop(page);
    await openApp(page, 'Files');
    await page.dblclick('.file-manager__grid-item:has-text("Documents")');
    await page.click('button:has-text("New Folder")');
    await expect(grid(page, 'New Folder')).toBeVisible();
    await grid(page, 'New Folder').click();
    await page.keyboard.press('F2');
    await page.locator('.file-manager__rename-input').fill('Projects');
    await page.keyboard.press('Enter');
    await expect(grid(page, 'Projects')).toBeVisible();
    await grid(page, 'Projects').click();
    await page.keyboard.press('F2');
    await page.locator('.file-manager__rename-input').fill('Abandoned');
    await page.keyboard.press('Escape');
    await expect(grid(page, 'Projects')).toBeVisible();
    await expect(grid(page, 'Abandoned')).toHaveCount(0);
  });

  test('a file trashed from Files can be put back from the Trash app', async ({ page }) => {
    const errors = await freshDesktop(page);
    await openApp(page, 'Files');
    await page.dblclick('.file-manager__grid-item:has-text("Documents")');
    await grid(page, 'Welcome.txt').click({ button: 'right' });
    await page.click('.file-manager__context-menu button:has-text("Move to Trash")');
    await expect(grid(page, 'Welcome.txt')).toHaveCount(0);

    await openApp(page, 'Trash');
    const row = page.locator('.trash__item:has-text("Welcome.txt")');
    await expect(row).toBeVisible();
    await expect(row).toContainText('from Documents');
    await row.click({ button: 'right' });
    await page.click('.trash__context-menu-item:has-text("Put Back")');
    await expect(page.locator('.trash__empty')).toBeVisible();

    await page.click('button.dock__item[aria-label="Files"]');
    await expect(grid(page, 'Welcome.txt')).toBeVisible();
    expectNoErrors(errors);
  });

  test('Delete Immediately and Empty Trash remove the file for good', async ({ page }) => {
    await freshDesktop(page);
    await openApp(page, 'Files');
    await page.dblclick('.file-manager__grid-item:has-text("Documents")');
    await grid(page, 'Welcome.txt').click({ button: 'right' });
    await page.click('.file-manager__context-menu button:has-text("Move to Trash")');
    await openApp(page, 'Trash');
    await page.click('.trash__empty-btn:has-text("Empty Trash")');
    await page.click('.trash__empty-btn--danger');
    await expect(page.locator('.trash__empty')).toBeVisible();
    const gone = await page.evaluate(() => {
      const state = JSON.parse(localStorage.getItem('porcelain-filesystem')!).state;
      return !Object.values(state.files as Record<string, { name: string }>).some((f) => f.name === 'Welcome.txt');
    });
    expect(gone).toBe(true);
  });

  test('a desktop shortcut moved to the Trash comes back with Put Back', async ({ page }) => {
    await freshDesktop(page);
    const notes = page.locator('.desktop__icon:has-text("Notes")');
    await notes.click({ button: 'right' });
    await page.click('.desktop__context-menu-item:has-text("Move to Trash")');
    await expect(page.locator('.desktop__icon')).toHaveCount(4);
    await openApp(page, 'Trash');
    await page.locator('.trash__item:has-text("Notes")').dblclick();
    await expect(page.locator('.desktop__icon')).toHaveCount(5);
  });

  test('cut and paste into the same folder leaves the file alone', async ({ page }) => {
    await freshDesktop(page);
    await openApp(page, 'Files');
    await page.dblclick('.file-manager__grid-item:has-text("Documents")');
    await grid(page, 'Welcome.txt').click();
    await page.keyboard.press('Meta+x');
    await page.keyboard.press('Meta+v');
    await expect(grid(page, 'Welcome.txt')).toHaveCount(1);
    await expect(grid(page, 'copy')).toHaveCount(0);
  });
});
