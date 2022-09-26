import { createSignal, Switch, Match } from 'solid-js'
import { useUploader } from '@w3ui/solid-uploader'
import { withIdentity } from './components/Authenticator'
import './spinner.css'

export function ContentPage () {
  const [, uploader] = useUploader()
  const [files, setFiles] = createSignal([])
  const [allowDirectory, setAllowDirectory] = createSignal(false)
  const [wrapInDirectory, setWrapInDirectory] = createSignal(false)
  const [rootCid, setRootCid] = createSignal('')
  const [status, setStatus] = createSignal('')
  const [error, setError] = createSignal(null)

  const handleUploadSubmit = async e => {
    e.preventDefault()
    try {
      // Build a DAG from the file data to obtain the root CID.
      setStatus('encoding')
      const { cid, car } = files().length > 1
        ? await uploader.encodeDirectory(files())
        : wrapInDirectory()
          ? await uploader.encodeDirectory(files())
          : await uploader.encodeFile(files()[0])

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
      <Match when={status() === 'encoding'}>
        <Encoding files={files()} />
      </Match>
      <Match when={status() === 'uploading'}>
        <Uploading files={files()} cid={rootCid()} />
      </Match>
      <Match when={status() === 'done'}>
        {error() ? <Errored error={error()} /> : <Done files={files()} cid={rootCid()} />}
      </Match>
    </Switch>
  )
}

const Encoding = ({ files }) => (
  <div className='flex items-center'>
    <div className='spinner mr3 flex-none' />
    <div className='flex-auto'>
      <p className='truncate'>Building DAG for {files.length > 1 ? `${files.length} files` : files[0].name}</p>
    </div>
  </div>
)

const Uploading = ({ files, cid }) => (
  <div className='flex items-center'>
    <div className='spinner mr3 flex-none' />
    <div className='flex-auto'>
      <p className='truncate'>Uploading DAG for {files.length > 1 ? `${files.length} files` : files[0].name}</p>
      <p className='f6 code truncate'>{cid}</p>
    </div>
  </div>
)

const Errored = ({ error }) => (
  <div>
    <h1>⚠️ Error: failed to upload file(s): {error.message}</h1>
    <p>Check the browser console for details.</p>
  </div>
)

const Done = ({ files, cid }) => (
  <div>
    <h1>Done!</h1>
    <p className='f6 code truncate'>{cid}</p>
    <p><a href={`https://w3s.link/ipfs/${cid}`}>View {files.length > 1 ? 'files' : files[0].name} on IPFS Gateway.</a></p>
  </div>
)

export default withIdentity(ContentPage)
