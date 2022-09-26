import { createSignal, Switch, Match } from 'solid-js'
import { useUploader } from '@w3ui/solid-uploader'
import { withIdentity } from './components/Authenticator'
import './spinner.css'

export function ContentPage () {
  const [, uploader] = useUploader()
  const [file, setFile] = createSignal(null)
  const [rootCid, setRootCid] = createSignal('')
  const [status, setStatus] = createSignal('')
  const [error, setError] = createSignal(null)

  const handleUploadSubmit = async e => {
    e.preventDefault()
    try {
      // Build a DAG from the file data to obtain the root CID.
      setStatus('encoding')
      const { cid, car } = await uploader.encodeFile(file())
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

  return (
    <Switch>
      <Match when={status() === ''}>
        <form onSubmit={handleUploadSubmit}>
          <div className='db mb3'>
            <label htmlFor='file' className='db mb2'>File:</label>
            <input id='file' className='db pa2 w-100 ba br2' type='file' onChange={e => setFile(e.target.files[0])} required />
          </div>
          <button type='submit' className='ph3 pv2'>Upload</button>
        </form>
      </Match>
      <Match when={status() === 'encoding'}>
        <Encoding file={file()} />
      </Match>
      <Match when={status() === 'uploading'}>
        <Uploading file={file()} cid={rootCid()} />
      </Match>
      <Match when={status() === 'done'}>
        {error() ? <Errored error={error()} /> : <Done file={file()} cid={rootCid()} />}
      </Match>
    </Switch>
  )
}

const Encoding = ({ file }) => (
  <div className='flex items-center'>
    <div className='spinner mr3 flex-none' />
    <div className='flex-auto'>
      <p className='truncate'>Building DAG for {file.name}</p>
    </div>
  </div>
)

const Uploading = ({ file, cid }) => (
  <div className='flex items-center'>
    <div className='spinner mr3 flex-none' />
    <div className='flex-auto'>
      <p className='truncate'>Uploading DAG for {file.name}</p>
      <p className='f6 code truncate'>{cid}</p>
    </div>
  </div>
)

const Errored = ({ error }) => (
  <div>
    <h1>⚠️ Error: failed to upload file: {error.message}</h1>
    <p>Check the browser console for details.</p>
  </div>
)

const Done = ({ file, cid }) => (
  <div>
    <h1>Done!</h1>
    <p className='f6 code truncate'>{cid}</p>
    <p><a href={`https://w3s.link/ipfs/${cid}`}>View {file.name} on IPFS Gateway.</a></p>
  </div>
)

export default withIdentity(ContentPage)
