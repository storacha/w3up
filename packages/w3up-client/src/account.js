import * as API from './types.js'
import * as Access from './capability/access.js'
import { Delegation, provisionSpace } from '@web3-storage/access/agent'
import { fromEmail, toEmail } from '@web3-storage/did-mailto'

export { fromEmail }

/**
 * @param {{agent: API.Agent}} client
 * @param {object} query
 * @param {API.DID<'mailto'>} [query.account]
 */
export const list = ({ agent }, { account } = {}) => {
  const query = /** @type {API.CapabilityQuery} */ ({
    with: account ?? /did:mailto:.*/,
    can: 'ucan/*',
  })

  const proofs = agent.proofs([query])
  /** @type {Record<API.DidMailto, Account>} */
  const accounts = {}
  /** @type {Record<string, API.Delegation>} */
  const attestations = {}
  for (const proof of proofs) {
    const access = Delegation.allows(proof)
    for (const [resource, abilities] of Object.entries(access)) {
      if (abilities['ucan/*']) {
        const id = /** @type {API.DidMailto} */ (resource)

        const account =
          accounts[id] || (accounts[id] = new Account({ id, agent }))
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
 * @param {{agent: API.Agent}} client
 * @param {API.EmailAddress} email
 */
export const login = async ({ agent }, email) => {
  const account = fromEmail(email)
  const result = await Access.request(
    { agent },
    {
      account,
      access: Access.accountAccess,
    }
  )

  const { ok: access, error } = result
  if (error) {
    return { error }
  } else {
    const { ok, error } = await access.claim()
    if (error) {
      return { error }
    } else {
      try {
        for (const proof of ok) {
          await agent.addProof(proof)
        }
      } catch {}

      return { ok: new Account({ id: account, proofs: ok, agent }) }
    }
  }
}

class Account {
  /**
   * @param {object} source
   * @param {API.DidMailto} source.id
   * @param {API.Agent} source.agent
   * @param {API.Delegation[]} [source.proofs]
   */
  constructor({ id, agent, proofs = [] }) {
    this.id = id
    this.agent = agent
    this.proofs = proofs
  }

  did() {
    return this.id
  }

  toEmail() {
    return toEmail(this.id)
  }

  /**
   * @param {API.Delegation} proof
   */
  addProof(proof) {
    this.proofs.push(proof)
  }

  /**
   * @param {API.SpaceDID} space
   * @param {object} input
   * @param {API.ProviderDID} [input.provider]
   */
  provision(space, input = {}) {
    return provisionSpace(this.agent, {
      ...input,
      account: this.did(),
      space,
    })
  }
}
