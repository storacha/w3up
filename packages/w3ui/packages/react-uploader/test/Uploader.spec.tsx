import React from 'react'
import 'fake-indexeddb/auto'
import { test, expect, vi } from 'vitest'
import user from '@testing-library/user-event'
import { render, screen } from '@testing-library/react'

import {
  UploaderContext,
  uploaderContextDefaultValue,
  UploaderContextValue
} from '../src/providers/Uploader'
import { Uploader, Input, Form } from '../src/index'

test('Form', async () => {
  const uploadFile = vi.fn()

  const contextValue: UploaderContextValue = [
    uploaderContextDefaultValue[0],
    {
      ...uploaderContextDefaultValue[1],
      uploadFile
    }
  ]
  render(
    <UploaderContext.Provider value={contextValue}>
      <Uploader>
        <Form>
          <Input data-testid='file-upload' />
          <input type='submit' value='Upload' />
        </Form>
      </Uploader>
    </UploaderContext.Provider>
  )

  const file = new File(['hello'], 'hello.txt', { type: 'text/plain' })

  const fileInput = screen.getByTestId('file-upload')
  await user.upload(fileInput, file)

  const submitButton = screen.getByText('Upload')
  await user.click(submitButton)

  expect(uploadFile).toHaveBeenCalledWith(file)
})
