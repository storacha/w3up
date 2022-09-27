import { Switch, Match } from 'solid-js'
import { useAuth } from '@w3ui/solid-wallet'
import { createUploadsListResource } from '@w3ui/solid-uploads-list'
import { withIdentity } from './components/Authenticator'
import './spinner.css'

export function ContentPage () {
  const [auth] = useAuth()
  const [data, { refetch }] = createUploadsListResource(() => auth.identity, { initialValue: [] })

  return (
    <div>
      <Switch>
        <Match when={data.state === 'errored'}>
          <Errored error={data.error} />
        </Match>
        <Match when={data.state === 'ready'}>
          <table className='mb3'>
            {data().map(cid => (
              <tr key={cid}>
                <td>{cid}</td>
              </tr>
            ))}
          </table>
        </Match>
      </Switch>
      <button type='button' onClick={refetch} className='mr3'>🔄 Refresh</button>
      {data.loading ? <span className='spinner dib' /> : null}
    </div>
  )
}

const Errored = ({ error }) => (
  <div>
    <h1 className='near-white'>⚠️ Error: failed to list uploads: {error.message}</h1>
    <p>Check the browser console for details.</p>
  </div>
)

export default withIdentity(ContentPage)
