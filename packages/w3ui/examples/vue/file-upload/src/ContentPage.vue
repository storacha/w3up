<script>
import { UploaderProviderInjectionKey } from '@w3ui/vue-uploader'
import Loader from './components/Loader.vue'

export default {
  inject: {
    uploadFile: { from: UploaderProviderInjectionKey.uploadFile },
    storedDAGShards: { from: UploaderProviderInjectionKey.storedDAGShards },
    uploadProgress: { from: UploaderProviderInjectionKey.uploadProgress }

  },
  data () {
    return {
      file: null,
      dataCid: null,
      status: '',
      error: null
    }
  },
  methods: {
    async handleUploadSubmit (e) {
      e.preventDefault()
      try {
        this.status = 'uploading'
        const cid = await this.uploadFile(this.file)
        this.dataCid = cid
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
  },
  components: { Loader }
}
</script>

<template>
  <div v-if="status === 'uploading'" className="flex items-center">
    <Loader className="mr3 flex-none" :uploadProgress="uploadProgress" />
    <div className="flex-auto">
      <p className="truncate">Uploading DAG for {{file.name}}</p>
      <p className="f6 code truncate">{{dataCid}}</p>
      <p v-for="chunk of storedDAGShards" className="f7 truncate">
        {{chunk.cid.toString()}} ({{chunk.size}} bytes)
      </p>
    </div>
  </div>

  <div v-if="status === 'done' && error != null">
    <h1 className="near-white">⚠️ Error: failed to upload file: {{error.message}}</h1>
    <p>Check the browser console for details.</p>
  </div>

  <div v-if="status === 'done' && error == null">
    <h1 className="near-white">Done!</h1>
    <p className="f6 code truncate">{{dataCid}}</p>
    <p><a :href="'https://w3s.link/ipfs/' + dataCid" className="blue">View {{file.name}} on IPFS Gateway.</a></p>
    <p className="near-white">Chunks ({{storedDAGShards.length}}):</p>
    <p v-for="chunk of storedDAGShards" className="f7 truncate">
      {{chunk.cid.toString()}} ({{chunk.size}} bytes)
    </p>
  </div>

  <form v-if="!status" @submit="handleUploadSubmit">
    <div className="db mb3">
      <label htmlFor="file" className="db mb2">File:</label>
      <input id="file" className="db pa2 w-100 ba br2" type="file" @change="handleFileChange" required />
    </div>
    <button type="submit" className="ph3 pv2">Upload</button>
  </form>
</template>
