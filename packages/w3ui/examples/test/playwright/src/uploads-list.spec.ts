import { test, expect } from '@playwright/test'

for (const ui of [
  //  'react'
]) {
  test(`${ui}: uploads list`, async ({ page }) => {
    await page.goto(`/${ui}/uploads-list/`)
    await expect(page).toHaveTitle('W3UI Uploads List Example App')

    const input = page.getByRole('textbox', { name: 'Email address:' })
    await input.fill('test@example.org')
    await input.press('Enter')
    await expect(page.getByText('Verify your email address!')).toBeVisible()
  })
}
