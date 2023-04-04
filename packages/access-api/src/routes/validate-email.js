import {
  delegationsToString,
  stringToDelegation,
} from '@web3-storage/access/encoding'
import * as Access from '@web3-storage/capabilities/access'
import QRCode from 'qrcode'
import * as DidMailto from '@web3-storage/did-mailto'
import {
  HtmlResponse,
  ValidateEmail,
  ValidateEmailError,
  PendingValidateEmail,
} from '../utils/html.js'
import { Verifier } from '@ucanto/principal'
import * as delegationsResponse from '../utils/delegations-response.js'
import * as accessConfirm from '../service/access-confirm.js'
import { provide } from '@ucanto/server'
import * as Ucanto from '@ucanto/interface'

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

  if (req.query && req.query.ucan && req.query.mode === 'authorize') {
    return authorize(req, env)
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
async function authorize(req, env) {
  try {
    /**
     * @type {import('@ucanto/interface').Delegation<[import('@web3-storage/capabilities/src/types.js').AccessConfirm]>}
     */
    const request = stringToDelegation(req.query.ucan)

    const confirm = provide(
      Access.confirm,
      async ({ capability, invocation }) => {
        return accessConfirm.handleAccessConfirm(
          /** @type {Ucanto.Invocation<import('@web3-storage/access/types').AccessConfirm>} */ (
            invocation
          ),
          env
        )
      }
    )
    const confirmResult = await confirm(request, {
      id: env.signer,
      principal: Verifier,
    })
    if (confirmResult.error) {
      throw new Error('error confirming', {
        cause: confirmResult,
      })
    }
    const { account, agent } = accessConfirm.parse(request)
    const confirmDelegations = [
      ...delegationsResponse.decode(confirmResult.delegations),
    ]

    // We render HTML page explaining to the user what has happened and providing
    // a QR code in the details if they want to drill down.
    return new HtmlResponse(
      (
        <ValidateEmail
          email={DidMailto.toEmail(DidMailto.fromString(account.did()))}
          audience={agent.did()}
          ucan={delegationsToString(confirmDelegations)}
        />
      )
    )
  } catch (error) {
    const err = /** @type {Error} */ (error)
    env.log.error(err)
    return new HtmlResponse(
      <ValidateEmailError msg={'Oops something went wrong.'} />,
      { status: 500 }
    )
  }
}
