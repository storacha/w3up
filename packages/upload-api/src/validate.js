import {
  delegationsToString,
  stringToDelegation,
} from '@storacha/access/encoding'
import * as DidMailto from '@storacha/did-mailto'
import { Verifier } from '@ucanto/principal'
import * as delegationsResponse from './utils/delegations-response.js'
import * as accessConfirm from './access/confirm.js'
import * as Types from './types.js'

/**
 * @param {string | URL} url
 * @param {Types.AccessServiceContext} env
 */
export async function authorizeFromUrl(url, env) {
  const queryParam = new URL(url).searchParams.get('ucan')
  if (queryParam) {
    return authorize(queryParam, env)
  } else {
    return {
      error: new Error(`could not find UCAN in the given URL`),
    }
  }
}

/**
 * @param {string} encodedUcan
 * @param {Types.AccessServiceContext} env
 */
export async function authorize(encodedUcan, env) {
  try {
    /**
     * @type {import('@ucanto/interface').Delegation<[import('@storacha/capabilities/types').AccessConfirm]>}
     */
    const request = stringToDelegation(encodedUcan)

    const confirm = accessConfirm.provide(env)
    const confirmResult = await confirm(request, {
      id: env.signer,
      principal: Verifier,
      validateAuthorization: () => ({ ok: {} }),
    })

    if (!confirmResult.ok) {
      return {
        error: new Error('error confirming', {
          cause: confirmResult.error,
        }),
      }
    }
    const { account, agent } = accessConfirm.parse(request.capabilities[0])

    const confirmDelegations = [
      ...delegationsResponse.decode(confirmResult.ok.delegations),
    ]

    return {
      ok: {
        email: DidMailto.toEmail(DidMailto.fromString(account.did())),
        audience: agent.did(),
        ucan: delegationsToString(confirmDelegations),
      },
    }
  } catch (error) {
    return {
      error: new Error('something went wrong', {
        cause: error,
      }),
    }
  }
}
