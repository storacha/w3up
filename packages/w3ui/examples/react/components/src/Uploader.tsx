import React, { ReactNode } from 'react'
import { Uploader, useUploader, UploadStatus, CARMetadata, UploadProgress, AnyLink } from '@w3ui/react'
import { UploadLoader } from './Loader'

function humanFileSize (bytes: number): string {
  const size = (bytes / (1024 * 1024)).toFixed(2)
  return `${size} MiB`
}

interface UploadingProps {
  file?: File
  storedDAGShards: CARMetadata[]
  uploadProgress: UploadProgress
}

function Uploading ({ file, storedDAGShards, uploadProgress }: UploadingProps): ReactNode {
  return (
    <div className='flex flex-col items-center w-full'>
      <h1 className='font-bold text-sm uppercase text-zinc-950'>Uploading {file?.name}</h1>
      <UploadLoader uploadProgress={uploadProgress} />
      {storedDAGShards?.map(({ cid, size }) => (
        <p className='text-xs max-w-full overflow-hidden text-ellipsis' key={cid.toString()}>
          shard {cid.toString()} ({humanFileSize(size)}) uploaded
        </p>
      ))}
    </div>
  )
}

function Errored ({ error }: { error?: Error }): ReactNode {
  return (
    <div className='flex flex-col items-center'>
      <h1>
        ⚠️ Error: failed to upload file: {error?.message}
      </h1>
      <p>Check the browser console for details.</p>
    </div>
  )
}

interface DoneProps {
  file?: File
  dataCID?: AnyLink
  storedDAGShards: CARMetadata[]
}

const Done = ({ file, dataCID, storedDAGShards }: DoneProps): ReactNode => {
  const cidString: string = dataCID?.toString() ?? ''
  return (
    <div>
      <h1 className='near-white'>Done!</h1>
      <p className='f6 code truncate'>{cidString}</p>
      <p><a href={`https://w3s.link/ipfs/${cidString}`} className='blue'>View {file?.name} on IPFS Gateway.</a></p>
      <p className='near-white'>Chunks ({storedDAGShards.length}):</p>
      {storedDAGShards.map(({ cid, size }) => (
        <p key={cid.toString()} className='f7 truncate'>
          {cid.toString()} ({size} bytes)
        </p>
      ))}
    </div>
  )
}

function UploaderConsole (): ReactNode {
  const [{ status, file, error, dataCID, storedDAGShards, uploadProgress }] =
    useUploader()

  switch (status) {
    case UploadStatus.Uploading: {
      return <Uploading file={file} storedDAGShards={storedDAGShards} uploadProgress={uploadProgress} />
    }
    case UploadStatus.Succeeded: {
      return (
        <Done file={file} dataCID={dataCID} storedDAGShards={storedDAGShards} />
      )
    }
    case UploadStatus.Failed: {
      return <Errored error={error} />
    }
    default: {
      return <></>
    }
  }
}

function UploaderContents (): ReactNode {
  const [{ status, file }] = useUploader()
  const hasFile = file !== undefined
  if (status === UploadStatus.Idle) {
    return hasFile
      ? (
        <>
          <div className='flex flex-row'>
            <div className='flex flex-col justify-around'>
              <span className='text-sm'>{file.name}</span>
              <span className='text-xs text-white/75 font-mono'>
                {humanFileSize(file.size)}
              </span>
            </div>
          </div>
          <div className='p-4'>
            <button
              type='submit'
              className='w3ui-button'
              disabled={file === undefined}
            >
              Upload
            </button>
          </div>
        </>
        )
      : <></>
  } else {
    return (
      <>
        <UploaderConsole />
      </>
    )
  }
}

export function UploaderForm (): ReactNode {
  const [{ file }] = useUploader()
  const hasFile = file !== undefined
  return (
    <Uploader.Form className="m-12">
      <div className='relative shadow h-52 p-8 rounded-md bg-white/5 hover:bg-white/20 border-2 border-dotted border-zinc-950 flex flex-col justify-center items-center text-center'>
        <label className={`${hasFile ? 'hidden' : 'block h-px w-px overflow-hidden absolute whitespace-nowrap'}`}>File:</label>
        <Uploader.Input className={`${hasFile ? 'hidden' : 'block absolute inset-0 cursor-pointer w-full opacity-0'}`} />
        <UploaderContents />
        {hasFile ? '' : <span>Drag files or Click to Browse</span>}
      </div>
    </Uploader.Form>
  )
}
