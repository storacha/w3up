export interface SigV4Options {
  accessKeyId: string
  secretAccessKey: string
  sessionToken?: string
  region: string
  cache?: Map<string, ArrayBuffer>
}

export interface SignOptions {
  bucket: string
  key: string
  checksum?: string
  expires?: number
}
