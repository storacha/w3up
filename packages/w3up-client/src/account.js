import * as API from './types.js'
import * as Access from './capability/access.js'
import * as Plan from './capability/plan.js'
import * as Subscription from './capability/subscription.js'
import { Delegation, importAuthorization } from '@storacha/access/agent'
import { add as provision, AccountDID } from '@storacha/access/provider'
import { fromEmail, toEmail } from '@storacha/did-mailto'

export { fromEmail }

/**
 * @typedef {import('@storacha/did-mailto').EmailAddress} EmailAddress
 */

/**
 * List all accounts that agent has stored access to. Returns a dictionary
 * of accounts keyed by their `did:mailto` identifier.
 *
 * @param {{agent: API.Agent}} client
 * @param {object} query
 * @param {API.DID<'mailto'>} [query.account]
 */
export const list = ({ agent }, { account } = {}) => {
  const query = /** @type {API.CapabilityQuery} */ ({
    with: account ?? /did:mailto:.*/,
    can: '*',
  })

  const proofs = agent.proofs([query])
  /** @type {Record<API.DidMailto, Account>} */
  const accounts = {}
  /** @type {Record<string, API.Delegation>} */
  const attestations = {}
  for (const proof of proofs) {
    const access = Delegation.allows(proof)
    for (const [resource, abilities] of Object.entries(access)) {
      if (AccountDID.is(resource) && abilities['*']) {
        const id = /** @type {API.DidMailto} */ (resource)

        const account =
          accounts[id] ||
          (accounts[id] = new Account({ id, agent, proofs: [] }))
        account.addProof(proof)
      }

      for (const settings of /** @type {{proof?:API.Link}[]} */ (
        abilities['ucan/attest'] || []
      )) {
        const id = settings.proof
        if (id) {
          attestations[`${id}`] = proof
        }
      }
    }
  }

  for (const account of Object.values(accounts)) {
    for (const proof of account.proofs) {
      const attestation = attestations[`${proof.cid}`]
      if (attestation) {
        account.addProof(attestation)
      }
    }
  }

  return accounts
}

/**
 * Attempts to obtains an account access by performing an authentication with
 * the did:mailto account corresponding to given email. Process involves out
 * of bound email verification, so this function returns a promise that will
 * resolve to an account only after access has been granted by the email owner
 * by clicking on the link in the email. If the link is not clicked within the
 * authorization session time bounds (currently 15 minutes), the promise will
 * resolve to an error.
 *
 * @param {{agent: API.Agent}} client
 * @param {EmailAddress} email
 * @param {object} [options]
 * @param {AbortSignal} [options.signal]
 * @returns {Promise<API.Result<Account, Error>>}
 */
export const login = async ({ agent }, email, options = {}) => {
  const account = fromEmail(email)

  // If we already have a session for this account we
  // skip the authentication process, otherwise we will
  // end up adding more UCAN proofs and attestations to
  // the store which we then will be sending when using
  // this account.
  // Note: This is not a robust solution as there may be
  // reasons to re-authenticate e.g. previous session is
  // no longer valid because it was revoked. But dropping
  // revoked UCANs from store is something we should do
  // anyway.
  const session = list({ agent }, { account })[account]
  if (session) {
    return { ok: session }
  }

  const result = await Access.request(
    { agent },
    {
      account,
      access: Access.accountAccess,
    }
  )

  const { ok: access, error } = result
  /* c8 ignore next 2 - don't know how to test this */
  if (error) {
    return { error }
  } else {
    const { ok, error } = await access.claim({ signal: options.signal })
    /* c8 ignore next 2 - don't know how to test this */
    if (error) {
      return { error }
    } else {
      return { ok: new Account({ id: account, proofs: ok.proofs, agent }) }
    }
  }
}

/**
 * @typedef {object} Model
 * @property {API.DidMailto} id
 * @property {API.Agent} agent
 * @property {API.Delegation[]} proofs
 */

export class Account {
  /**
   * @param {Model} model
   */
  constructor(model) {
    this.model = model
    this.plan = new AccountPlan(model)
  }
  get agent() {
    return this.model.agent
  }
  get proofs() {
    return this.model.proofs
  }

