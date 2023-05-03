import type { As, Component, Props, Options } from 'ariakit-react-utils'
import type { ChangeEvent } from 'react'
import type {
  CID,
  CARMetadata,
  UploaderContextState,
  UploaderContextActions
} from '@w3ui/uploader-core'

import React, {
  useContext,
  useMemo,
  useCallback,
  createContext,
  useState,
  Fragment
} from 'react'
import { createComponent, createElement } from 'ariakit-react-utils'
import { useUploader } from './providers/Uploader'

export enum Status {
  Idle = 'idle',
  Uploading = 'uploading',
  Failed = 'failed',
  Succeeded = 'succeeded',
}

export type UploaderComponentContextState = UploaderContextState & {
  /**
   * A string indicating the status of this component - can be 'uploading', 'done' or ''.
   */
  status: Status
  /**
   * Error thrown by upload process.
   */
  error?: Error
  /**
   * a File to be uploaded
   */
  file?: File
  /**
   * A callback that can be passed to an `onSubmit` handler to
   * upload `file` to web3.storage via the w3up API
   */
  handleUploadSubmit?: (e: Event) => Promise<void>
  /**
   * The CID of a successful upload
   */
  dataCID?: CID
  /**
   * Shards of a DAG uploaded to web3.storage
   */
  storedDAGShards: CARMetadata[]
}

export type UploaderComponentContextActions = UploaderContextActions & {
  /**
   * Set a file to be uploaded to web3.storage. The file will be uploaded
   * when `handleUploadSubmit` is called.
   */
  setFile: (file?: File) => void
}

export type UploaderComponentContextValue = [
  state: UploaderComponentContextState,
  actions: UploaderComponentContextActions
]

const UploaderComponentContext = createContext<UploaderComponentContextValue>([
  {
    status: Status.Idle,
    storedDAGShards: [],
    uploadProgress: {}
  },
  {
    setFile: () => {
      throw new Error('missing set file function')
    },
    uploadFile: async () => {
      throw new Error('missing uploader context provider')
    },
    uploadDirectory: async () => {
      throw new Error('missing uploader context provider')
    }
  }
])

interface OnUploadCompleteProps {
  file?: File
  dataCID?: CID
}

export type OnUploadComplete = (props: OnUploadCompleteProps) => void

export type UploaderRootOptions<T extends As = typeof Fragment> = Options<T> & {
  onUploadComplete?: OnUploadComplete
}
export type UploaderRootProps<T extends As = typeof Fragment> = Props<UploaderRootOptions<T>>

/**
 * Top level component of the headless Uploader.
 *
 * Designed to be used with Uploader.Form and Uploader.Input
 * to easily create a custom component for uploading files to
 * web3.storage.
 */
export const UploaderRoot: Component<UploaderRootProps> = createComponent(
  (props) => {
    const [uploaderState, uploaderActions] = useUploader()
    const [file, setFile] = useState<File>()
    const [dataCID, setDataCID] =
      useState<CID>()
    const [status, setStatus] = useState(Status.Idle)
    const [error, setError] = useState()

    const setFileAndReset = (file?: File): void => {
      setFile(file)
      setStatus(Status.Idle)
    }

    const handleUploadSubmit = async (e: Event): Promise<void> => {
      e.preventDefault()
      if (file != null) {
        try {
          setError(undefined)
          setStatus(Status.Uploading)
          const cid = await uploaderActions.uploadFile(file)
          setDataCID(cid)
          setStatus(Status.Succeeded)
          if (props.onUploadComplete !== undefined) {
            props.onUploadComplete({ file, dataCID })
          }
        } catch (error_: any) {
          setError(error_)
          setStatus(Status.Failed)
        }
      }
    }

    const uploaderComponentContextValue =
      useMemo<UploaderComponentContextValue>(
        () => [
          {
            ...uploaderState,
            file,
            dataCID,
            status,
            error,
            handleUploadSubmit
          },
          { ...uploaderActions, setFile: setFileAndReset }
        ],
        [
          uploaderState,
          file,
          dataCID,
          status,
          error,
          handleUploadSubmit,
          uploaderActions,
          setFile
        ]
      )

    return (
      <UploaderComponentContext.Provider value={uploaderComponentContextValue}>
        {createElement(Fragment, props)}
      </UploaderComponentContext.Provider>
    )
  }
)

export type InputOptions<T extends As = 'input'> = Options<T>
export type InputProps<T extends As = 'input'> = Props<InputOptions<T>>

/**
 * Input component for the headless Uploader.
 *
 * A file `input` designed to work with `Uploader`. Any passed props will
 * be passed along to the `input` component.
 */
export const Input: Component<InputProps> = createComponent((props) => {
  const [, { setFile }] = useContext(UploaderComponentContext)
  const onChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      setFile(e?.target?.files?.[0])
    },
    [setFile]
  )
  return createElement('input', { ...props, type: 'file', onChange })
})

export type FormOptions<T extends As = 'form'> = Options<T>
export type FormProps<T extends As = 'form'> = Props<FormOptions<T>>

/**
 * Form component for the headless Uploader.
 *
 * A `form` designed to work with `Uploader`. Any passed props will
 * be passed along to the `form` component.
 */
export const Form: Component<FormProps> = createComponent((props) => {
  const [{ handleUploadSubmit }] = useContext(UploaderComponentContext)
  return createElement('form', { ...props, onSubmit: handleUploadSubmit })
})

/**
 * Use the scoped uploader context state from a parent `Uploader`.
 */
export function useUploaderComponent (): UploaderComponentContextValue {
  return useContext(UploaderComponentContext)
}

export const Uploader = Object.assign(UploaderRoot, { Input, Form })
