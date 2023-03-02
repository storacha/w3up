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
import { collect } from 'streaming-iterables'

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

    const confirmation = await validator.access(request, {
      capability: Access.confirm,
      principal: Verifier,
      authority: env.signer,
    })

    if (confirmation.error) {
      throw new Error(`unable to validate access session: ${confirmation}`)
    }
    if (confirmation.capability.with !== env.signer.did()) {
      throw new Error(`Not a valid access/confirm delegation`)
    }

    // Create a absentee signer for the account that authorized the delegation
    const account = Absentee.from({ id: confirmation.capability.nb.iss })
    const agent = Verifier.parse(confirmation.capability.nb.aud)

    // It the future we should instead render a page and allow a user to select
    // which delegations they wish to re-delegate. Right now we just re-delegate
    // everything that was requested for all of the resources.
    const capabilities =
      /** @type {ucanto.UCAN.Capabilities} */
      (
        confirmation.capability.nb.att.map(({ can }) => ({
          can,
          with: /** @type {ucanto.UCAN.Resource} */ ('ucan:*'),
        }))
      )

    // create an delegation on behalf of the account with an absent signature.
    const delegation = await ucanto.delegate({
      issuer: account,
      audience: agent,
      capabilities,
      expiration: Infinity,
      // We include all the delegations to the account so that the agent will
      // have delegation chains to all the delegated resources.
      // We should actually filter out only delegations that support delegated
      // capabilities, but for now we just include all of them since we only
      // implement sudo access anyway.
      proofs: await collect(
        env.models.delegations.find({
          audience: account.did(),
        })
      ),
    })

    const attestation = await Access.session.delegate({
      issuer: env.signer,
      audience: agent,
      with: env.signer.did(),
      nb: { proof: delegation.cid },
      expiration: Infinity,
    })

    // Store the delegations so that they can be pulled with access/claim
    // The fact that we're storing proofs chains that we pulled from the
    // database is not great, but it's a tradeoff we're making for now.
    await env.models.delegations.putMany(delegation, attestation)

    const authorization = delegationsToString([delegation, attestation])
    // Send delegations to the client through a websocket
    await env.models.validations.putSession(authorization, agent.did())

    // We render HTML page explaining to the user what has happened and providing
    // a QR code in the details if they want to drill down.
    return new HtmlResponse(
      (
        <ValidateEmail
          email={toEmail(account.did())}
          audience={agent.did()}
          ucan={authorization}
          qrcode={await QRCode.toString(authorization, {
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
