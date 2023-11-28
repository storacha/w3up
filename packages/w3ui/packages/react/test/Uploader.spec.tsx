import React from 'react'
import 'fake-indexeddb/auto'
import { test, expect, vi } from 'vitest'
import user from '@testing-library/user-event'
import { render, screen } from '@testing-library/react'
import * as Link from 'multiformats/link'
import { Context, ContextDefaultValue, ContextValue } from '../src/providers/Provider'
import { Uploader } from '../src/Uploader'

test('Form', async () => {
  const cid = Link.parse('bafybeibrqc2se2p3k4kfdwg7deigdggamlumemkiggrnqw3edrjosqhvnm')
  const client = { uploadFile: vi.fn().mockImplementation(() => cid) }

  const contextValue: ContextValue = [
    {
      ...ContextDefaultValue[0],
      // @ts-expect-error not a real client
      client
    },
    ContextDefaultValue[1]
  ]
  const handleComplete = vi.fn()
  render(
    <Context.Provider value={contextValue}>
      <Uploader onUploadComplete={handleComplete}>
        <Uploader.Form>
          <Uploader.Input data-testid='file-upload' />
          <input type='submit' value='Upload' />
        </Uploader.Form>
      </Uploader>
    </Context.Provider>
  )

  const file = new File(['hello'], 'hello.txt', { type: 'text/plain' })

  const fileInput = screen.getByTestId('file-upload')
  await user.upload(fileInput, file)

  const submitButton = screen.getByText('Upload')
  await user.click(submitButton)

  expect(client.uploadFile).toHaveBeenCalled()
})
