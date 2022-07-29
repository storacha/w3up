import {
  RequestDecoder,
  RequestEncoder,
  ResponseDecoder,
  ResponseEncoder,
} from '@ucanto/interface'

export interface ClientCodec extends RequestEncoder, ResponseDecoder {}

export interface ServerCodec extends RequestDecoder, ResponseEncoder {}
