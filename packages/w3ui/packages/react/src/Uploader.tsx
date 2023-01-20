import type { OnUploadComplete } from '@w3ui/react-uploader'

import React from 'react'
import { CARMetadata } from '@w3ui/uploader-core'
import { Status, Uploader as UploaderCore, useUploaderComponent } from '@w3ui/react-uploader'
import { Link, Version } from 'multiformats'

export const Uploading = ({ file, storedDAGShards }: { file?: File, storedDAGShards?: CARMetadata[] }): JSX.Element => (
  <div className='uploading'>
    <h1 className='w3ui-uploader-console__title'>Uploading {file?.name}</h1>
    {storedDAGShards?.map(({ cid, size }) => (
      <p className='w3ui-uploader-console__cid' key={cid.toString()}>
        shard {cid.toString()} ({humanFileSize(size)}) uploaded
      </p>
    ))}
  </div>
)

export const Errored = ({ error }: { error: any }): JSX.Element => (
  <div className='error'>
    <h1 className='message'>⚠️ Error: failed to upload file: {error.message}</h1>
    <p className='details'>Check the browser console for details.</p>
  </div>
)

interface DoneProps {
  file?: File
  dataCID?: Link<unknown, number, number, Version>
  storedDAGShards?: CARMetadata[]
}

export const Done = ({ dataCID }: DoneProps): JSX.Element => {
  const [, { setFile }] = useUploaderComponent()
  const cid: string = dataCID?.toString() ?? ''
  return (
    <div className='w3ui-uploader-console__done'>
      <h1 className='w3ui-uploader-console__title'>Uploaded</h1>
      <a className='w3ui-uploader-console__cid' href={`https://${cid}.ipfs.w3s.link/`}>{cid}</a>
      <div className='w3ui-uploader-console__actions'>
        <button className='w3ui-button' onClick={() => { setFile(undefined) }}>
          Add More
        </button>
      </div>
    </div>
  )
}

const UploaderForm = (): JSX.Element => {
  const [{ status, file }] = useUploaderComponent()
  const hasFile = (file !== undefined)
  return (
    <UploaderCore.Form>
      <div className={`w3ui-uploader ${status} ${hasFile ? 'has-file' : 'no-file'}`}>
        <label className='w3ui-uploader__label'>File:</label>
        <UploaderCore.Input className='w3ui-uploader__input' />
        <UploaderContents />
      </div>
    </UploaderCore.Form>
  )
}

function pickFileIconLabel (file: File): string | undefined {
  const type = file.type.split('/')
  if ((type.length === 0) || type.at(0) === '') {
    const ext = file.name.split('.').at(-1)
    if ((ext !== undefined) && ext.length < 5) {
      return ext
    }
    return 'Data'
  }
  if (type.at(0) === 'image') {
    return type.at(-1)
  }
  return type.at(0)
}

function humanFileSize (bytes: number): string {
  const size = (bytes / (1024 * 1024)).toFixed(2)
  return `${size} MiB`
}

const UploaderContents = (): JSX.Element => {
  const [{ status, file }] = useUploaderComponent()
  const hasFile = (file !== undefined)
  if (status === Status.Idle) {
    if (hasFile) {
      return (
        <>
          <div className='w3ui-uploader__file'>
            <div className='w3ui-uploader__file_icon' title={file.type}>
              {pickFileIconLabel(file)}
            </div>
            <div className='w3ui-uploader__file_meta'>
              <span className='w3ui-uploader__file_meta_name'>{file.name}</span>
              <span className='w3ui-uploader__file_meta_size'>{humanFileSize(file.size)}</span>
            </div>
          </div>
          <div className='w3ui-uploader-console__actions'>
            <button type='submit' className='w3ui-button' disabled={file === undefined}>
              Upload
            </button>
          </div>
        </>
      )
    } else {
      return <></>
    }
  } else {
    return (
      <div className='w3ui-uploader-console'>
        <UploaderConsole />
      </div>
    )
  }
}

const UploaderConsole = (): JSX.Element => {
  const [{ status, file, error, dataCID, storedDAGShards }] = useUploaderComponent()
  switch (status) {
    case Status.Uploading:
      return <Uploading file={file} storedDAGShards={storedDAGShards} />
    case Status.Succeeded:
      return <Done file={file} dataCID={dataCID} storedDAGShards={storedDAGShards} />
    case Status.Failed:
      return <Errored error={error} />
    default:
      return (
        <></>
      )
  }
}

export interface SimpleUploaderProps {
  onUploadComplete?: OnUploadComplete
}

export const Uploader = ({ onUploadComplete }: SimpleUploaderProps): JSX.Element => {
  return (
    <UploaderCore as='div' className='w3ui-uploader-wrapper' onUploadComplete={onUploadComplete}>
      <UploaderForm />
    </UploaderCore>
  )
}
