import { Principal, SigningPrincipal } from '@ucanto/principal'
import type { Delegation, SigningPrincipal as ISigningPrincipal } from '@ucanto/interface'
import * as Access from '@web3-storage/access'
import { IdentityRegister } from '@web3-storage/access/types'
import { base64pad } from 'multiformats/bases/base64'

// Production
const accessApiUrl = new URL('https://access-api.web3.storage')
const accessDid = Principal.parse('did:key:z6MkkHafoFWxxWVNpNXocFdU6PL2RVLyTEgS1qTnD3bRP7V9')
// Staging
// const accessApiUrl = new URL('https://access-api-staging.web3.storage')
// const accessDid = Authority.parse('did:key:z6MknemWKfRSfnprfijbQ2mn67KrnV44SWSuct3WLDanX2Ji')

export interface Identity {
  email: string
  verified: boolean
  signingPrincipal: ISigningPrincipal
}

export interface UnverifiedIdentity extends Identity {
  verified: false
}

export interface VerifiedIdentity extends Identity {
  verified: true
}

export enum AuthStatus {
  /**
   * Identity loaded.
   */
  SignedIn,
  /**
   * Not authorized.
   */
  SignedOut,
  /**
   * Email verification email has been sent.
   */
  EmailVerification
}

export interface WaitIdentityVerificationOptions {
  /**
   * An AbortSignal that can be used to cancel the registration/email validation.
   */
  signal?: AbortSignal
}

/**
 * Create a brand new identity.
 */
export async function createIdentity ({ email }: { email: string }): Promise<UnverifiedIdentity> {
  if (email == null || email === '') {
    throw new Error('missing email address')
  }

  const signingPrincipal = await SigningPrincipal.generate()

  return { email, verified: false, signingPrincipal }
}

/**
 * Send verification email.
 */
export async function sendVerificationEmail (identity: UnverifiedIdentity): Promise<void> {
  if (identity.verified) {
    throw new Error('already verified')
  }
  await Access.validate({
    audience: accessDid,
    url: accessApiUrl,
    issuer: identity.signingPrincipal,
    caveats: { as: `mailto:${identity.email}` }
  })
}

/**
 * Wait for the passed identity to be verified.
 */
export async function waitIdentityVerification (identity: UnverifiedIdentity, options: WaitIdentityVerificationOptions = {}): Promise<{ identity: VerifiedIdentity, proof: Delegation<[IdentityRegister]> }> {
  if (identity.verified) {
    throw new Error('already verified')
  }
  const proof = await Access.pullRegisterDelegation({
    issuer: identity.signingPrincipal,
    url: accessApiUrl,
    signal: options.signal
  })

  return {
    identity: {
      email: identity.email,
      verified: true,
      signingPrincipal: identity.signingPrincipal
    },
    proof
  }
}

/**
 * Register a verified identity with the service.
 */
export async function registerIdentity (identity: VerifiedIdentity, proof: Delegation<[IdentityRegister]>): Promise<void> {
  if (!identity.verified) {
    throw new Error('identity must be verified')
  }
  await Access.register({
    audience: accessDid,
    url: accessApiUrl,
    issuer: identity.signingPrincipal,
    proof
  })
}

/**
 * Load an identity from secure storage.
 */
export async function loadIdentity ({ email }: Pick<Identity, 'email'>): Promise<Identity | undefined> {
  const item = localStorage.getItem(`__w3ui_id.v0.mailto:${email}`)
  if (item == null) return
  try {
    const { email, verified, signingPrincipalBytes } = JSON.parse(item)
    const signingPrincipal = SigningPrincipal.decode(base64pad.decode(signingPrincipalBytes))
    return { email, verified, signingPrincipal }
  } catch (err) {
    console.warn('failed to load identity', err)
  }
}

/**
 * Load the default identity from secure storage.
 */
export async function loadDefaultIdentity (): Promise<Identity | undefined> {
  const email = localStorage.getItem('__w3ui_id.v0.default.email')
  if (email == null) return
  return await loadIdentity({ email })
}

/**
 * Remove the passed identity from secure storage (if exists).
 */
export async function removeIdentity (identity: Identity): Promise<void> {
  localStorage.removeItem(`__w3ui_id.v0.mailto:${identity.email}`)
  const defaultEmail = localStorage.getItem('__w3ui_id.v0.default.email')
  if (identity.email === defaultEmail) {
    localStorage.removeItem('__w3ui_id.v0.default.email')
  }
}

/**
 * Store identity locally in secure storage and set the default.
 * TODO: CURRENTLY DOES NOT SAVE SECURELY - SAVES TO LOCALSTORAGE
 */
export async function storeIdentity (identity: Identity): Promise<void> {
  const { email, verified, signingPrincipal } = identity
  const signingPrincipalBytes = base64pad.encode(signingPrincipal.bytes)
  localStorage.setItem(
    `__w3ui_id.v0.mailto:${email}`,
    JSON.stringify({ email, verified, signingPrincipalBytes })
  )
  localStorage.setItem('__w3ui_id.v0.default.email', email)
}
