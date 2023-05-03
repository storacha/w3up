import type {
  OnUploadComplete,
  ProgressStatus,
  UploadProgress,
  CARMetadata,
  CID
} from '@w3ui/react-uploader'

import { CloudArrowUpIcon, ArrowPathIcon } from '@heroicons/react/24/outline'
import {
  Status,
  Uploader as UploaderCore,
  useUploaderComponent
} from '@w3ui/react-uploader'
import { gatewayHost } from '../components/services'

function StatusLoader ({ progressStatus }: { progressStatus: ProgressStatus }) {
  const { total, loaded, lengthComputable } = progressStatus
  if (lengthComputable) {
    const percentComplete = Math.floor((loaded / total) * 100)
    return (
      <div className='relative w-80 h-4 border border-solid border-white'>
        <div className='bg-white h-full' style={{ width: `${percentComplete}%` }}>
        </div>
      </div>
    )
  } else {
    return <ArrowPathIcon className='animate-spin h-4 w-4' />
  }
}

function Loader ({ uploadProgress }: { uploadProgress: UploadProgress }): JSX.Element {
  return (
    <div className='flex flex-col'>
      {Object.values(uploadProgress).map(
        status => <StatusLoader progressStatus={status} key={status.url} />
      )}
    </div>
  )
}

export const Uploading = ({
  file,
  storedDAGShards,
  uploadProgress
}: {
  file?: File
  storedDAGShards?: CARMetadata[]
  uploadProgress: UploadProgress
}): JSX.Element => (
  <div className='flex flex-col items-center w-full'>
    <h1 className='font-bold text-sm uppercase text-gray-400'>Uploading {file?.name}</h1>
    <Loader uploadProgress={uploadProgress} />
    {storedDAGShards?.map(({ cid, size }) => (
      <p className='text-xs max-w-full overflow-hidden text-ellipsis' key={cid.toString()}>
        shard {cid.toString()} ({humanFileSize(size)}) uploaded
      </p>
    ))}
  </div>
)

export const Errored = ({ error }: { error: any }): JSX.Element => (
  <div className='flex flex-col items-center'>
    <h1>
      ⚠️ Error: failed to upload file: {error.message}
    </h1>
    <p>Check the browser console for details.</p>
  </div>
)

interface DoneProps {
  file?: File
  dataCID?: CID
  storedDAGShards?: CARMetadata[]
}

export const Done = ({ dataCID }: DoneProps): JSX.Element => {
  const [, { setFile }] = useUploaderComponent()
  const cid: string = dataCID?.toString() ?? ''
  return (
    <div className='flex flex-col items-center w-full'>
      <h1 className='font-bold text-sm uppercase text-gray-400 mb-1 '>Uploaded</h1>
      <a
        className='font-mono text-xs max-w-full overflow-hidden no-wrap text-ellipsis'
        href={`https://${cid}.ipfs.${gatewayHost}/`}
      >
        {cid}
      </a>
      <div className='p-4'>
        <button
          className='w3ui-button'
          onClick={() => {
            setFile(undefined)
          }}
        >
          Add More
        </button>
      </div>
    </div>
  )
}

const UploaderForm = (): JSX.Element => {
  const [{ status, file }] = useUploaderComponent()
  const hasFile = file !== undefined
  return (
    <>
      <UploaderCore.Form>
        <div className={`relative h-52 p-8 rounded-md bg-white/5 hover:bg-white/10 border-2 border-dashed border-gray-600 flex flex-col justify-center items-center text-center`}>
          {hasFile ? '' : <span className='mb-5'><CloudArrowUpIcon className='w-8 h-8 text-gray-600' /></span>}
          <label className={`${hasFile ? 'hidden' : 'block h-px w-px overflow-hidden absolute whitespace-nowrap'}`}>File:</label>
          <UploaderCore.Input className={`${hasFile ? 'hidden' : 'block absolute inset-0 cursor-pointer w-full opacity-0'}`} />
          <UploaderContents />
          {hasFile ? '' : <span>Drag files or Click to Browse</span>}
        </div>
      </UploaderCore.Form>
      <div className='flex flex-col lg:flex-row space-y-4 lg:space-y-0 lg:space-x-4 mt-4 text-center lg:text-left'>
        <div className=''>
          <h4 className='text-sm mb-2'>🌎&nbsp;&nbsp;Public Data</h4>
          <p className='text-xs'>
            All data uploaded to w3up is available to anyone who requests it using the correct CID.
            Do not store any private or sensitive information in an unencrypted form using w3up.
          </p>
        </div>
        <div className=''>
          <h4 className='text-sm mb-2'>♾️&nbsp;&nbsp;Permanent Data</h4>
          <p className='text-xs'>
            Removing files from w3up will remove them from the file listing for your account, but that
            doesn’t prevent nodes on the decentralized storage network from retaining copies of the data
            indefinitely. Do not use w3up for data that may need to be permanently deleted in the future.
          </p>
        </div>
      </div>
    </>
  )
}

function pickFileIconLabel (file: File): string | undefined {
  const type = file.type.split('/')
  if (type.length === 0 || type.at(0) === '') {
    const ext = file.name.split('.').at(-1)
    if (ext !== undefined && ext.length < 5) {
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
  const hasFile = file !== undefined
  if (status === Status.Idle) {
    return hasFile
      ? (
        <>
          <div className='flex flex-row'>
            <div className='w-12 h-12 py-0.5 flex flex-col justify-center items-center bg-black text-xs uppercase text-center text-ellipsis rounded-xs mr-3' title={file.type}>
              {pickFileIconLabel(file)}
            </div>
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

const UploaderConsole = (): JSX.Element => {
  const [{ status, file, error, dataCID, storedDAGShards, uploadProgress }] =
    useUploaderComponent()

  switch (status) {
    case Status.Uploading: {
      return <Uploading file={file} storedDAGShards={storedDAGShards} uploadProgress={uploadProgress} />
    }
    case Status.Succeeded: {
      return (
        <Done file={file} dataCID={dataCID} storedDAGShards={storedDAGShards} />
      )
    }
    case Status.Failed: {
      return <Errored error={error} />
    }
    default: {
      return <></>
    }
  }
}

export interface SimpleUploaderProps {
  onUploadComplete?: OnUploadComplete
}

export const Uploader = ({
  onUploadComplete
}: SimpleUploaderProps): JSX.Element => {
  return (
    <UploaderCore
      as='div'
      onUploadComplete={onUploadComplete}
    >
      <UploaderForm />
    </UploaderCore>
  )
}
