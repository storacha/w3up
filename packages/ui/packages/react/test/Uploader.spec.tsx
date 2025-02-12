import 'fake-indexeddb/auto'
import { test, expect, vi, afterEach } from 'vitest'
import { userEvent as user } from '@testing-library/user-event'
import { render, screen, cleanup } from '@testing-library/react'
import * as Link from 'multiformats/link'
import {
  Context,
  ContextDefaultValue,
  ContextValue,
} from '../src/providers/Provider.js'
import { Uploader } from '../src/Uploader.js'

afterEach(() => {
  cleanup()
})

test('single file upload', async () => {
  const cid = Link.parse(
    'bafybeibrqc2se2p3k4kfdwg7deigdggamlumemkiggrnqw3edrjosqhvnm'
  )
  const client = { uploadFile: vi.fn().mockImplementation(() => cid) }

  const contextValue: ContextValue = [
    {
      ...ContextDefaultValue[0],
      // @ts-expect-error not a real client
      client,
    },
    ContextDefaultValue[1],
  ]
  const handleComplete = vi.fn()
  render(
    <Context.Provider value={contextValue}>
      <Uploader onUploadComplete={handleComplete}>
        <Uploader.Form>
          <Uploader.Input data-testid="file-upload" />
          <input type="submit" value="Upload" />
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

test('multi file upload', async () => {
  const cid = Link.parse(
    'bafybeibrqc2se2p3k4kfdwg7deigdggamlumemkiggrnqw3edrjosqhvnm'
  )
  const client = {
    uploadDirectory: vi.fn().mockImplementation(() => cid),
  }

  const contextValue: ContextValue = [
    {
      ...ContextDefaultValue[0],
      // @ts-expect-error not a real client
      client,
    },
    ContextDefaultValue[1],
  ]
  const handleComplete = vi.fn()
  render(
    <Context.Provider value={contextValue}>
      <Uploader onUploadComplete={handleComplete}>
        <Uploader.Form>
          <Uploader.Input data-testid="file-upload" multiple />
          <input type="submit" value="Upload" />
        </Uploader.Form>
      </Uploader>
    </Context.Provider>
  )

  const files = [
    new File(['hello'], 'hello.txt', { type: 'text/plain' }),
    new File(['world'], 'world.txt', { type: 'text/plain' }),
  ]

  const fileInput = screen.getByTestId('file-upload')
  await user.upload(fileInput, files)

  const submitButton = screen.getByText('Upload')
  await user.click(submitButton)

  expect(client.uploadDirectory).toHaveBeenCalled()
})

test('wrapping a file in a directory', async () => {
  const cid = Link.parse(
    'bafybeibrqc2se2p3k4kfdwg7deigdggamlumemkiggrnqw3edrjosqhvnm'
  )
  const client = {
    uploadDirectory: vi.fn().mockImplementation(() => cid),
  }

  const contextValue: ContextValue = [
    {
      ...ContextDefaultValue[0],
      // @ts-expect-error not a real client
      client,
    },
    ContextDefaultValue[1],
  ]
  const handleComplete = vi.fn()
  render(
    <Context.Provider value={contextValue}>
      <Uploader onUploadComplete={handleComplete} defaultWrapInDirectory>
        <Uploader.Form>
          <Uploader.Input data-testid="file-upload" />
          <input type="submit" value="Upload" />
        </Uploader.Form>
      </Uploader>
    </Context.Provider>
  )

  const file = new File(['hello'], 'hello.txt', { type: 'text/plain' })

  const fileInput = screen.getByTestId('file-upload')
  await user.upload(fileInput, file)

  const submitButton = screen.getByText('Upload')
  await user.click(submitButton)

  expect(client.uploadDirectory).toHaveBeenCalled()
})

test('uploading a CAR directly', async () => {
  const cid = Link.parse(
    'bafybeibrqc2se2p3k4kfdwg7deigdggamlumemkiggrnqw3edrjosqhvnm'
  )
  const client = {
    uploadCAR: vi.fn().mockImplementation(() => cid),
  }

  const contextValue: ContextValue = [
    {
      ...ContextDefaultValue[0],
      // @ts-expect-error not a real client
      client,
    },
    ContextDefaultValue[1],
  ]
  const handleComplete = vi.fn()
  render(
    <Context.Provider value={contextValue}>
      <Uploader onUploadComplete={handleComplete} defaultUploadAsCAR>
        <Uploader.Form>
          <Uploader.Input data-testid="file-upload" />
          <input type="submit" value="Upload" />
        </Uploader.Form>
      </Uploader>
    </Context.Provider>
  )

  // this isn't a real CAR but that's probably ok for a test
  const file = new File(['hello'], 'hello.car', {
    type: 'application/vnd.ipld.car',
  })

  const fileInput = screen.getByTestId('file-upload')
  await user.upload(fileInput, file)

  const submitButton = screen.getByText('Upload')
  await user.click(submitButton)

  expect(client.uploadCAR).toHaveBeenCalled()
})
