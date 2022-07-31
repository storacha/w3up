import type { Capability, DID, Link } from '@ucanto/interface'

export interface StoreAdd extends Capability<'store/add', DID> {
  link?: Link
}

export interface StoreRemove extends Capability<'store/remove', DID> {
  link?: Link
}

export interface StoreList extends Capability<'store/list', DID> {}

export interface IdentityValidate extends Capability<'identity/validate', DID> {
  as: `mailto:${string}`
}

export interface IdentityRegister
  extends Capability<'identity/register', `mailto:${string}`> {
  as: DID
}

export interface IdentityIdentify
  extends Capability<'identity/identify', DID> {}
