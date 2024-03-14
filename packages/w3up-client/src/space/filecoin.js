import * as API from '../types.js'
import * as Agent from '../agent.js'
import * as Filecoin from '@web3-storage/capabilities/filecoin'
import * as Session from '../session.js'

/**
 * @param {API.SpaceSession<API.FilecoinProtocol>} session
 * @returns {API.SpaceFilecoinView}
 */
export const view = (session) => new FilecoinAPI(session)

/**
 * @param {API.SpaceSession<API.FilecoinProtocol>} session
 * @param {API.FilecoinOffer} offer
 */
export function* offer(session, offer) {
  const { proofs } = yield* Agent.authorize(session.agent, {
    subject: session.did(),
    can: { 'filecoin/offer': [] },
  })

  const task = Filecoin.offer.invoke({
    issuer: session.agent.signer,
    audience: session.connection.id,
    with: session.did(),
    nb: offer,
    proofs,
  })

  return yield* Session.execute(session, task).receipt()
}

/**
 * @param {API.SpaceSession<API.FilecoinProtocol>} session
 * @param {API.FilecoinInfo} input
 */
export function* info(session, { piece }) {
  const { proofs } = yield* Agent.authorize(session.agent, {
    subject: session.did(),
    can: { 'filecoin/info': [] },
  })

  const task = Filecoin.info.invoke({
    issuer: session.agent.signer,
    audience: session.connection.id,
    with: session.did(),
    nb: { piece },
    proofs,
  })

  return yield* Session.execute(session, task).receipt()
}

/**
 * @implements {API.SpaceFilecoinView}
 */
class FilecoinAPI {
  /**
   *
   * @param {API.SpaceSession<API.FilecoinProtocol>} session
   */

  constructor(session) {
    this.session = session
  }

  /**
   * @param {API.FilecoinOffer} input
   */
  offer(input) {
    return Session.perform(offer(this.session, input))
  }

  /**
   * @param {API.FilecoinInfo} input
   */
  info(input) {
    return Session.perform(info(this.session, input))
  }
}
