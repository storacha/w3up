/**
 * @param {import('@web3-storage/worker-utils/router').ParsedRequest} req
 * @param {import('../bindings.js').RouteContext} env
 */
export async function upload(req, env) {
  let size = 0
  const checkStream = new TransformStream({
    transform(chunk, controller) {
      size += chunk.length
      // eslint-disable-next-line no-console
      console.log('🚀 ~ file: upload.js ~ line 10 ~ transform ~ size', size)
      controller.enqueue(chunk)
    },
  })

  if (!req.body) {
    throw new Error('no body')
  }

  await BUCKET.put(`file-${Date.now()}`, req.body?.pipeThrough(checkStream))
  return new Response(String(size))
}
