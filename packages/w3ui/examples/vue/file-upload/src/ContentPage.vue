<script>
import { UploaderProviderInjectionKey } from '@w3ui/vue-uploader'

export default {
  inject: {
    encodeFile: { from: UploaderProviderInjectionKey.encodeFile },
    uploadCar: { from: UploaderProviderInjectionKey.uploadCar }
  },
  data () {
    return {
      file: null,
      rootCid: null,
      status: '',
      error: null
    }
  },
  methods: {
    async handleUploadSubmit (e) {
      e.preventDefault()
      try {
        // Build a DAG from the file data to obtain the root CID.
        this.status = 'encoding'
        const { cid, car } = await this.encodeFile(this.file)
        this.rootCid = cid.toString()

        // Upload the DAG to the service.
        this.status = 'uploading'
        await this.uploadCar(car)
      } catch (err) {
        console.error(err)
        this.error = err
      } finally {
        this.status = 'done'
      }
    },
    handleFileChange (e) {
      e.preventDefault()
      this.file = e.target.files[0]
    }
  }
}
</script>

<template>
  <div v-if="status === 'encoding'" className='flex items-center'>
    <div className='spinner mr3 flex-none'></div>
    <div className='flex-auto'>
      <p className='truncate'>Building DAG for {{file.name}}</p>
    </div>
  </div>

  <div v-if="status === 'uploading'" className='flex items-center'>
    <div className='spinner mr3 flex-none'></div>
    <div className='flex-auto'>
      <p className='truncate'>Uploading DAG for {{file.name}}</p>
      <p className='f6 code truncate'>{{rootCid}}</p>
    </div>
  </div>

  <div v-if="status === 'done' && error != null">
    <h1 className='near-white'>⚠️ Error: failed to upload file: {{error.message}}</h1>
    <p>Check the browser console for details.</p>
  </div>

  <div v-if="status === 'done' && error == null">
    <h1 className='near-white'>Done!</h1>
    <p className='f6 code truncate'>{cid}</p>
    <p><a :href="'https://w3s.link/ipfs/' + rootCid" className='blue'>View {{file.name}} on IPFS Gateway.</a></p>
  </div>

  <form v-if="!status" @submit="handleUploadSubmit">
    <div className='db mb3'>
      <label htmlFor='file' className='db mb2'>File:</label>
      <input id='file' className='db pa2 w-100 ba br2' type='file' @change="handleFileChange" required />
    </div>
    <button type='submit' className='ph3 pv2'>Upload</button>
  </form>
</template>
  