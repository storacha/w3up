import * as Types from '../src/types.js'

/**
 * @implements {Types.AccountsStorage}
 */
export class AccountsStorage {
  async isEmailOrDomainBlocked() {
    return {
      ok: false
    }
  }
}
