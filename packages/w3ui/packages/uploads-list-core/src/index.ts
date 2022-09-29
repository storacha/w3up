import { connect } from '@ucanto/client'
import { SigningPrincipal, ServiceMethod, DID, Capability } from '@ucanto/interface'
import { Principal } from '@ucanto/principal'
import * as CAR from '@ucanto/transport/car'
import * as CBOR from '@ucanto/transport/cbor'
import * as HTTP from '@ucanto/transport/http'
import { storeList } from '@web3-storage/access/capabilities'
import { CID } from 'multiformats/cid'

// Production
const storeApiUrl = new URL('https://8609r1772a.execute-api.us-east-1.amazonaws.com')
const storeDid = Principal.parse('did:key:z6MkrZ1r5XBFZjBU34qyD8fueMbMRkKw17BZaq2ivKFjnz2z')

interface Service { store: { list: ServiceMethod<StoreList, ServiceListPage, never> } }
interface StoreList extends Capability<'store/list', DID> {}

interface ServiceListPage {
  count: number
  page: number
  pagesize: number
  results: ServiceListResult[]
}

interface ServiceListResult {
  carCID: CID
  rootContentCID: CID
  uploadedAt: number
}

export interface ListPage {
  page: number
  pageSize: number
  results: ListResult[]
}

export interface ListResult {
  dataCid: CID
  carCids: CID[]
  uploadedAt: Date
}

export async function listUploads (principal: SigningPrincipal, _: { signal?: AbortSignal } = {}): Promise<ListPage> {
  const conn = connect<Service>({
    id: storeDid,
    encoder: CAR,
    decoder: CBOR,
    channel: HTTP.open({
      url: storeApiUrl,
      method: 'POST'
    })
  })

  const res = await storeList.invoke({
    issuer: principal,
    audience: storeDid,
    with: principal.did()
  }).execute(conn)

  if (res.error != null) {
    // @ts-expect-error ts not know cause
    throw new Error('failed to get uploads list', { cause: res.error })
  }

  return {
    page: res.page,
    pageSize: res.pagesize,
    results: res.results.map(r => ({
      dataCid: r.rootContentCID,
      carCids: [r.carCID],
      uploadedAt: new Date(r.uploadedAt)
    }))
  }
}
