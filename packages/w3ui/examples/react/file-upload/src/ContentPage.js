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
      const { cid, car } = await uploader.encodeFile(file)
      setRootCid(cid.toString())

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
    <form onSubmit={handleUploadSubmit}>
      <div className='db mb3'>
        <label htmlFor='file' className='db mb2 light-silver'>File:</label>
        <input id='file' className='db pa2 w-100 ba br2 light-silver' type='file' onChange={e => setFile(e.target.files[0])} required />
      </div>
      <button type='submit' className='ph3 pv2'>Upload</button>
    </form>
  )
}

const Encoding = ({ file }) => (
  <div className='flex items-center'>
    <div className='spinner mr3 flex-none' />
    <div className='flex-auto'>
      <p className='truncate light-silver'>Building DAG for {file.name}</p>
    </div>
  </div>
)

const Uploading = ({ file, cid }) => (
  <div className='flex items-center'>
    <div className='spinner mr3 flex-none' />
    <div className='flex-auto'>
      <p className='truncate light-silver'>Uploading DAG for {file.name}</p>
      <p className='f6 code truncate'>{cid}</p>
    </div>
  </div>
)

const Errored = ({ error }) => (
  <div>
    <h1 className='near-white'>⚠️ Error: failed to upload file: {error.message}</h1>
    <p className='light-silver'>Check the browser console for details.</p>
  </div>
)

const Done = ({ file, cid }) => (
  <div>
    <h1 className='near-white'>Done!</h1>
    <p className='f6 code truncate light-silver'>{cid}</p>
    <p><a href={`https://w3s.link/ipfs/${cid}`} className='blue'>View {file.name} on IPFS Gateway.</a></p>
  </div>
)

export default withIdentity(ContentPage)
