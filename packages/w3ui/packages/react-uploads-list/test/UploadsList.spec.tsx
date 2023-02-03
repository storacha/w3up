import React from 'react'
import 'fake-indexeddb/auto'
import { test, expect, vi } from 'vitest'
import user from '@testing-library/user-event'
import { render, screen } from '@testing-library/react'

import { UploadsListContext, uploadsListContextDefaultValue, UploadsListContextValue } from '../src/providers/UploadsList'
import { UploadsList, NextButton, ReloadButton } from '../src/index'

test('Form', async () => {
  const reload = vi.fn()
  const next = vi.fn()

  const contextValue: UploadsListContextValue = [
    uploadsListContextDefaultValue[0],
    {
      ...uploadsListContextDefaultValue[1],
      reload,
      next
    }
  ]
  render(
    <UploadsListContext.Provider value={contextValue}>
      <UploadsList>
        {({ uploadsList }) => (
          <div>
            <ul>
              {uploadsList?.[0].data?.map(({ root }) => (
                <li key={root.toString()}>{root.toString()}</li>
              ))}
            </ul>
            <NextButton>Next</NextButton>
            <ReloadButton>Reload</ReloadButton>
          </div>
        )}
      </UploadsList>
    </UploadsListContext.Provider>
  )

  const reloadButton = screen.getByText('Reload')
  await user.click(reloadButton)

  expect(reload).toHaveBeenCalledOnce()

  const nextButton = screen.getByText('Next')
  await user.click(nextButton)

  expect(next).toHaveBeenCalledOnce()
})
