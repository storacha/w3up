import * as Ucanto from '@ucanto/interface'

export interface Revocation {
  revoke: Ucanto.UCANLink
  scope: Ucanto.UCANLink
  cause: Ucanto.UCANLink 
}

export interface RevocationsStorage {
  /**
   * Given a list of delegation CIDs, return a Ucanto Result with a map from
   * some or all of the CIDs to a list of "revocation context CIDs" for a
   * given CID - that is, a list of delegation CIDs that should no longer
   * be considered valid proof for the given CID.
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
