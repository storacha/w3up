<script>
import { defineComponent } from 'vue'
import { AuthProviderInjectionKey, AuthStatus } from '@w3ui/vue-wallet'

/**
 * Authenticator displays it's slot when an identity exists.
 */
export default defineComponent({
  inject: {
    identity: { from: AuthProviderInjectionKey.identity },
    status: { from: AuthProviderInjectionKey.status },
    registerAndStoreIdentity: { from: AuthProviderInjectionKey.registerAndStoreIdentity },
    cancelRegisterAndStoreIdentity: { from: AuthProviderInjectionKey.cancelRegisterAndStoreIdentity },
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
    }
  }
})
</script>

<template>
  <div v-if="status === AuthStatus.SignedIn">
    <slot></slot>
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
