import type { OnUploadComplete } from '@w3ui/react-uploader'

import React from 'react'
import { CARMetadata } from '@w3ui/uploader-core'
import { Status, Uploader as UploaderCore, useUploaderComponent } from '@w3ui/react-uploader'
import { Link, Version } from 'multiformats'

export const Uploading = ({ file, storedDAGShards }: { file?: File, storedDAGShards?: CARMetadata[] }): JSX.Element => (
  <div className='uploading'>
    <h1 className='title'>Uploading DAG for {file?.name}</h1>
    {storedDAGShards?.map(({ cid, size }) => (
      <p className='shard' key={cid.toString()}>
        {cid.toString()} ({size} bytes)
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
    <div className='done'>
      <h1 className='title'>Done!</h1>
      <p className='cid'>
        Uploaded to <a href={`https://${cid}.ipfs.w3s.link/`}>{cid}</a>
      </p>
      <button
        className='w3ui-button'
        onClick={() => { setFile(undefined) }}
      >
        Add More
      </button>
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

const UploaderContents = (): JSX.Element => {
  const [{ status, file }] = useUploaderComponent()
  const hasFile = (file !== undefined)
  if (status === Status.Idle) {
    if (hasFile) {
      return (
        <>
          <div className='w3ui-uploader__file'>
            <span className='name'>{file.name}</span>
            <span className='type'>{file.type}</span>
            <span className='size'>{file.size}</span>
          </div>
          <button type='submit' className='w3ui-button' disabled={file === undefined}>
            Upload
          </button>
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
