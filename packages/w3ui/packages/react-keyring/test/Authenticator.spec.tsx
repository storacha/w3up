import React from 'react'
import 'fake-indexeddb/auto'
import { test, expect, vi } from 'vitest'
import user from '@testing-library/user-event'
import { render, screen } from '@testing-library/react'

import {
  KeyringContext,
  keyringContextDefaultValue,
  KeyringContextValue
} from '../src/providers/Keyring'
import { Authenticator, CancelButton, Form, EmailInput } from '../src/index'

test('CancelButton', async () => {
  const cancelRegisterSpace = vi.fn()
  const contextValue: KeyringContextValue = [
    keyringContextDefaultValue[0],
    { ...keyringContextDefaultValue[1], cancelRegisterSpace }
  ]
  render(
    <KeyringContext.Provider value={contextValue}>
      <Authenticator>
        <CancelButton>Cancel</CancelButton>
      </Authenticator>
    </KeyringContext.Provider>
  )

  const cancelButton = screen.getByText('Cancel')
  await user.click(cancelButton)

  expect(cancelRegisterSpace).toHaveBeenCalledOnce()
})

test('Form', async () => {
  const authorize = vi.fn()

  const contextValue: KeyringContextValue = [
    keyringContextDefaultValue[0],
    {
      ...keyringContextDefaultValue[1],
      authorize
    }
  ]
  render(
    <KeyringContext.Provider value={contextValue}>
      <Authenticator>
        <Form>
          <EmailInput placeholder='Email' />
          <input type='submit' value='Create Space' />
        </Form>
      </Authenticator>
    </KeyringContext.Provider>
  )

  const myEmail = 'travis@dag.house'
  const emailInput = screen.getByPlaceholderText('Email')
  await user.click(emailInput)
  await user.keyboard(myEmail)

  const submitButton = screen.getByText('Create Space')
  await user.click(submitButton)

  expect(authorize).toHaveBeenCalledOnce()
})
