/* eslint-disable no-unused-vars */
import { stringToDelegation } from '@web3-storage/access/encoding'
import QRCode from 'qrcode'
import { toEmail } from '../utils/did-mailto.js'
import {
  HtmlResponse,
  ValidateEmail,
  ValidateEmailError,
} from '../utils/html.js'

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
