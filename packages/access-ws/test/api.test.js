import { mf, test } from './helpers/setup.js'
import pWaitFor from 'p-wait-for'

test.before((t) => {
  t.context = { mf }
})

test('should create room', async (t) => {
  const { mf } = t.context
  const res = await mf.dispatchFetch('http://localhost:8787/room', {
    method: 'POST',
  })
  const rsp = await res.text()
  t.truthy(rsp)
})

test('should create named room', async (t) => {
  const { mf } = t.context
  const res = await mf.dispatchFetch('http://localhost:8787/room?name=hugo', {
    method: 'POST',
  })
  const rsp = await res.json()

  const room = await mf.dispatchFetch(`http://localhost:8787/room/${rsp.id}`, {
    method: 'POST',
  })
  const roomRsp = await room.json()

  t.deepEqual(rsp.id, roomRsp.id)
})

test('should connect named room', async (t) => {
  const { mf } = t.context
  let done = 0
  const res = await mf.dispatchFetch('http://localhost:8787/room?name=hugo', {
    method: 'POST',
  })
  const rsp = await res.json()

  const connect = await mf.dispatchFetch(
    'http://127.0.0.1:8787/connect/' + rsp.id
  )
  const ws = connect.webSocket
  if (!ws) {
    throw new Error('no ws')
  }
  ws.accept()
  const msg1 = { type: 'message', message: 'one' }
  const msg2 = { type: 'message', message: 'two' }
  ws.addEventListener('message', (event) => {
    // @ts-ignore
    const data = JSON.parse(event.data)
    t.like(data, msg2)
    ws.close()
    done++
  })

  const connect2 = await mf.dispatchFetch(
    'http://127.0.0.1:8787/connect/' + rsp.id
  )
  const ws2 = connect2.webSocket
  if (!ws2) {
    throw new Error('no ws')
  }
  ws2.accept()
  ws2.addEventListener('message', (event) => {
    // @ts-ignore
    const data = JSON.parse(event.data)
    t.like(data, msg1)
    ws2.close()
    done++
  })

  ws2.send(JSON.stringify(msg2))
  ws.send(JSON.stringify(msg1))

  await pWaitFor(() => done === 2)
})

test('should connect without preflight', async (t) => {
  const { mf } = t.context
  let done = 0
  // const res = await mf.dispatchFetch('http://localhost:8787/room?name=hugo', {
  //   method: 'POST',
  // })
  // const rsp = await res.json()

  const msg1 = { type: 'message', message: 'one' }
  const msg2 = { type: 'message', message: 'two' }
  const connect = await mf.dispatchFetch('http://127.0.0.1:8787/connect/hugo2')
  const ws = connect.webSocket
  ws?.accept()
  ws?.addEventListener('message', (event) => {
    // @ts-ignore
    const data = JSON.parse(event.data)
    t.like(data, msg2)
    ws.close()
    done++
  })

  const connect2 = await mf.dispatchFetch('http://127.0.0.1:8787/connect/hugo2')
  const ws2 = connect2.webSocket
  ws2?.accept()
  ws2?.addEventListener('message', (event) => {
    // @ts-ignore
    const data = JSON.parse(event.data)
    t.like(data, msg1)
    ws2.close()
    done++
  })

  ws2?.send(JSON.stringify(msg2))
  ws?.send(JSON.stringify(msg1))

  await pWaitFor(() => done === 2)
})
