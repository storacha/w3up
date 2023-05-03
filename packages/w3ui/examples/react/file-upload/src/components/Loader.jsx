function StatusLoader ({ progressStatus }) {
  const { total, loaded, lengthComputable } = progressStatus
  if (lengthComputable) {
    const percentComplete = Math.floor((loaded / total) * 100)
    return (
      <div className='relative w2 h5 ba b--white flex flex-column justify-end'>
        <div className='bg-white w100' style={{ height: `${percentComplete}%` }}>
        </div>
      </div>
    )
  } else {
    return <ArrowPathIcon className='animate-spin h-4 w-4' />
  }
}

export default function Loader ({ uploadProgress, className = '' }) {
  return (
    <div className={`${className} flex flex-row`}>
      {Object.values(uploadProgress).map(
        status => <StatusLoader progressStatus={status} key={status.url} />
      )}
    </div>
  )
}