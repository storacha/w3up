<script>
import { AuthProviderInjectionKey, AuthStatus } from '@w3ui/vue-wallet'

export default {
  inject: {
    identity: { from: AuthProviderInjectionKey.identity },
    status: { from: AuthProviderInjectionKey.status },
    registerAndStoreIdentity: { from: AuthProviderInjectionKey.registerAndStoreIdentity },
    cancelRegisterAndStoreIdentity: { from: AuthProviderInjectionKey.cancelRegisterAndStoreIdentity },
    unloadIdentity: { from: AuthProviderInjectionKey.unloadIdentity }
  },
  data () {
    return {
      email: '',
      submitted: false
    }
  },
  computed: {
    AuthStatus: () => AuthStatus
  },
  methods: {
    async handleRegisterSubmit (e) {
      e.preventDefault()
      this.submitted = true
      try {
        await this.registerAndStoreIdentity(this.email)
      } catch (err) {
        throw new Error('failed to register', { cause: err })
      } finally {
        this.submitted = false
      }
    },
    handleCancelRegisterSubmit (e) {
      e.preventDefault()
      this.cancelRegisterAndStoreIdentity()
    },
    handleSignOutSubmit (e) {
      e.preventDefault()
      this.unloadIdentity()
    }
  }
}
</script>

<template>
  <div v-if="status === AuthStatus.SignedIn">
    <h1 className="near-white">Welcome {{identity.email}}!</h1>
    <p>You are logged in!!</p>
    <form @submit="handleSignOutSubmit">
      <button type="submit" className="ph3 pv2">Sign Out</button>
    </form>
  </div>

  <div v-if="status === AuthStatus.EmailVerification">
    <h1 className="near-white">Verify your email address!</h1>
    <p>Click the link in the email we sent to {{identity.email}} to sign in.</p>
    <form @submit="handleCancelRegisterSubmit">
      <button type="submit" className="ph3 pv2">Cancel</button>
    </form>
  </div>

  <form v-if="status === AuthStatus.SignedOut" @submit="handleRegisterSubmit">
    <div className="mb3">
      <label htmlFor="email" className="db mb2">Email address:</label>
      <input id="email" className="db pa2 w-100" type="email" v-model="email" required />
    </div>
    <button type="submit" className="ph3 pv2" :disabled="submitted">Register</button>
  </form>
</template>
  