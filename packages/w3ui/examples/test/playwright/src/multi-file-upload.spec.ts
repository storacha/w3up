import { test, expect } from '@playwright/test'

for (const ui of ['react']) {
  test(`${ui}: multi file upload`, async ({ page }) => {
    await page.goto(`/example-${ui}-multi-file-upload/dist/`)
    await expect(page).toHaveTitle('W3UI Multi File Upload Example App')

    const input = page.getByRole('textbox', { name: 'Email' })
    await input.fill('test@example.org')
    await input.press('Enter')
    await expect(page.getByText('Verify your email address!')).toBeVisible()
  })
}
