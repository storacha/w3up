import { identityRegister } from './identity-register.js'
import { identityValidate } from './identity-validate.js'

export const service = {
  identity: {
    validate: identityValidate,
    register: identityRegister,
  },
}