  did() {
    return this.model.id
  }

  toEmail() {
    return toEmail(this.did())
  }

  /**
   * @param {API.Delegation} proof
   */
  addProof(proof) {
    this.proofs.push(proof)
  }

  toJSON() {
    return {
      id: this.did(),
      proofs: this.proofs
        // we sort proofs to get a deterministic JSON representation.
        .sort((a, b) => a.cid.toString().localeCompare(b.cid.toString()))
        .map((proof) => proof.toJSON()),
    }
  }

  /**
   * Provisions given `space` with this account.
   *
   * @param {API.SpaceDID} space
   * @param {object} input
   * @param {API.ProviderDID} [input.provider]
   * @param {API.Agent} [input.agent]
   */
  provision(space, input = {}) {
    return provision(this.agent, {
      ...input,
      account: this.did(),
      consumer: space,
      proofs: this.proofs,
    })
  }

  /**
   * Saves account in the agent store so it can be accessed across sessions.
   *
   * @param {object} input
   * @param {API.Agent} [input.agent]
   */
  async save({ agent = this.agent } = {}) {
    return await importAuthorization(agent, this)
  }
}

export class AccountPlan {
  /**
   * @param {Model} model
   */
  constructor(model) {
    this.model = model
  }

  /**
   * Gets information about the plan associated with this account.
   *
   * @param {object} [options]
   * @param {string} [options.nonce]
   */
  async get(options) {
    return await Plan.get(this.model, {
      ...options,
      account: this.model.id,
      proofs: this.model.proofs,
    })
  }

  /**
   * Sets the plan associated with this account.
   *
   * @param {import('@ucanto/interface').DID} productDID
   * @param {object} [options]
   * @param {string} [options.nonce]
   */
  async set(productDID, options) {
    return await Plan.set(this.model, {
      ...options,
      account: this.model.id,
      product: productDID,
      proofs: this.model.proofs,
    })
  }

  /**
   * Waits for a payment plan to be selected.
   * This method continuously checks the account's payment plan status
   * at a specified interval until a valid plan is selected, or when the timeout is reached,
   * or when the abort signal is aborted.
   *
   * @param {object} [options]
   * @param {number} [options.interval] - The polling interval in milliseconds (default is 1000ms).
   * @param {number} [options.timeout] - The maximum time to wait in milliseconds before throwing a timeout error (default is 15 minutes).
   * @param {AbortSignal} [options.signal] - An optional AbortSignal to cancel the waiting process.
   * @returns {Promise<import('@storacha/access').PlanGetSuccess>} - Resolves once a payment plan is selected within the timeout.
   * @throws {Error} - Throws an error if there is an issue retrieving the payment plan or if the timeout is exceeded.
   */
  async wait(options) {
    const startTime = Date.now()
    const interval = options?.interval || 1000 // 1 second
    const timeout = options?.timeout || 60 * 15 * 1000 // 15 minutes

    // eslint-disable-next-line no-constant-condition
    while (true) {
      const res = await this.get()
      if (res.ok) return res.ok

      if (res.error) {
        throw new Error(`Error retrieving payment plan: ${res.error}`)
      }

      if (Date.now() - startTime > timeout) {
        throw new Error('Timeout: Payment plan selection took too long.')
      }

      if (options?.signal?.aborted) {
        throw new Error('Aborted: Payment plan selection was aborted.')
      }

      console.log('Waiting for payment plan to be selected...')
      await new Promise((resolve) => setTimeout(resolve, interval))
    }
  }

  /**
   *
   * @param {import('@storacha/access').AccountDID} accountDID
   * @param {string} returnURL
   * @param {object} [options]
   * @param {string} [options.nonce]
   */
  async createAdminSession(accountDID, returnURL, options) {
    return await Plan.createAdminSession(this.model, {
      ...options,
      account: accountDID,
      returnURL,
    })
  }

  /**
   *
   * @param {object} [options]
   * @param {string} [options.nonce]
   */
  async subscriptions(options) {
    return await Subscription.list(this.model, {
      ...options,
      account: this.model.id,
      proofs: this.model.proofs,
    })
  }
}
