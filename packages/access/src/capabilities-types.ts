import type { Capability, DIDString, CID } from '@ipld/dag-ucan'

export interface StoreAdd extends Capability<'store/add', DIDString> {
  link?: CID
}

export interface StoreRemove extends Capability<'store/remove', DIDString> {
  link?: CID
}

export interface StoreList extends Capability<'store/list', DIDString> {}

export interface IdentityValidate
  extends Capability<'identity/validate', DIDString> {
  as: `mailto:${string}`
}

export interface IdentityRegister
  extends Capability<'identity/register', `mailto:${string}`> {
  as: DIDString
}

export interface IdentityIdentify
  extends Capability<'identity/identify', DIDString> {}
