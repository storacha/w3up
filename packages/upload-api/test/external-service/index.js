import { IPNIService } from './ipni.js'
import * as ClaimsService from './content-claims.js'

/**
 * @param {object} [options]
 * @param {import('node:http')} [options.http]
 */
export const getExternalServiceImplementations = async (options) => ({
  ipniService: new IPNIService(),
  claimsService: await ClaimsService.activate(options),
})
