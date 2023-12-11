import type { As, Component, Props, Options } from 'ariakit-react-utils'
import type { ChangeEvent } from 'react'
import type { AnyLink, CARMetadata, ProgressStatus } from '@w3ui/core'

import React, {
  useContext,
  useMemo,
  useCallback,
  createContext,
  useState,
  Fragment
} from 'react'
import { createComponent, createElement } from 'ariakit-react-utils'
import { useW3 } from './providers/Provider.jsx'

export type UploadProgress = Record<string, ProgressStatus>

export enum UploadStatus {
  Idle = 'idle',
  Uploading = 'uploading',
  Failed = 'failed',
  Succeeded = 'succeeded',
}

export interface UploaderContextState {
  /**
   * A string indicating the status of this component - can be 'uploading', 'done' or ''.
   */
  status: UploadStatus
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
  dataCID?: AnyLink
  /**
   * Shards of a DAG uploaded to web3.storage
   */
  storedDAGShards: CARMetadata[]
  /**
   * Shard upload progress information.
   */
  uploadProgress: UploadProgress
}

export interface UploaderContextActions {
  /**
   * Set a file to be uploaded to web3.storage. The file will be uploaded
   * when `handleUploadSubmit` is called.
   */
  setFile: (file?: File) => void
}

export type UploaderContextValue = [
  state: UploaderContextState,
  actions: UploaderContextActions
]

export const UploaderContextDefaultValue: UploaderContextValue = [
  {
    status: UploadStatus.Idle,
    storedDAGShards: [],
    uploadProgress: {}
  },
  {
    setFile: () => {
      throw new Error('missing set file function')
    }
  }
]

export const UploaderContext = createContext<UploaderContextValue>(UploaderContextDefaultValue)

interface OnUploadCompleteProps {
  file?: File
  dataCID?: AnyLink
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
    const [{ client }] = useW3()
    const [file, setFile] = useState<File>()
    const [dataCID, setDataCID] = useState<AnyLink>()
    const [status, setStatus] = useState(UploadStatus.Idle)
    const [error, setError] = useState()
    const [storedDAGShards, setStoredDAGShards] = useState<UploaderContextState['storedDAGShards']>([])
    const [uploadProgress, setUploadProgress] = useState<UploadProgress>({})

    const setFileAndReset = (file?: File): void => {
      setFile(file)
      setStatus(UploadStatus.Idle)
    }

    const handleUploadSubmit = async (e: Event): Promise<void> => {
      e.preventDefault()
      if ((client !== undefined) && (file !== undefined)) {
        try {
          setError(undefined)
          setStatus(UploadStatus.Uploading)
          const storedShards: CARMetadata[] = []
          setStoredDAGShards(storedShards)
          const cid = await client.uploadFile(file, {
            onShardStored (meta) {
              storedShards.push(meta)
              setStoredDAGShards([...storedShards])
            },
            onUploadProgress (status) {
              setUploadProgress(statuses => ({ ...statuses, [status.url ?? '']: status }))
            }
          })
          setDataCID(cid)
          setStatus(UploadStatus.Succeeded)
          if (props.onUploadComplete !== undefined) {
            props.onUploadComplete({ file, dataCID: cid })
          }
        } catch (error_: any) {
          setError(error_)
          setStatus(UploadStatus.Failed)
        }
      }
    }

    const uploaderContextValue =
      useMemo<UploaderContextValue>(
        () => [
          {
            file,
            dataCID,
            status,
            error,
            handleUploadSubmit,
            storedDAGShards,
            uploadProgress
          },
          { setFile: setFileAndReset }
        ],
        [
          file,
          dataCID,
          status,
          error,
          handleUploadSubmit,
          setFile
        ]
      )

    return (
      <UploaderContext.Provider value={uploaderContextValue}>
        {createElement(Fragment, props)}
      </UploaderContext.Provider>
    )
  }
)

export type UploaderInputOptions<T extends As = 'input'> = Options<T>
export type UploaderInputProps<T extends As = 'input'> = Props<UploaderInputOptions<T>>

/**
 * Input component for the headless Uploader.
 *
 * A file `input` designed to work with `Uploader`. Any passed props will
 * be passed along to the `input` component.
 */
export const UploaderInput: Component<UploaderInputProps> = createComponent((props) => {
  const [, { setFile }] = useContext(UploaderContext)
  const onChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => { setFile(e.target.files?.[0]) },
    [setFile]
  )
  return createElement('input', { ...props, type: 'file', onChange })
})

export type UploaderFormOptions<T extends As = 'form'> = Options<T>
export type UploaderFormProps<T extends As = 'form'> = Props<UploaderFormOptions<T>>

/**
 * Form component for the headless Uploader.
 *
 * A `form` designed to work with `Uploader`. Any passed props will
 * be passed along to the `form` component.
 */
export const UploaderForm: Component<UploaderFormProps> = createComponent((props) => {
  const [{ handleUploadSubmit }] = useContext(UploaderContext)
  return createElement('form', { ...props, onSubmit: handleUploadSubmit })
})

/**
 * Use the scoped uploader context state from a parent `Uploader`.
 */
export function useUploader (): UploaderContextValue {
  return useContext(UploaderContext)
}

export const Uploader = Object.assign(UploaderRoot, { Input: UploaderInput, Form: UploaderForm })
