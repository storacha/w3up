<script>
import { defineComponent, inject } from 'vue'
import { KeyringProviderInjectionKey } from '@w3ui/vue-keyring'

/**
 * Authenticator displays it's slot when an identity exists.
 */
export default defineComponent({
  inject: {
    agent: { from: KeyringProviderInjectionKey.agent },
    account: { from: KeyringProviderInjectionKey.account },
    createSpace: { from: KeyringProviderInjectionKey.createSpace },
    registerSpace: { from: KeyringProviderInjectionKey.registerSpace },
    authorize: { from: KeyringProviderInjectionKey.authorize },
    cancelAuthorize: { from: KeyringProviderInjectionKey.cancelAuthorize }
  },
  setup: function(){
    inject(KeyringProviderInjectionKey.loadAgent)()
  },
  data () {
    return {
      email: '',
      submitted: false
    }
  },
  methods: {
    async handleRegisterSubmit (e) {
      e.preventDefault()
      this.submitted = true
      try {
        await this.authorize(this.email)
        await this.createSpace()
        await this.registerSpace(this.email)
      } catch (err) {
        throw new Error('failed to register', { cause: err })
      } finally {
        this.submitted = false
      }
    },
    handleCancelRegisterSubmit (e) {
      e.preventDefault()
      this.cancelAuthorize()
    }
  }
})
</script>

<template>
  <div v-if="account">
    <slot></slot>
  </div>

  <div v-if="submitted" className="w-90 w-50-ns mw6">
    <h1 className="near-white">Verify your email address!</h1>
    <p>Click the link in the email we sent to {{agent?.email}} to sign in.</p>
    <form @submit="handleCancelRegisterSubmit">
      <button type="submit" className="ph3 pv2">Cancel</button>
    </form>
  </div>

  <form v-if="!account && !submitted" @submit="handleRegisterSubmit" className="w-90 w-50-ns mw6">
    <div className="mb3">
      <label htmlFor="email" className="db mb2">Email address:</label>
      <input id="email" className="db pa2 w-100" type="email" v-model="email" required />
    </div>
    <button type="submit" className="ph3 pv2" :disabled="submitted">Authorize</button>
  </form>
</template>
