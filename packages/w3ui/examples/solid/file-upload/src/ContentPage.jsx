import { createSignal, Switch, Match } from 'solid-js'
import { useUploader } from '@w3ui/solid-uploader'
import { withIdentity } from './components/Authenticator'
import Loader from './components/Loader'
import './spinner.css'

export function ContentPage () {
  const [progress, uploader] = useUploader()
  const [file, setFile] = createSignal(null)
  const [dataCid, setDataCid] = createSignal(null)
  const [status, setStatus] = createSignal('')
  const [error, setError] = createSignal(null)

  const handleUploadSubmit = async e => {
    e.preventDefault()
    try {
      setStatus('uploading')
      const cid = await uploader.uploadFile(file())
      setDataCid(cid)
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
      <Match when={status() === 'uploading'}>
        <Uploading file={file()} progress={progress} />
      </Match>
      <Match when={status() === 'done'}>
        {error() ? <Errored error={error()} /> : <Done file={file()} dataCid={dataCid()} storedDAGShards={progress.storedDAGShards} />}
      </Match>
    </Switch>
  )
}

const Uploading = props => (
  <div className='flex items-center'>
    <Loader className='mr3' progress={props.progress} />
    <div className='flex-auto'>
      <p className='truncate'>Uploading DAG for {props.file.name}</p>
      {props.progress.storedDAGShards.map(({ cid, size }) => (
        <p key={cid.toString()} className='f7 truncate'>
          {cid.toString()} ({size} bytes)
        </p>
      ))}
    </div>
  </div>
)

const Errored = props => (
  <div>
    <h1 className='near-white'>⚠️ Error: failed to upload file: {props.error.message}</h1>
    <p>Check the browser console for details.</p>
  </div>
)

const Done = props => (
  <div>
    <h1 className='near-white'>Done!</h1>
    <p className='f6 code truncate'>{props.dataCid.toString()}</p>
    <p><a href={`https://w3s.link/ipfs/${props.dataCid}`} className='blue'>View {props.file.name} on IPFS Gateway.</a></p>
    <p className='near-white'>Chunks ({props.storedDAGShards.length}):</p>
    {props.storedDAGShards.map(({ cid, size }) => (
      <p key={cid.toString()} className='f7 truncate'>
        {cid.toString()} ({size} bytes)
      </p>
    ))}
  </div>
)

export default withIdentity(ContentPage)
