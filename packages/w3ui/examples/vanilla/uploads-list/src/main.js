import './assets/tachyons.min.css'
import { RegisterForm } from './register'
import { ListFiles } from './list'

export const EVENTS = {
  registrationSuccess: 'registration:success',
}

const SELECTORS = {
  registerComponent: '#register-form-component',
  uploadComponent: '#upload-form-component',
  container: '.container',
}

document.addEventListener(EVENTS.registrationSuccess, (event) => {
  const registerEl = document.querySelector(SELECTORS.registerComponent)
  const container = document.querySelector(SELECTORS.container)
  // Switch components
  registerEl.remove()
  const uploadEl = document.createElement('list-files')
  container.appendChild(uploadEl)
})

export { RegisterForm, ListFiles }
