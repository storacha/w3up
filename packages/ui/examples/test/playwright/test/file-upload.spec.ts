import { test, expect } from '@playwright/test'

for (const ui of ['react']) {
  test(`${ui}: file upload`, async ({ page }) => {
    await page.goto(`/ui-example-${ui}-file-upload/dist/`)
    await expect(page).toHaveTitle('W3UI File Upload Example App')

    const input = page.getByRole('textbox', { name: 'Email' })
    await input.fill('test@example.org')
    await input.press('Enter')
    await expect(page.getByText('Verify your email address!')).toBeVisible()
  })
}
//
