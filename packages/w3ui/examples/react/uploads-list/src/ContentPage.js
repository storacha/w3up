import React from 'react'
import { useUploadsList } from '@w3ui/react-uploads-list'
import { withIdentity } from './components/Authenticator'
import './spinner.css'

export function ContentPage () {
  const { loading, error, data, reload } = useUploadsList()

  if (error) {
    return <Errored error={error} />
  }

  return (
    <div className='w-90 mw9'>
      {data && data.results.length
        ? (
          <div className='overflow-auto'>
            <table className='w-100 mb3 collapse'>
              <thead className='near-white tl'>
                <tr>
                  <th className='pa3'>Data CID</th>
                  <th className='pa3'>CAR CID</th>
                  <th className='pa3'>Date</th>
                </tr>
              </thead>
              <tbody>
                {data.results.map(({ dataCid, carCids, uploadedAt }) => (
                  <tr key={dataCid} className='stripe-light'>
                    <td className='pa3'>{dataCid}</td>
                    <td className='pa3'>{carCids[0]}</td>
                    <td className='pa3'>{uploadedAt.toLocaleString()}</td>
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
