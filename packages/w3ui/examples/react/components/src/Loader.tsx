import React, { ReactNode } from 'react'
import { ArrowPathIcon } from '@heroicons/react/20/solid'
import { ProgressStatus, UploadProgress } from '@w3ui/react'

function StatusLoader({
  progressStatus,
}: {
  progressStatus: ProgressStatus
}): ReactNode {
  const { total, loaded, lengthComputable } = progressStatus
  if (lengthComputable) {
    const percentComplete = Math.floor((loaded / total) * 100)
    return (
      <div className="relative w2 h5 ba b--white flex flex-column justify-end">
        <div
          className="bg-white w100"
          style={{ height: `${percentComplete}%` }}
        ></div>
      </div>
    )
  } else {
    return <ArrowPathIcon className="animate-spin h-4 w-4" />
  }
}

interface LoaderProps {
  uploadProgress: UploadProgress
  className?: string
}

export function UploadLoader({
  uploadProgress,
  className = '',
}: LoaderProps): ReactNode {
  return (
    <div className={`${className} flex flex-row`}>
      {Object.values(uploadProgress).map((status) => (
        <StatusLoader progressStatus={status} key={status.url} />
      ))}
    </div>
  )
}

export function Loader(): ReactNode {
  return <ArrowPathIcon className="animate-spin h-12 w-12 mx-auto mt-12" />
}
