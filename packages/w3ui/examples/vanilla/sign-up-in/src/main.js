import './assets/tachyons.min.css'

import { createAgent, getCurrentSpace } from '@w3ui/keyring-core'

// FIXME: remove this once we no longer need to target staging
import {
  accessServicePrincipal,
  accessServiceConnection,
} from './staging-service.js'

const SELECTORS = {
  authForm: '#sign-up-in-form',
  cancelRegistrationButton: '#cancel-registration',
  signOutButton: '#sign-out',
  verificationTemplate: '#verification-required-template',
  confirmationTemplate: '#registration-success-template',
}

export const EVENTS = {
  registrationStart: 'registration:start',
  registrationSuccess: 'registration:success',
}

export class RegisterForm extends window.HTMLElement {
  constructor() {
    super()
    this.agent = null
    this.email = null
    this.form$ = document.querySelector(SELECTORS.authForm)
    this.confirmationTemplate$ = document.querySelector(
      SELECTORS.confirmationTemplate
    )
    this.verificationTemplate$ = document.querySelector(
      SELECTORS.verificationTemplate
    )
    this.submitHandler = this.submitHandler.bind(this)
    this.cancelRegistrationHandler = this.cancelRegistrationHandler.bind(this)
    this.signOutHandler = this.signOutHandler.bind(this)
    this.formatTemplateContent = this.formatTemplateContent.bind(this)
  }

  async getAgent() {
    if (this.agent == null) {
      this.agent = await createAgent({
        servicePrincipal: accessServicePrincipal,
        connection: accessServiceConnection,
      })
    }
    return this.agent
  }

  async connectedCallback() {
    this.form$.addEventListener('submit', this.submitHandler)

    const agent = await this.getAgent()
    console.log(`Agent DID: ${agent.did()}`)

    const space = getCurrentSpace(agent)
    if (space?.registered()) {
      this.toggleConfirmation()
      console.log(`Space DID: ${space.did()}`)
    } else {
      console.log('No registered spaces')
    }
  }

  formatTemplateContent(templateContent) {
    templateContent.querySelector('[data-email-slot]').innerHTML = this.email
    return templateContent
  }

  toggleConfirmation() {
    const templateContent = this.confirmationTemplate$.content
    this.replaceChildren(this.formatTemplateContent(templateContent))
    this.signOutButton$ = document.querySelector(SELECTORS.signOutButton)
    this.signOutButton$.addEventListener('click', this.signOutHandler)
  }

  toggleVerification() {
    const templateContent = this.verificationTemplate$.content
    this.replaceChildren(this.formatTemplateContent(templateContent))
    this.cancelRegistrationButton$ = document.querySelector(
      SELECTORS.cancelRegistrationButton
    )
    this.cancelRegistrationButton$.addEventListener(
      'click',
      this.cancelRegistrationHandler
    )
  }

  disconnectedCallback() {
    this.form$?.removeEventListener('submit', this.submitHandler)
  }

  async cancelRegistrationHandler(e) {
    e.preventDefault()
    window.location.reload()
  }

  async signOutHandler(e) {
    e.preventDefault()
    this.agent = null

    window.location.reload()
  }

  async submitHandler(e) {
    e.preventDefault()
    const fd = new window.FormData(e.target)
    // log in a user by their email
    const email = fd.get('email')
    this.email = email

    if (email) {
      const agent = await this.getAgent()

      const controller = new AbortController()
      await agent.authorize(email, { signal: controller.signal })

      const { did } = await agent.createSpace()
      await agent.setCurrentSpace(did)
      console.log(`Created new Space with DID: ${did}`)

      try {
        // Fire registration start event
        const startEvent = window.CustomEvent(EVENTS.registrationStart, {
          bubbles: true,
        })
        this.dispatchEvent(startEvent)

        this.toggleVerification(true)
        await agent.registerSpace(email)

        // Fire sign in success event
        const successEvent = new window.CustomEvent(
          EVENTS.registrationSuccess,
          { bubbles: true }
        )
        this.dispatchEvent(successEvent)
      } catch (err) {
        console.error('Registration failed:', err)
        this.email = null
      } finally {
        this.toggleConfirmation(true)
      }
    }
  }
}

window.customElements.define('register-form', RegisterForm)
