<script>
import { inject } from 'vue'
import { KeyringProviderInjectionKey } from '@w3ui/vue-keyring'

export default {
  inject: {
    account: { from: KeyringProviderInjectionKey.account },
    agent: { from: KeyringProviderInjectionKey.agent },
    authorize: { from: KeyringProviderInjectionKey.authorize },
    cancelAuthorize: { from: KeyringProviderInjectionKey.cancelAuthorize },
    unloadAgent: { from: KeyringProviderInjectionKey.unloadAgent }
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
  computed: {
  },
  methods: {
    async handleAuthorizeSubmit (e) {
      e.preventDefault()
      this.submitted = true
      try {
        await this.authorize(this.email)
      } catch (err) {
        throw new Error('failed to authorize', { cause: err })
      } finally {
        this.submitted = false
      }
    },
    handleCancelAuthorizeSubmit (e) {
      e.preventDefault()
      this.cancelAuthorize()
    },
    handleSignOutSubmit (e) {
      e.preventDefault()
      this.unloadAgent()
    }
  }
}
</script>

<template>
  <div v-if="account">
    <h1 className="near-white">Welcome {{account}}!</h1>
    <p>You are logged in!!</p>
    <form @submit="handleSignOutSubmit">
      <button type="submit" className="ph3 pv2">Sign Out</button>
    </form>
  </div>

  <div v-if="submitted">
    <h1 className="near-white">Verify your email address!</h1>
    <p>Click the link in the email we sent to {{account}} to sign in.</p>
    <form @submit="handleCancelAuthorizeSubmit">
      <button type="submit" className="ph3 pv2">Cancel</button>
    </form>
  </div>

  <form v-if="!account && !submitted" @submit="handleAuthorizeSubmit">
    <div className="mb3">
      <label htmlFor="email" className="db mb2">Email address:</label>
      <input id="email" className="db pa2 w-100" type="email" v-model="email" required />
    </div>
    <button type="submit" className="ph3 pv2" :disabled="submitted">Authorize</button>
  </form>
</template>
