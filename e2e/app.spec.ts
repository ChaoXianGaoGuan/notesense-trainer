import { test, expect } from '@playwright/test'

test('each module renders and supports a basic answer flow', async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => localStorage.clear())
  await page.reload()
  await expect(page.getByRole('heading', { name: '音乐基础训练器' })).toBeVisible()

  await page.getByRole('button', { name: 'do' }).click()
  await expect(page.getByRole('status')).toBeVisible()

  await page.getByRole('button', { name: '单音听辨' }).click()
  await expect(page.getByTestId('module-single-note')).toBeVisible()
  await page.getByRole('button', { name: 'C' }).click()
  await expect(page.getByRole('status')).toBeVisible()

  await page.getByRole('button', { name: '旋律短句听写' }).click()
  const melodyModule = page.getByTestId('module-melody')
  await expect(melodyModule).toBeVisible()
  await melodyModule.locator('.option-grid button', { hasText: 'C' }).click()
  await melodyModule.locator('.option-grid button', { hasText: 'D' }).click()
  await melodyModule.locator('.option-grid button', { hasText: 'E' }).click()
  await page.getByRole('button', { name: '提交' }).click()
  await expect(page.getByRole('status')).toBeVisible()

  await page.getByRole('button', { name: '和弦性质听辨' }).click()
  await expect(page.getByTestId('module-chord')).toBeVisible()
  await page.getByTestId('module-chord').locator('.option-grid button').first().click()
  await expect(page.getByRole('status')).toBeVisible()

  await page.getByRole('button', { name: '根音冠音音程速算' }).click()
  await expect(page.getByTestId('module-interval')).toBeVisible()
  await expect(page.getByText('音量')).toHaveCount(0)
})

test('layout fits mobile width', async ({ page }) => {
  await page.goto('/')
  await page.setViewportSize({ width: 390, height: 844 })
  await expect(page.getByRole('heading', { name: '音乐基础训练器' })).toBeVisible()
  await expect(page.locator('.trainer-surface')).toBeVisible()
})
