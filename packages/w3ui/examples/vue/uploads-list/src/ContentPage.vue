<script>
import { UploadsListProviderInjectionKey } from '@w3ui/vue-uploads-list'

export default {
  inject: {
    loading: { from: UploadsListProviderInjectionKey.loading },
    data: { from: UploadsListProviderInjectionKey.data },
    error: { from: UploadsListProviderInjectionKey.error },
    reload: { from: UploadsListProviderInjectionKey.reload }
  }
}
</script>

<template>
  <div v-if="error == null">
    <div v-if="data && data.results.length" className='overflow-auto'>
      <table className='w-100 mb3 collapse'>
        <thead className='near-white tl'>
          <tr>
            <th className='pa3'>Data CID</th>
            <th className='pa3'>CAR CID</th>
            <th className='pa3'>Date</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="upload in data.results" className='stripe-light'>
            <td className='pa3'>{{upload.dataCid}}</td>
            <td className='pa3'>{{upload.carCids[0]}}</td>
            <td className='pa3'>{{upload.uploadedAt.toLocaleString()}}</td>
          </tr>
        </tbody>
      </table>
    </div>
    <p v-else className='tc'>No uploads</p>
    <button type='button' @click="reload" className='mr3'>🔄 Refresh</button>
    <span v-if="loading" className='spinner dib'></span>
  </div>
  <div v-else>
    <h1 className='near-white'>⚠️ Error: failed to list uploads: {{error.message}}</h1>
    <p>Check the browser console for details.</p>
  </div>
</template>
  