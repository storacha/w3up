import * as Types from './types.js'
import * as Get from './plan/get.js'
import * as Set from './plan/set.js'
import * as CreateAdminSession from './plan/create-admin-session.js'

import { Failure } from '@ucanto/server'

export class CustomerNotFound extends Failure {
  /**
   * @param {import('./types.js').AccountDID} accountDID
   */
  constructor(accountDID) {
    super()
    this.accountDID = accountDID
  }

  /**
   * @type {'CustomerNotFound'}
   */
  get name() {
    return 'CustomerNotFound'
  }

  describe() {
    return `${this.accountDID} not found`
  }
}

export class CustomerExists extends Failure {
  /**
   * @param {import('./types.js').AccountDID} accountDID
   */
  constructor(accountDID) {
    super()
    this.accountDID = accountDID
  }

  /**
   * @type {'CustomerExists'}
   */
  get name() {
    return 'CustomerExists'
  }

  describe() {
    return `${this.accountDID} already exists`
  }
}

/**
 * @param {Types.PlanServiceContext} context
 */
export const createService = (context) => {
  return {
    get: Get.provide(context),
    set: Set.provide(context),
    'create-admin-session': CreateAdminSession.provide(context),
  }
}
