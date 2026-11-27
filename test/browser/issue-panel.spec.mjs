import { test, expect } from '@playwright/test';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const issuePanelUrl = pathToFileURL(resolve('static/issue-panel/build/index.html')).href;

async function openIssuePanelScenario(page, scenario) {
  const url = new URL(issuePanelUrl);
  url.searchParams.set('issueState', scenario);
  await page.goto(url.href);
}

test('issue panel saves review progress and gates completion until every sample document is checked', async ({ page }) => {
  page.on('pageerror', (error) => console.log('BROWSER PAGE ERROR:', error.message));
  page.on('console', (message) => { if (message.type() === 'error') console.log('BROWSER CONSOLE ERROR:', message.text()); });
  await page.goto(issuePanelUrl);
  await expect(page.locator('#state')).toHaveAttribute('data-state', 'success');
  await expect(page.locator('#state')).toContainText('Jira issue context loaded');
  await expect(page.locator('#issue-context')).toBeVisible();
  await expect(page.locator('#issue-title')).toHaveText('Review sample procurement evidence');
  await expect(page.locator('#issue-key')).toHaveText('DEMO-101');
  await expect(page.locator('#issue-status')).toHaveText('In Progress');
  await expect(page.locator('#issue-assignee')).toHaveText('Demo Reviewer');
  await expect(page.locator('.variance-callout')).toContainText('1,000 ordered − 800 received = 200 units to investigate');
  await expect(page.locator('.variance-callout')).toContainText('₦4,800,000');
  await expect(page.locator('.variance-callout')).toContainText('not a confirmed loss');
  await expect(page.locator('#evidence-list')).toContainText('SAMPLE-PO-0142');
  await expect(page.locator('#evidence-list')).toContainText('1,000 units ordered');
  await expect(page.locator('#evidence-list')).toContainText('SAMPLE-DN-8821');
  await expect(page.locator('#evidence-list')).toContainText('800 units delivered');
  await expect(page.locator('#evidence-list')).toContainText('SAMPLE-GRN-4418');
  await expect(page.locator('#evidence-list')).toContainText('800 units received');
  const reviewButton = page.getByRole('button', { name: 'Complete evidence review' });
  await expect(reviewButton).toBeDisabled();

  await page.getByRole('checkbox', { name: 'Mark Purchase order checked in sample review' }).check();
  await page.getByRole('checkbox', { name: 'Mark Delivery confirmation checked in sample review' }).check();
  await expect(reviewButton).toBeDisabled();
  await page.getByRole('checkbox', { name: 'Mark Goods received note checked in sample review' }).check();

  await expect(page.locator('#evidence-progress')).toHaveText('3 of 3 documents checked');
  await expect(reviewButton).toBeEnabled();
  await reviewButton.click();
  await expect(page.locator('#review-message')).toContainText('saved for this Jira issue');
  await expect(page.locator('#review-button')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#save-state')).toContainText('Saved to this Jira app workspace');
  await page.getByRole('button', { name: 'Create Jira follow-up task' }).click();
  await expect(page.locator('#task-message')).toContainText('DEMO-202 was created and linked');
  await expect(page.getByRole('button', { name: 'Jira task created' })).toBeDisabled();
});

test('evidence review checkboxes are operable with the keyboard', async ({ page }) => {
  await page.goto(issuePanelUrl);
  const purchaseOrder = page.getByRole('checkbox', { name: 'Mark Purchase order checked in sample review' });
  await purchaseOrder.focus();
  await expect(purchaseOrder).toBeFocused();
  await page.keyboard.press('Space');
  await expect(purchaseOrder).toBeChecked();
  await expect(page.locator('#evidence-progress')).toHaveText('1 of 3 documents checked');
  await expect(page.getByRole('button', { name: 'Complete evidence review' })).toBeDisabled();
});

test('issue panel explains when the Jira issue is missing', async ({ page }) => {
  await openIssuePanelScenario(page, 'missing');
  await expect(page.locator('#state')).toHaveAttribute('data-state', 'warning');
  await expect(page.locator('#state')).toContainText('could not be found');
  await expect(page.locator('#issue-context')).toBeHidden();
});

test('issue panel explains when the user lacks Jira issue permission', async ({ page }) => {
  await openIssuePanelScenario(page, 'forbidden');
  await expect(page.locator('#state')).toHaveAttribute('data-state', 'warning');
  await expect(page.locator('#state')).toContainText('permission');
  await expect(page.locator('#issue-context')).toBeHidden();
});

test('issue panel handles Jira unavailability without exposing raw errors in the UI or console', async ({ page }) => {
  const consoleMessages = [];
  page.on('console', (message) => consoleMessages.push(message.text()));
  await openIssuePanelScenario(page, 'unavailable');
  await expect(page.locator('#state')).toHaveAttribute('data-state', 'error');
  await expect(page.locator('#state')).toContainText('Could not load Jira issue context');
  await expect(page.locator('#state')).not.toContainText('SIMULATED_INTERNAL_FAILURE_SECRET');
  await expect(page.locator('#issue-context')).toBeHidden();
  await expect.poll(() => consoleMessages.join(' ')).not.toContain('SIMULATED_INTERNAL_FAILURE_SECRET');
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


test('follow-up task creation stays disabled until Jira issue context loads', async ({ page }) => {
  await openIssuePanelScenario(page, 'missing');
  await expect(page.getByRole('button', { name: 'Create Jira follow-up task' })).toBeDisabled();
});
