/* eslint-disable no-unused-vars */
import {
  stringToDelegation,
  delegationsToString,
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
import { Verifier, Absentee } from '@ucanto/principal'

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
  /** @type {import('@ucanto/interface').Delegation<[import('@web3-storage/capabilities/src/types.js').AccessAuthorize]>} */
  const delegation = stringToDelegation(req.query.ucan)

  // TODO: Figure when do we go through a post vs get request. WebSocket message
  // was send regardless of the method, but delegations were only stored on post
  // requests.
  if (req.method.toLowerCase() === 'post') {
    const accessSessionResult = await validator.access(delegation, {
      capability: Access.authorize,
      principal: Verifier,
      authority: env.signer,
    })

    if (accessSessionResult.error) {
      throw new Error(
        `unable to validate access session: ${accessSessionResult.error}`
      )
    }

    // Create a absentee signer for the account that authorized the delegation
    const account = Absentee.from({ id: accessSessionResult.capability.nb.iss })
    const agent = Verifier.parse(accessSessionResult.capability.with)

    // It the future we should instead render a page and allow a user to select
    // which delegations they wish to re-delegate. Right now we just re-delegate
    // everything that was requested for all of the resources.
    const capabilities =
      /** @type {ucanto.UCAN.Capabilities} */
      (
        accessSessionResult.capability.nb.att.map(({ can }) => ({
          can,
          with: /** @type {ucanto.UCAN.Resource} */ ('ucan:*'),
        }))
      )

    // create an authorization on behalf of the account with an absent
    // signature.
    const authorization = await ucanto.delegate({
      issuer: account,
      audience: agent,
      capabilities,
      expiration: Infinity,
      // We should also include proofs with all the delegations we have for
      // the account.
    })

    const attestation = await ucanto.delegate({
      issuer: env.signer,
      audience: agent,
      capabilities: [
        {
          with: env.signer.did(),
          can: 'ucan/attest',
          nb: { proof: authorization.cid },
        },
      ],
      expiration: Infinity,
    })

    // Store the delegations so that they can be pulled with access/claim
    await env.models.delegations.putMany(authorization, attestation)

    // Send delegations to the client through a websocket
    await env.models.validations.putSession(
      delegationsToString([authorization, attestation]),
      agent.did()
    )
  }

  // TODO: We clearly should not render that access/delegate in the QR code, but
  // I'm not sure what this QR code is used for.
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
