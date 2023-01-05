import React, { useState } from 'react'
import { useUploader } from '@w3ui/react-uploader'
import { withIdentity } from './components/Authenticator'
import './spinner.css'

export function ContentPage () {
  const [{ storedDAGShards }, uploader] = useUploader()
  const [files, setFiles] = useState([])
  const [allowDirectory, setAllowDirectory] = useState(false)
  const [wrapInDirectory, setWrapInDirectory] = useState(false)
  const [dataCid, setDataCid] = useState('')
  const [status, setStatus] = useState('')
  const [error, setError] = useState(null)

  if (!uploader) return null

  const handleUploadSubmit = async e => {
    e.preventDefault()
    try {
      setStatus('uploading')
      const cid = files.length > 1
        ? await uploader.uploadDirectory(files)
        : wrapInDirectory
          ? await uploader.uploadDirectory(files)
          : await uploader.uploadFile(files[0])
      setDataCid(cid.toString())
    } catch (err) {
      console.error(err)
      setError(err)
    } finally {
      setStatus('done')
    }
  }

  if (status === 'uploading') {
    return <Uploading files={files} storedDAGShards={storedDAGShards} />
  }

  if (status === 'done') {
    return error ? <Errored error={error} /> : <Done files={files} dataCid={dataCid} storedDAGShards={storedDAGShards} />
  }

  return (
    <form onSubmit={handleUploadSubmit}>
      <div className='mb3'>
        <label htmlFor='files' className='db mb2'>Files:</label>
        {allowDirectory
          ? <input id='file' className='db pa2 w-100 ba br2' type='file' webkitdirectory='true' onChange={e => setFiles(Array.from(e.target.files))} required />
          : <input id='file' className='db pa2 w-100 ba br2' type='file' multiple onChange={e => setFiles(Array.from(e.target.files))} required />}
      </div>
      <div className='mb3'>
        <label>
          <input type='checkbox' value={allowDirectory} onChange={e => setAllowDirectory(e.target.checked)} /> Allow directory selection
        </label>
      </div>
      {files.length === 1
        ? (
          <div className='mb3'>
            <label>
              <input type='checkbox' value={wrapInDirectory} onChange={e => setWrapInDirectory(e.target.checked)} /> Wrap file in a directory
            </label>
          </div>
          )
        : null}
      <button type='submit' className='ph3 pv2'>Upload</button>
    </form>
  )
}

const Uploading = ({ files, storedDAGShards }) => (
  <div className='flex items-center'>
    <div className='spinner mr3 flex-none' />
    <div className='flex-auto'>
      <p className='truncate'>Uploading DAG for {files.length > 1 ? `${files.length} files` : files[0].name}</p>
      {storedDAGShards.map(({ cid, size }) => (
        <p key={cid.toString()} className='f7 truncate'>
          {cid.toString()} ({size} bytes)
        </p>
      ))}
    </div>
  </div>
)

const Errored = ({ error }) => (
  <div>
    <h1 className='near-white'>⚠️ Error: failed to upload file(s): {error.message}</h1>
    <p>Check the browser console for details.</p>
  </div>
)

const Done = ({ files, dataCid, storedDAGShards }) => (
  <div>
    <h1 className='near-white'>Done!</h1>
    <p className='f6 code truncate'>{dataCid.toString()}</p>
    <p><a href={`https://w3s.link/ipfs/${dataCid}`} className='blue'>View {files.length > 1 ? 'files' : files[0].name} on IPFS Gateway.</a></p>
    <p className='near-white'>Chunks ({storedDAGShards.length}):</p>
    {storedDAGShards.map(({ cid, size }) => (
      <p key={cid.toString()} className='f7 truncate'>
        {cid.toString()} ({size} bytes)
      </p>
    ))}
  </div>
)

export default withIdentity(ContentPage)
