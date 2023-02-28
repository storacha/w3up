/* eslint-disable no-unused-vars */
import {
  delegationsToBytes,
  stringToDelegation,
} from '@web3-storage/access/encoding'
import * as Access from '@web3-storage/capabilities/access'
import QRCode from 'qrcode'
import { toEmail } from '../utils/did-mailto.js'
import {
  HtmlResponse,
  ValidateEmail,
  ValidateEmailError,
  PendingValidateEmail,
} from '../utils/html.js'
import * as ucanto from '@ucanto/core'
import * as validator from '@ucanto/validator'
import { Verifier } from '@ucanto/principal/ed25519'
import { ed25519 } from '@ucanto/principal'

/**
 * @param {import('@web3-storage/worker-utils/router').ParsedRequest} req
 * @param {import('../bindings.js').RouteContext} env
 */
export async function preValidateEmail(req, env) {
  if (!req.query?.ucan) {
    return new HtmlResponse(
      <ValidateEmailError msg={'Missing delegation in the URL.'} />
    )
  }

  return new HtmlResponse(<PendingValidateEmail autoApprove={true} />)
}

/**
 * @param {import('@web3-storage/worker-utils/router').ParsedRequest} req
 * @param {import('../bindings.js').RouteContext} env
 */
export async function validateEmail(req, env) {
  if (req.query && req.query.ucan && req.query.mode === 'recover') {
    return recover(req, env)
  }

  if (req.query && req.query.ucan && req.query.mode === 'session') {
    return session(req, env)
  }
  if (req.query && req.query.ucan) {
    try {
      const delegation = await env.models.validations.put(
        /** @type {import('@web3-storage/access/src/types.js').EncodedDelegation<[import('@web3-storage/access/src/types.js').VoucherClaim]>} */ (
          req.query.ucan
        )
      )

      return new HtmlResponse(
        (
          <ValidateEmail
            email={delegation.capabilities[0].nb.identity.replace(
              'mailto:',
              ''
            )}
            audience={delegation.audience.did()}
            ucan={req.query.ucan}
            qrcode={await QRCode.toString(req.query.ucan, {
              type: 'svg',
              errorCorrectionLevel: 'M',
              margin: 10,
            })}
          />
        )
      )
    } catch (error) {
      const err = /** @type {Error} */ (error)

      if (err.message.includes('Invalid expiration')) {
        return new HtmlResponse(
          <ValidateEmailError msg={'Email confirmation expired.'} />
        )
      }

      env.log.error(err)
      return new HtmlResponse(
        <ValidateEmailError msg={'Oops something went wrong.'} />
      )
    }
  }

  return new HtmlResponse(
    <ValidateEmailError msg={'Missing delegation in the URL.'} />
  )
}

/**
 * @param {import('@web3-storage/worker-utils/router').ParsedRequest} req
 * @param {import('../bindings.js').RouteContext} env
 */
async function recover(req, env) {
  try {
    const delegation = await env.models.validations.put(
      /** @type {import('@web3-storage/access/src/types.js').EncodedDelegation<[import('@web3-storage/access/src/types.js').SpaceRecover]>} */ (
        req.query.ucan
      )
    )

    return new HtmlResponse(
      (
        <ValidateEmail
          email={delegation.capabilities[0].nb.identity.replace('mailto:', '')}
          audience={delegation.audience.did()}
          ucan={req.query.ucan}
          qrcode={await QRCode.toString(req.query.ucan, {
            type: 'svg',
            errorCorrectionLevel: 'M',
            margin: 10,
          })}
        />
      )
    )
  } catch (error) {
    const err = /** @type {Error} */ (error)

    if (err.message.includes('Invalid expiration')) {
      return new HtmlResponse(
        <ValidateEmailError msg={'Email confirmation expired.'} />
      )
    }

    env.log.error(err)
    return new HtmlResponse(
      <ValidateEmailError msg={'Oops something went wrong.'} />
    )
  }
}

/**
 * @param {import('@web3-storage/worker-utils/router').ParsedRequest} req
 * @param {import('../bindings.js').RouteContext} env
 */
async function session(req, env) {
  /** @type {import('@ucanto/interface').Delegation<[import('@web3-storage/capabilities/src/types.js').AccessSession]>} */
  const delegation = stringToDelegation(req.query.ucan)
  await env.models.validations.putSession(
    req.query.ucan,
    delegation.capabilities[0].nb.key
  )
  if (req.method.toLowerCase() === 'post') {
    const accessSessionResult = await validator.access(delegation, {
      capability: Access.session,
      principal: Verifier,
      authority: env.signer,
    })
    if (accessSessionResult.error) {
      throw new Error(
        `unable to validate access session: ${accessSessionResult.error}`
      )
    }
    const accountDID = accessSessionResult.audience.did()
    // @todo: use new ucanto `Account` instead
    const accountOneOffKey = await ed25519.generate()
    const account = accountOneOffKey.withDID(accountDID)

    const agentPubkey = accessSessionResult.capability.nb.key

    // create delegations that should be claimable
    const delegationAccountToKey = await ucanto.delegate({
      issuer: account,
      audience: {
        did() {
          return agentPubkey
        },
      },
      capabilities: [
        {
          with: 'ucan:*',
          can: '*',
        },
      ],
    })
    // generate a delegation to the key that we can save in
    // models.delegations to be found by subsequent access/claim
    // invocations invoked by the did:key
    const delegateToKey = await ucanto.delegate({
      issuer: env.signer,
      audience: {
        did() {
          return accessSessionResult.capability.nb.key
        },
      },
      proofs: [delegation],
      capabilities: [
        {
          can: 'ucan/attest',
          with: env.signer.did(),
          nb: {
            proof: delegationsToBytes([delegationAccountToKey]),
          },
        },
      ],
    })
    await env.models.delegations.putMany(delegateToKey)
  }

  try {
    return new HtmlResponse(
      (
        <ValidateEmail
          email={toEmail(delegation.audience.did())}
          audience={delegation.audience.did()}
          ucan={req.query.ucan}
          qrcode={await QRCode.toString(req.query.ucan, {
            type: 'svg',
            errorCorrectionLevel: 'M',
            margin: 10,
          })}
        />
      )
    )
  } catch (error) {
    const err = /** @type {Error} */ (error)
    env.log.error(err)
    return new HtmlResponse(
      <ValidateEmailError msg={'Oops something went wrong.'} />
    )
  }
}
