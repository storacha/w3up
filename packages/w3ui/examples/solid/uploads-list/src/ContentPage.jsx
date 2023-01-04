import { Switch, Match } from 'solid-js'
import { useKeyring } from '@w3ui/solid-keyring'
import { createUploadsListResource } from '@w3ui/solid-uploads-list'
import { withIdentity } from './components/Authenticator'
import './spinner.css'

export function ContentPage () {
  const [keyringState, keyringActions] = useKeyring()
  const [data, { refetch }] = createUploadsListResource(() => ({ ...keyringState, ...keyringActions }), { initialValue: { results: [] } })

  return (
    <div className='w-90 mw9'>
      <Switch>
        <Match when={data.state === 'errored'}>
          <Errored error={data.error} />
        </Match>
        <Match when={data.state === 'ready'}>
          {data().results.length
            ? (
              <div className='overflow-auto'>
                <table className='w-100 mb3 collapse'>
                  <thead className='near-white tl'>
                    <tr>
                      <th className='pa3'>Data CID</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data().results.map(({ root }) => (
                      <tr key={root.toString()} className='stripe-light'>
                        <td className='pa3'>{root.toString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              )
            : <p className='tc'>No uploads</p>}
        </Match>
      </Switch>
      <button type='button' onClick={refetch} className='ph3 pv2 mr3'>Refresh</button>
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
