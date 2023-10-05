import * as Ucanto from '@ucanto/interface'

export interface Revocation {
  revoke: Ucanto.UCANLink
  scope: Ucanto.UCANLink
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
  ) => Promise<
    Ucanto.Result<Revocation[], Ucanto.Failure>
  >

  /**
   * Add the given revocations to the revocation store.
   */
  addAll: (
    revocations: Revocation[]
  ) => Promise<
    Ucanto.Result<Ucanto.Unit, Ucanto.Failure>
  >
}
