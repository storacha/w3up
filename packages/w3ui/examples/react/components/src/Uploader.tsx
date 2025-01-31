import { ReactNode, useEffect } from 'react'
import {
  Uploader,
  useUploader,
  UploadStatus,
  CARMetadata,
  UploadProgress,
  AnyLink,
} from '@w3ui/react'
import { UploadLoader } from './Loader'

function humanFileSize(bytes: number): string {
  const size = (bytes / (1024 * 1024)).toFixed(2)
  return `${size} MiB`
}

interface UploadingProps {
  file?: File
  files?: File[]
  storedDAGShards: CARMetadata[]
  uploadProgress: UploadProgress
}

function Uploading({
  file,
  files,
  storedDAGShards,
  uploadProgress,
}: UploadingProps): ReactNode {
  const fileName = files != null && files.length > 1 ? 'your files' : file?.name
  return (
    <div className="flex flex-col items-center w-full">
      <h1 className="font-bold text-sm uppercase text-zinc-950">
        Uploading {fileName}
      </h1>
      <UploadLoader uploadProgress={uploadProgress} />
      {storedDAGShards?.map(({ cid, size }) => (
        <p
          className="text-xs max-w-full overflow-hidden text-ellipsis"
          key={cid.toString()}
        >
          shard {cid.toString()} ({humanFileSize(size)}) uploaded
        </p>
      ))}
    </div>
  )
}

function Errored({ error }: { error?: Error }): ReactNode {
  useEffect(() => {
    if (error != null) {
      // eslint-disable-next-line no-console
      console.error('Uploader Error:', error)
    }
  }, [error])

  return (
    <div className="flex flex-col items-center">
      <h1>⚠️ Error: failed to upload file: {error?.message}</h1>
      <p>Check the browser console for details.</p>
    </div>
  )
}

interface DoneProps {
  file?: File
  files?: File[]
  dataCID?: AnyLink
  storedDAGShards: CARMetadata[]
}

const Done = ({
  file,
  files,
  dataCID,
  storedDAGShards,
}: DoneProps): ReactNode => {
  const cidString: string = dataCID?.toString() ?? ''
  const fileName = files != null && files.length > 1 ? 'your files' : file?.name
  return (
    <div>
      <h1 className="text-gray-800">Done!</h1>
      <p className="truncate">{cidString}</p>
      <p>
        <a
          href={`https://w3s.link/ipfs/${cidString}`}
          className="text-blue-800"
        >
          View {fileName} on IPFS Gateway.
        </a>
      </p>
      <p className="text-gray-800">Chunks ({storedDAGShards.length}):</p>
      {storedDAGShards.map(({ cid, size }) => (
        <p key={cid.toString()} className="truncate">
          {cid.toString()} ({size} bytes)
        </p>
      ))}
    </div>
  )
}

function UploaderConsole(): ReactNode {
  const [
    { status, file, files, error, dataCID, storedDAGShards, uploadProgress },
  ] = useUploader()

  switch (status) {
    case UploadStatus.Uploading: {
      return (
        <Uploading
          file={file}
          files={files}
          storedDAGShards={storedDAGShards}
          uploadProgress={uploadProgress}
        />
      )
    }
    case UploadStatus.Succeeded: {
      return (
        <Done
          file={file}
          files={files}
          dataCID={dataCID}
          storedDAGShards={storedDAGShards}
        />
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

function UploaderContents(): ReactNode {
  const [{ status, file, files }] = useUploader()
  const hasFile = file !== undefined
  if (status === UploadStatus.Idle) {
    return hasFile ? (
      <>
        <div className="flex flex-row space-x-2 flex-wrap max-w-xl">
          {files?.map((f, i) => (
            <div className="flex flex-col justify-around" key={i}>
              <span className="text-sm">{f.name}</span>
              <span className="text-xs text-white/75 font-mono">
                {humanFileSize(f.size)}
              </span>
            </div>
          ))}
        </div>
        <div className="p-4">
          <button
            type="submit"
            className="w3ui-button"
            disabled={file === undefined}
          >
            Upload
          </button>
        </div>
      </>
    ) : (
      <></>
    )
  } else {
    return (
      <>
        <UploaderConsole />
      </>
    )
  }
}

interface UploaderFormProps {
  multiple?: boolean
  allowDirectory?: boolean
}

export function UploaderForm({
  multiple,
  allowDirectory,
}: UploaderFormProps): ReactNode {
  const [{ file }] = useUploader()
  const hasFile = file !== undefined
  return (
    <Uploader.Form className="m-12">
      <div className="relative shadow h-52 p-8 rounded-md bg-white/5 hover:bg-white/20 border-2 border-dotted border-zinc-950 flex flex-col justify-center items-center text-center">
        <label
          className={`${
            hasFile
              ? 'hidden'
              : 'block h-px w-px overflow-hidden absolute whitespace-nowrap'
          }`}
        >
          File:
        </label>
        <Uploader.Input
          multiple={multiple}
          allowDirectory={allowDirectory}
          className={`${
            hasFile
              ? 'hidden'
              : 'block absolute inset-0 cursor-pointer w-full opacity-0'
          }`}
        />
        <UploaderContents />
        {hasFile ? '' : <span>Drag files or Click to Browse</span>}
      </div>
    </Uploader.Form>
  )
}
