import { Link } from 'multiformats'

type Data = AsyncIterable<Uint8Array>
type NotFound = undefined

export interface ContentStore {
  read: (cid: Link) => Promise<Data | NotFound>
  write: (cid: Link, data: Data) => Promise<unknown>
}
