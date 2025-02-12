import { test, expect } from '@playwright/test'

for (const ui of ['react']) {
  test(`${ui}: sign in`, async ({ page }) => {
    await page.goto(`/ui-example-${ui}-sign-up-in/dist/`)
    await expect(page).toHaveTitle('W3UI Sign Up / Sign In Example App')

    const input = page.getByRole('textbox', { name: 'Email' })
    await input.fill('test@example.org')
    await input.press('Enter')
    await expect(page.getByText('Verify your email address!')).toBeVisible()
  })
}
