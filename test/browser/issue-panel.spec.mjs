import { test, expect } from '@playwright/test';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const issuePanelUrl = pathToFileURL(resolve('static/issue-panel/build/index.html')).href;

test('issue panel gates local review until every sample document is checked', async ({ page }) => {
  await page.goto(issuePanelUrl);
  const reviewButton = page.getByRole('button', { name: 'Mark preview reviewed' });
  await expect(reviewButton).toBeDisabled();

  await page.getByRole('checkbox', { name: 'Mark Purchase order checked in sample review' }).check();
  await page.getByRole('checkbox', { name: 'Mark Delivery confirmation checked in sample review' }).check();
  await expect(reviewButton).toBeDisabled();
  await page.getByRole('checkbox', { name: 'Mark Goods received note checked in sample review' }).check();

  await expect(page.locator('#evidence-progress')).toHaveText('3 of 3 documents checked');
  await expect(reviewButton).toBeEnabled();
  await reviewButton.click();
  await expect(page.locator('#review-message')).toContainText('no Jira issue or Seepsight record was changed');
  await expect(page.locator('#review-button')).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Undo local review' }).click();
  await expect(page.locator('#review-button')).toHaveAttribute('aria-pressed', 'false');
});

test('issue panel stacks review controls on a narrow mobile viewport', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto(issuePanelUrl);
  await expect(page.locator('.evidence')).toBeVisible();
  const dimensions = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    content: document.documentElement.scrollWidth
  }));
  expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport);
});
