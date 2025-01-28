import { test, expect } from 'vitest'
import 'fake-indexeddb/auto'
import { renderHook, waitFor } from '@testing-library/react'
import * as DID from '@ipld/dag-ucan/did'
import { Principal, ConnectionView } from '@ucanto/interface'
import { connect } from '@ucanto/client'
import { CAR, HTTP } from '@ucanto/transport'

import { useDatamodel } from '../src/hooks'

test('should create a new client instance if and only if servicePrincipal or connection change', async () => {
  let servicePrincipal: Principal = DID.parse('did:web:web3.storage')
  let connection: ConnectionView<any> = connect({
    id: servicePrincipal,
    codec: CAR.outbound,
    channel: HTTP.open<any>({
      url: new URL('https://up.web3.storage'),
      method: 'POST'
    })
  })
  const { result, rerender } = renderHook(() => useDatamodel({ servicePrincipal, connection }))
  // wait for client to be initialized
  await waitFor(() => { expect(result.current.client).toBeTruthy() })

  const firstClient = result.current.client
  expect(firstClient).not.toBeFalsy()

  rerender()
  expect(result.current.client).toBe(firstClient)

  servicePrincipal = DID.parse('did:web:web3.porridge')
  rerender()
  // wait for the client to change
  await waitFor(() => { expect(result.current.client).not.toBe(firstClient) })
  const secondClient = result.current.client

  connection = connect({
    id: servicePrincipal,
    codec: CAR.outbound,
    channel: HTTP.open<any>({
      url: new URL('https://up.web3.porridge'),
      method: 'POST'
    })
  })
  rerender()
  await waitFor(() => { expect(result.current.client).not.toBe(firstClient) })
  await waitFor(() => { expect(result.current.client).not.toBe(secondClient) })
})
