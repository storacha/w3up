export interface SignerOptions {
  accessKeyId: string
  secretAccessKey: string
  region: string
  cache?: Map<string, ArrayBuffer>
  bucket: string
  expires?: number
}
