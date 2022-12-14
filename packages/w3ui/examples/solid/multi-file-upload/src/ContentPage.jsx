import { createSignal, Switch, Match } from 'solid-js'
import { useUploader } from '@w3ui/solid-uploader'
import { withIdentity } from './components/Authenticator'
import './spinner.css'

export function ContentPage () {
  const [progress, uploader] = useUploader()
  const [files, setFiles] = createSignal([])
  const [allowDirectory, setAllowDirectory] = createSignal(false)
  const [wrapInDirectory, setWrapInDirectory] = createSignal(false)
  const [dataCid, setDataCid] = createSignal('')
  const [status, setStatus] = createSignal('')
  const [error, setError] = createSignal(null)

  const handleUploadSubmit = async e => {
    e.preventDefault()
    try {
      setStatus('uploading')
      const cid = files().length > 1
        ? await uploader.uploadDirectory(files())
        : wrapInDirectory
          ? await uploader.uploadDirectory(files())
          : await uploader.uploadFile(files()[0])
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
            <label htmlFor='file' className='db mb2'>Files:</label>
            {allowDirectory()
              ? <input id='file' className='db pa2 w-100 ba br2' type='file' webkitdirectory='true' onChange={e => setFiles(Array.from(e.target.files))} required />
              : <input id='file' className='db pa2 w-100 ba br2' type='file' multiple onChange={e => setFiles(Array.from(e.target.files))} required />}
          </div>
          <div className='mb3'>
            <label>
              <input type='checkbox' value={allowDirectory()} onChange={e => setAllowDirectory(e.target.checked)} /> Allow directory selection
            </label>
          </div>
          {files().length === 1
            ? (
              <div className='mb3'>
                <label>
                  <input type='checkbox' value={wrapInDirectory()} onChange={e => setWrapInDirectory(e.target.checked)} /> Wrap file in a directory
                </label>
              </div>
              )
            : null}
          <button type='submit' className='ph3 pv2'>Upload</button>
        </form>
      </Match>
      <Match when={status() === 'uploading'}>
        <Uploading files={files()} storedDAGShards={progress.storedDAGShards} />
      </Match>
      <Match when={status() === 'done'}>
        {error() ? <Errored error={error()} /> : <Done files={files()} dataCid={dataCid()} storedDAGShards={progress.storedDAGShards} />}
      </Match>
    </Switch>
  )
}

const Uploading = props => (
  <div className='flex items-center'>
    <div className='spinner mr3 flex-none' />
    <div className='flex-auto'>
      <p className='truncate'>Uploading DAG for {props.files.length > 1 ? `${props.files.length} files` : props.files[0].name}</p>
      {props.storedDAGShards.map(({ cid, size }) => (
        <p key={cid.toString()} className='f7 truncate'>
          {cid.toString()} ({size} bytes)
        </p>
      ))}
    </div>
  </div>
)

const Errored = props => (
  <div>
    <h1 className='near-white'>⚠️ Error: failed to upload file(s): {props.error.message}</h1>
    <p>Check the browser console for details.</p>
  </div>
)

const Done = props => (
  <div>
    <h1 className='near-white'>Done!</h1>
    <p className='f6 code truncate'>{props.dataCid.toString()}</p>
    <p><a href={`https://w3s.link/ipfs/${props.dataCid}`} className='blue'>View {props.files.length > 1 ? 'files' : props.files[0].name} on IPFS Gateway.</a></p>
    <p className='near-white'>Chunks ({props.storedDAGShards.length}):</p>
    {props.storedDAGShards.map(({ cid, size }) => (
      <p key={cid.toString()} className='f7 truncate'>
        {cid.toString()} ({size} bytes)
      </p>
    ))}
  </div>
)

export default withIdentity(ContentPage)
