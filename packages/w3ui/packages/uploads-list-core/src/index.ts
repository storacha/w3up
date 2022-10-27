import { connect } from '@ucanto/client'
import { SigningPrincipal, ServiceMethod, DID, Capability } from '@ucanto/interface'
import { Principal } from '@ucanto/principal'
import * as CAR from '@ucanto/transport/car'
import * as CBOR from '@ucanto/transport/cbor'
import * as HTTP from '@ucanto/transport/http'
// @ts-expect-error
import { list } from '@web3-storage/access/capabilities/upload'
import { CID } from 'multiformats/cid'

// Production
const serviceUrl = new URL('https://8609r1772a.execute-api.us-east-1.amazonaws.com')
const serviceDid = Principal.parse('did:key:z6MkrZ1r5XBFZjBU34qyD8fueMbMRkKw17BZaq2ivKFjnz2z')

interface Service { uploads: { list: ServiceMethod<UploadsList, ServiceListPage, never> } }
interface UploadsList extends Capability<'uploads/list', DID> {}

interface ServiceListPage {
  count: number
  page: number
  pageSize: number
  results?: ServiceListResult[]
}

interface ServiceListResult {
  carCID: CID
  dataCID: CID
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
    id: serviceDid,
    encoder: CAR,
    decoder: CBOR,
    channel: HTTP.open({
      url: serviceUrl,
      method: 'POST'
    })
  })

  const res = await list.invoke({
    issuer: principal,
    audience: serviceDid,
    with: principal.did()
  }).execute(conn)

  if (res.error != null) {
    // @ts-expect-error ts not know cause
    throw new Error('failed to get uploads list', { cause: res.error })
  }

  const results = res.results == null ? [] : res.results
  return {
    page: res.page,
    pageSize: res.pageSize,
    // @ts-expect-error
    results: results.map(r => ({
      dataCid: r.dataCID,
      carCids: [r.carCID],
      uploadedAt: new Date(r.uploadedAt)
    }))
  }
}
