import { Link } from 'multiformats'

type CARBytes = AsyncIterable<Uint8Array>
type NotFound = undefined

export interface ContentStore {
  read: (cid: Link) => Promise<CARBytes | NotFound>
  write: (cid: Link, data: CARBytes) => Promise<unknown>
}

export interface DagStore {
  read: (cid: string) => Promise<undefined | CARBytes>
}
