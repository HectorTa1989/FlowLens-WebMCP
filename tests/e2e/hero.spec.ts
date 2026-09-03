import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => localStorage.clear())
  await page.reload()
})

test('repairs the selected VIP path through the human approval gate', async ({ page }) => {
  await page.getByRole('button', { name: 'Select failed path' }).click()
  await expect(page.getByText('2 selected steps')).toBeVisible()
  await page.screenshot({ path: 'docs/screenshots/selected-failure.png', fullPage: true })
  await page.getByRole('button', { name: 'Patch', exact: true }).click()
  await page.getByRole('button', { name: 'Stage smallest repair' }).click()
  await expect(page.getByText('customer.segment')).toBeVisible()
  await page.getByRole('button', { name: /Approve patch/ }).click()
  await expect(page.getByText('Human approved')).toBeVisible()
  await page.getByRole('button', { name: /Apply & rerun fixture/ }).click()
  await expect(page.getByText('Before & after')).toBeVisible()
  await expect(page.getByText('Deterministic proof')).toBeVisible()
  await expect(page.getByText('Verified run')).toBeVisible()
  await page.screenshot({ path: 'docs/screenshots/repaired-comparison.png', fullPage: true })
})

test('gates Pro repairs for a guest persona with Polar', async ({ page }) => {
  await page.getByRole('button', { name: /HectorTa1989/ }).click()
  await page.getByRole('button', { name: /Guest operator/ }).click()
  await page.getByRole('button', { name: 'Select failed path' }).click()
  await page.getByRole('button', { name: 'Patch', exact: true }).click()
  await page.getByRole('button', { name: 'Stage smallest repair' }).click()
  await expect(page.getByRole('dialog')).toContainText('FlowLens Pro')
  await expect(page.getByRole('button', { name: /Continue with Polar/ })).toBeVisible()
})
