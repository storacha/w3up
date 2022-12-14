<script>
import { KeyringProviderInjectionKey } from '@w3ui/vue-keyring'

export default {
  inject: {
    agent: { from: KeyringProviderInjectionKey.agent },
    space: { from: KeyringProviderInjectionKey.space },
    createSpace: { from: KeyringProviderInjectionKey.createSpace },
    registerSpace: { from: KeyringProviderInjectionKey.registerSpace },
    cancelRegisterSpace: { from: KeyringProviderInjectionKey.cancelRegisterSpace },
    unloadAgent: { from: KeyringProviderInjectionKey.unloadAgent }
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
    async handleRegisterSubmit (e) {
      e.preventDefault()
      this.submitted = true
      try {
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
      this.cancelRegisterSpace()
    },
    handleSignOutSubmit (e) {
      e.preventDefault()
      this.unloadAgent()
    }
  }
}
</script>

<template>
  <div v-if="space?.registered()">
    <h1 className="near-white">Welcome {{agent.email}}!</h1>
    <p>You are logged in!!</p>
    <form @submit="handleSignOutSubmit">
      <button type="submit" className="ph3 pv2">Sign Out</button>
    </form>
  </div>

  <div v-if="submitted">
    <h1 className="near-white">Verify your email address!</h1>
    <p>Click the link in the email we sent to {{agent.email}} to sign in.</p>
    <form @submit="handleCancelRegisterSubmit">
      <button type="submit" className="ph3 pv2">Cancel</button>
    </form>
  </div>

  <form v-if="!space?.registered() && !submitted" @submit="handleRegisterSubmit">
    <div className="mb3">
      <label htmlFor="email" className="db mb2">Email address:</label>
      <input id="email" className="db pa2 w-100" type="email" v-model="email" required />
    </div>
    <button type="submit" className="ph3 pv2" :disabled="submitted">Register</button>
  </form>
</template>
