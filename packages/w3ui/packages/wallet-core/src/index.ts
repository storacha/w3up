import * as Keypair from '@ucanto/authority'
import { Authority } from '@ucanto/authority'
import type { SigningAuthority } from '@ucanto/interface'
import * as Access from '@web3-storage/access'

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

export async function registerIdentity (email: string, options: RegisterIdentityOptions = {}): Promise<Identity> {
  if (email == null || email === '') {
    throw new Error('missing email address')
  }

  const onAuthStatusChange = options.onAuthStatusChange || (() => {})
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

    // TODO: save to storage
    onAuthStatusChange(AuthStatus.SignedIn)
    return { email, signingAuthority }
  } catch (err) {
    onAuthStatusChange(AuthStatus.SignedOut)
    throw err
  }
}
