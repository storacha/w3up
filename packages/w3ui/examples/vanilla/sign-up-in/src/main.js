import './assets/tachyons.min.css'

import {
  createIdentity,
  registerIdentity,
  sendVerificationEmail,
  waitIdentityVerification,
  removeIdentity,
  storeIdentity,
  loadDefaultIdentity
} from '@w3ui/keyring-core'

const SELECTORS = {
  authForm: '#sign-up-in-form',
  cancelRegistrationButton: '#cancel-registration',
  signOutButton: '#sign-out',
  verificationTemplate: '#verification-required-template',
  confirmationTemplate: '#registration-success-template'
}

export const EVENTS = {
  registrationStart: 'registration:start',
  registrationSuccess: 'registration:success'
}

export class RegisterForm extends window.HTMLElement {
  constructor () {
    super()
    this.identity = null
    this.email = null
    this.form$ = document.querySelector(SELECTORS.authForm)
    this.confirmationTemplate$ = document.querySelector(SELECTORS.confirmationTemplate)
    this.verificationTemplate$ = document.querySelector(SELECTORS.verificationTemplate)
    this.submitHandler = this.submitHandler.bind(this)
    this.cancelRegistrationHandler = this.cancelRegistrationHandler.bind(this)
    this.signOutHandler = this.signOutHandler.bind(this)
    this.formatTemplateContent = this.formatTemplateContent.bind(this)
  }

  async connectedCallback () {
    this.form$.addEventListener('submit', this.submitHandler)

    const identity = await loadDefaultIdentity()

    if (identity) {
      this.identity = identity
      this.email = identity.email
      this.toggleConfirmation()
      console.log(`DID: ${identity.signingPrincipal.did()}`)
    } else {
      console.log('No identity registered')
    }
  }

  formatTemplateContent (templateContent) {
    templateContent.querySelector('[data-email-slot]').innerHTML = this.email
    return templateContent
  }

  toggleConfirmation () {
    const templateContent = this.confirmationTemplate$.content
    this.replaceChildren(this.formatTemplateContent(templateContent))
    this.signOutButton$ = document.querySelector(SELECTORS.signOutButton)
    this.signOutButton$.addEventListener('click', this.signOutHandler)
  }

  toggleVerification () {
    const templateContent = this.verificationTemplate$.content
    this.replaceChildren(this.formatTemplateContent(templateContent))
    this.cancelRegistrationButton$ = document.querySelector(SELECTORS.cancelRegistrationButton)
    this.cancelRegistrationButton$.addEventListener('click', this.cancelRegistrationHandler)
  }

  disconnectedCallback () {
    this.form$?.removeEventListener('submit', this.submitHandler)
  }

  async cancelRegistrationHandler (e) {
    e.preventDefault()
    window.location.reload()
  }

  async signOutHandler (e) {
    e.preventDefault()
    if (this.identity) {
      await removeIdentity(this.identity)
    }
    window.location.reload()
  }

  async submitHandler (e) {
    e.preventDefault()
    const fd = new window.FormData(e.target)
    // log in a user by their email
    const email = fd.get('email')
    this.email = email
    let identity
    let proof

    if (email) {
      const unverifiedIdentity = await createIdentity({ email })
      console.log(`DID: ${unverifiedIdentity.signingPrincipal.did()}`)
      await sendVerificationEmail(unverifiedIdentity)
      const controller = new AbortController()

      try {
        this.toggleVerification(true);
        ({ identity, proof } = await waitIdentityVerification(
          unverifiedIdentity,
          {
            signal: controller.signal
          }
        ))
        await registerIdentity(identity, proof)
        await storeIdentity(identity)
        this.identity = identity
      } catch (err) {
        console.error('Registration failed:', err)
        this.email = null
      } finally {
        this.toggleConfirmation(true)
      }
    }
  };
}

window.customElements.define('register-form', RegisterForm)
