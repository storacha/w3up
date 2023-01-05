import React, { useEffect } from 'react'
import { useUploadsList } from '@w3ui/react-uploads-list'
import { withIdentity } from './components/Authenticator'
import './spinner.css'

export function ContentPage () {
  const [{ loading, error, data }, { next, reload }] = useUploadsList()
  useEffect(() => {
    next()
    // we really only want to run this once so leave the deps list empty
  }, [])
  if (error) {
    return <Errored error={error} />
  }

  return (
    <div className='w-90 mw9'>
      {data && data.length
        ? (
          <div className='overflow-auto'>
            <table className='w-100 mb3 collapse'>
              <thead className='near-white tl'>
                <tr>
                  <th className='pa3'>Upload CID</th>
                </tr>
              </thead>
              <tbody>
                {data.map(({ root }) => (
                  <tr key={root.toString()} className='stripe-light'>
                    <td className='pa3'>
                      <a href={`https://w3s.link/ipfs/${root.toString()}`} className='gray'>
                        {root.toString()}
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          )
        : <p className='tc'>No uploads</p>}
      <button type='button' onClick={reload} className='ph3 pv2 mr3'>Refresh</button>
      {loading ? <span className='spinner dib' /> : null}
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
