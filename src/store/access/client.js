import * as API from '@ucanto/interface';
import { Authority } from '@ucanto/authority';
import * as CBOR from '@ucanto/transport/cbor';
import * as HTTP from '@ucanto/transport/http';
import * as Client from '@ucanto/client';
// import * as CAR from '@ucanto/transport/car';
import * as CAR from '../../../patches/@ucanto/transport/car';
import webfetch from 'cross-fetch';

export * from './capability.js';

/**
 * @param {object} options
 * @param {API.DID} options.id
 * @param {URL} options.url
 * @param {string} [options.method]
 * @param {HTTP.Fetcher} [options.fetch]
 * @param {API.OutpboundTranpsortOptions} [options.transport]
 */
export const connect = ({
  id,
  url,
  transport = { encoder: CAR, decoder: CBOR },
  fetch = webfetch,
  method,
}) =>
  Client.connect({
    id: Authority.parse(id),
    ...transport,
    channel: HTTP.open({
      url,
      fetch,
      method,
    }),
  });
