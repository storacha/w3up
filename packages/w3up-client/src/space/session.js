import * as API from '../types.js'
import * as Agent from '../agent.js'
import * as Space from '@web3-storage/capabilities/space'

/**
 *
 * Get Space information from Access service
 *
 * @param {API.SpaceSession<API.SpaceProtocol>} session
 */
export const info = async (session) => {
  const auth = Agent.authorize(session.agent, {
    subject: session.did(),
    can: { 'space/info': [] },
  })

  if (auth.error) {
    return auth
  }

  const { out: result } = await Space.info
    .invoke({
      issuer: session.agent.signer,
      audience: session.connection.id,
      with: session.did(),
      proofs: auth.ok.proofs,
    })
    .execute(session.connection)

  return result
}

export class SpaceSessionView {
  /**
   * @param {API.SpaceSession<API.SpaceProtocol>} session
   */
  constructor(session) {
    this.session = session
  }
  info() {
    return info(this.session)
  }
}
