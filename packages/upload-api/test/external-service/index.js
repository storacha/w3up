import { IPNIService } from './ipni-service.js'

export const getExternalServiceImplementations = async () => ({
  ipniService: new IPNIService()
})
