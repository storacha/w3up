import React, { useState } from 'react'
import { useUploader } from '@w3ui/react-uploader'
import { withIdentity } from './components/Authenticator'
import './spinner.css'

export function ContentPage () {
  const { uploader } = useUploader()
  const [file, setFile] = useState(null)
  const [rootCid, setRootCid] = useState('')
  const [status, setStatus] = useState('')
  const [error, setError] = useState(null)

  if (!uploader) return null

  const handleUploadSubmit = async e => {
    e.preventDefault()
    try {
      // Build a DAG from the file data to obtain the root CID.
      setStatus('encoding')
      const { root, car } = await uploader.encodeFile(file)
      setRootCid(root.toString())

      // Upload the DAG to the service.
      setStatus('uploading')
      await uploader.uploadCar(car)
    } catch (err) {
      console.error(err)
      setError(err)
    } finally {
      setStatus('done')
    }
  }

  if (status === 'encoding') {
    return <Encoding file={file} />
  }

  if (status === 'uploading') {
    return <Uploading file={file} cid={rootCid} />
  }

  if (status === 'done') {
    return error ? <Errored error={error} /> : <Done file={file} cid={rootCid} />
  }

  return (
    <form onSubmit={handleUploadSubmit} className='w-25'>
      <div className='db mb3'>
        <label htmlFor='file' className='db mb2'>File:</label>
        <input id='file' className='db pa2 w-100' type='file' onChange={e => setFile(e.target.files[0])} required />
      </div>
      <button type='submit' className='ph3 pv2'>Upload</button>
    </form>
  )
}

const Encoding = ({ file }) => (
  <div className='w-50'>
    <div className='flex items-center'>
      <div className='spinner mr3' />
      <div>
        <p>Building DAG for {file.name}....</p>
      </div>
    </div>
  </div>
)

const Uploading = ({ file, cid }) => (
  <div className='w-50'>
    <div className='flex items-center'>
      <div className='spinner mr3' />
      <div>
        <p>Uploading DAG for {file.name}....</p>
        <p>CID: <code>{cid}</code></p>
      </div>
    </div>
  </div>
)

const Errored = ({ error }) => (
  <div className='w-50'>
    <h1>⚠️ Error: failed to upload file: {error.message}</h1>
    <p>Check the browser console for details.</p>
  </div>
)

const Done = ({ file, cid }) => (
  <div className='w-50'>
    <h1>Done!</h1>
    <p>CID: <code>{cid}</code></p>
    <p><a href={`https://w3s.link/ipfs/${cid}`}>View {file.name} on IPFS Gateway.</a></p>
  </div>
)

export default withIdentity(ContentPage)
