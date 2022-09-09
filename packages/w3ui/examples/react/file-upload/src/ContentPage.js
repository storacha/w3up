import React, { useState } from 'react'
import { useUploader } from '@w3ui/react-uploader'
import { withIdentity } from './components/Authenticator'

export function ContentPage () {
  const { uploader } = useUploader()
  if (!uploader) return null

  const [file, setFile] = useState([])
  const [cid, setCid] = useState('')

  const handleUploadSubmit = async e => {
    e.preventDefault()
    try {
      await uploader
    } catch (err) {
      throw new Error('failed to upload files', { cause: err })
    }
  }

  return (
    <form onSubmit={handleUploadSubmit} className='w-25'>
      <div className='db mb3'>
        <label htmlFor='file' className='db mb2'>File:</label>
        <input id='file' className='db pa2 w-100' type='file' value={file} onChange={e => setFile(e.target.files[0])} required />
      </div>
      <button type='submit' className='ph3 pv2'>Register</button>
    </form>
  )
}

export default withIdentity(ContentPage)
