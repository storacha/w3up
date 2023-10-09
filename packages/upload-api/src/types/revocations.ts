import * as Ucanto from '@ucanto/interface'

export interface Revocation {
  revoke: Ucanto.UCANLink
  scope: Ucanto.DID
  cause: Ucanto.UCANLink
}

export interface RevocationsStorage {
  /**
   * Given a list of delegation CIDs, return a Ucanto Result with
   * any revocations in the store whose `revoke` field matches one of
   * the given CIDs.
   */
  getAll: (
    query: Revocation['revoke'][]
  ) => Promise<Ucanto.Result<Revocation[], Ucanto.Failure>>

  /**
   * Add the given revocations to the revocation store. If there is a revocation
   * for given `revoke` with a different `scope` revocation with the given scope
   * will be added. If there is a revocation for given `revoke` and `scope` no
   * revocation will be added or updated.
   */
  add: (
    revocation: Revocation
  ) => Promise<Ucanto.Result<Ucanto.Unit, Ucanto.Failure>>

  /**
   * Creates or updates revocation for given `revoke` by setting `scope` to
   * the one passed in the argument. This is intended to compact revocation
   * store by dropping all existing revocations for given `revoke` in favor of
   * given one. It supposed to be called when revocation authority is the same
   * as ucan issue as such revocation will apply to all possible invocations.
   */
  reset: (
    revocation: Revocation
  ) => Promise<Ucanto.Result<Ucanto.Unit, Ucanto.Failure>>
}
