import * as Keypair from '@ucanto/authority'
import { Authority } from '@ucanto/authority'
import type { SigningAuthority } from '@ucanto/interface'
import * as Access from '@web3-storage/access'
import { base64pad } from 'multiformats/bases/base64'

// Production
const accessApiUrl = new URL('https://access-api.web3.storage')
const accessDid = Authority.parse('did:key:z6MkkHafoFWxxWVNpNXocFdU6PL2RVLyTEgS1qTnD3bRP7V9')
// Staging
// const accessApiUrl = new URL('https://access-api-staging.web3.storage')
// const accessDid = Authority.parse('did:key:z6MknemWKfRSfnprfijbQ2mn67KrnV44SWSuct3WLDanX2Ji')

export interface Identity {
  email: string
  signingAuthority: SigningAuthority
}

export enum AuthStatus {
  SignedIn,
  SignedOut,
  /**
   * Email verification email has been sent.
   */
  EmailVerification
}

export interface RegisterIdentityOptions {
  /**
   * Called when auth status changes during registration.
   */
  onAuthStatusChange?: (status: AuthStatus) => void
  /**
   * An AbortSignal that can be used to cancel the registration/email validation.
   */
  signal?: AbortSignal
}

/**
 * Register a new identity and verify the email address.
 */
export async function registerIdentity (email: string, options: RegisterIdentityOptions = {}): Promise<Identity> {
  if (email == null || email === '') {
    throw new Error('missing email address')
  }

  const onAuthStatusChange = options.onAuthStatusChange ?? (() => {})
  const signingAuthority = await Keypair.SigningAuthority.generate()

  await Access.validate({
    audience: accessDid,
    url: accessApiUrl,
    issuer: signingAuthority,
    caveats: { as: `mailto:${email}` }
  })

  onAuthStatusChange(AuthStatus.EmailVerification)

  try {
    const proof = await Access.pullRegisterDelegation({
      issuer: signingAuthority,
      url: accessApiUrl,
      // @ts-expect-error
      signal: options.signal
    })

    await Access.register({
      audience: accessDid,
      url: accessApiUrl,
      issuer: signingAuthority,
      proof
    })

    onAuthStatusChange(AuthStatus.SignedIn)
    return { email, signingAuthority }
  } catch (err) {
    onAuthStatusChange(AuthStatus.SignedOut)
    throw err
  }
}

/**
 * Load an identity from secure storage.
 */
export async function loadIdentity ({ email }: Pick<Identity, 'email'>): Promise<Identity | undefined> {
  const item = localStorage.getItem(`__w3ui_identity.mailto:${email}`)
  if (item == null) return
  try {
    const { email, signingAuthorityBytes } = JSON.parse(item)
    const signingAuthority = Keypair.SigningAuthority.decode(base64pad.decode(signingAuthorityBytes))
    return { email, signingAuthority }
  } catch (err) {
    console.warn('failed to load identity', err)
  }
}

/**
 * Load the default identity from secure storage.
 */
export async function loadDefaultIdentity (): Promise<Identity | undefined> {
  const email = localStorage.getItem('__w3ui_identity.default.email')
  if (email == null) return
  return await loadIdentity({ email })
}

/**
 * Remove the passed identity from secure storage (if exists).
 */
export async function removeIdentity (identity: Identity): Promise<void> {
  localStorage.removeItem(`__w3ui_identity.mailto:${identity.email}`)
  const defaultEmail = localStorage.getItem('__w3ui_identity.default.email')
  if (identity.email === defaultEmail) {
    localStorage.removeItem('__w3ui_identity.default.email')
  }
}

/**
 * Store identity locally in secure storage and set the default.
 * TODO: CURRENTLY DOES NOT SAVE SECURELY - SAVES TO LOCALSTORAGE
 */
export async function storeIdentity (identity: Identity): Promise<void> {
  const { email, signingAuthority } = identity
  const signingAuthorityBytes = base64pad.encode(signingAuthority.bytes)
  localStorage.setItem(
    `__w3ui_identity.mailto:${email}`,
    JSON.stringify({ email, signingAuthorityBytes })
  )
  localStorage.setItem('__w3ui_identity.default.email', email)
}
