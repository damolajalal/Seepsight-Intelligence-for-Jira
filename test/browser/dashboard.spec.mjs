import { test, expect } from '@playwright/test';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const dashboardUrl = pathToFileURL(resolve('static/dashboard/build/index.html')).href;

test.beforeEach(async ({ page }) => {
  await page.goto(dashboardUrl);
});

test('dashboard navigation renders the investigations table and filters records', async ({ page }) => {
  await page.locator('.nav-item[data-view="investigations"]').click();
  await expect(page.locator('#page-title')).toHaveText('Investigations');
  const search = page.getByRole('searchbox', { name: 'Filter Investigations' });
  await search.fill('Northstar');
  await expect(page.locator('tbody tr:visible')).toHaveCount(1);
  await expect(page.locator('.result-count')).toHaveText('1 of 4 records');
  await search.fill('no matching supplier');
  await expect(page.locator('.empty-state')).toBeVisible();
  await expect(page.locator('.result-count')).toHaveText('0 of 4 records');
});

test('reviewers can follow a related record without closing the details dialog', async ({ page }) => {
  await page.locator('.nav-item[data-view="investigations"]').click();
  await page.getByRole('button', { name: 'View details for INV-024' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(page.locator('#record-dialog-title')).toHaveText('Delivery quantity mismatch');
  await page.locator('#record-dialog-related [data-related-reference="FND-108"]').click();
  await expect(dialog).toBeVisible();
  await expect(page.locator('#record-dialog-title')).toHaveText('Delivered quantity below purchase order');
  await page.getByRole('button', { name: 'Close details' }).click();
  await expect(dialog).not.toBeVisible();
  await expect(page.locator('.nav-item[data-view="findings"]')).toBeFocused();
});

test('sample action completion is local and visibly updates its row', async ({ page }) => {
  await page.locator('.nav-item[data-view="actions"]').click();
  const row = page.locator('tbody tr').filter({ hasText: 'ACT-032' });
  await row.getByRole('button', { name: 'Mark complete' }).click();
  await expect(row).toContainText('Completed locally');
  await expect(row.getByRole('button', { name: 'Mark complete' })).toHaveCount(0);
  await expect(page.locator('#toast')).toContainText('preview only');
});

test('dashboard remains within a narrow mobile viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('.nav-item[data-view="suppliers"]').click();
  await expect(page.locator('#page-title')).toHaveText('Suppliers');
  const dimensions = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    content: document.documentElement.scrollWidth
  }));
  expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport);
});
