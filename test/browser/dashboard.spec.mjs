import { test, expect } from '@playwright/test';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const dashboardUrl = pathToFileURL(resolve('static/dashboard/build/index.html')).href;

test.beforeEach(async ({ page }) => {
  page.on('pageerror', (error) => console.log('BROWSER PAGE ERROR:', error.message));
  page.on('console', (message) => { if (message.type() === 'error') console.log('BROWSER CONSOLE ERROR:', message.text()); });
  await page.goto(dashboardUrl);
});

test('dashboard shows the resolved Jira project and Forge connection state', async ({ page }) => {
  await expect(page.locator('#connection-label')).toHaveAttribute('data-state', 'connected');
  await expect(page.locator('#connection-label')).toContainText('Forge connected');
  await expect(page.locator('#project-chip')).toHaveText('Jira project · DEMO');
});

test('dashboard reports a failed context refresh and re-enables the control', async ({ page }) => {
  const url = new URL(dashboardUrl);
  url.searchParams.set('dashboardState', 'context-failure');
  await page.goto(url.href);
  await expect(page.locator('#connection-label')).toHaveAttribute('data-state', 'warning');
  const refresh = page.getByRole('button', { name: 'Refresh Jira project context' });
  await refresh.click();
  await expect(page.locator('#toast')).toContainText('Could not refresh Jira context');
  await expect(refresh).toBeEnabled();
  await expect(refresh).not.toHaveAttribute('aria-busy', 'true');
});

test('dashboard does not claim the Forge integration is ready when health is unavailable', async ({ page }) => {
  const url = new URL(dashboardUrl);
  url.searchParams.set('dashboardState', 'health-warning');
  await page.goto(url.href);
  await expect(page.locator('#connection-label')).toHaveAttribute('data-state', 'warning');
  await expect(page.locator('#connection-label')).toHaveText('Forge status unavailable');
});


test('dashboard handles an unexpected Forge health failure without exposing internal errors', async ({ page }) => {
  const url = new URL(dashboardUrl);
  url.searchParams.set('dashboardState', 'health-failure');
  await page.goto(url.href);
  await expect(page.locator('#connection-label')).toHaveAttribute('data-state', 'warning');
  await expect(page.locator('#connection-label')).toHaveText('Open inside Jira to connect');
  await expect(page.locator('body')).not.toContainText('SIMULATED_HEALTH_FAILURE_SECRET');
});

test('dashboard handles a project resolver failure without exposing internal errors', async ({ page }) => {
  const url = new URL(dashboardUrl);
  url.searchParams.set('dashboardState', 'project-failure');
  await page.goto(url.href);
  await expect(page.locator('#connection-label')).toHaveAttribute('data-state', 'warning');
  await expect(page.locator('#connection-label')).toHaveText('Open inside Jira to connect');
  await expect(page.locator('#project-chip')).toHaveText('Jira project · DEMO');
  await expect(page.locator('body')).not.toContainText('SIMULATED_PROJECT_FAILURE_SECRET');
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
  await expect(dialog).toContainText('1,000 units');
  await expect(dialog).toContainText('800 units');
  await expect(dialog).toContainText('200 units');
  await expect(dialog).toContainText('200 × ₦24,000 = ₦4,800,000');
  await expect(dialog).toContainText('must be verified against the signed purchase order');
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
