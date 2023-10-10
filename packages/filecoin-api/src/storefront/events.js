import { StoreOperationFailed } from '../errors.js'

/**
 * @param {import('./api').ServiceContext} context
 * @param {import('./api').FilecoinSubmitMessage} message
 */
export const handleFilecoinSubmitMessage = async (context, message) => {
  // TODO: verify piece

  const putRes = await context.pieceStore.put({
    piece: message.piece,
    content: message.content,
    group: message.group,
    status: 'submitted',
    insertedAt: Date.now(),
    updatedAt: Date.now()
  })
  if (putRes.error) {
    return { error: new StoreOperationFailed(putRes.error.message) }
  }
  return { ok: {} }
}

/**
 * @param {import('./api').ServiceContext} context
 * @param {import('./api').PieceRecord} record
 */
export const handlePieceInsert = async (context, record) => {
  // TODO: invoke filecoin/submit
  return { ok: {} }
}

/**
 * @param {import('./api').ServiceContext} context
 */
export const handleCronTick = async (context) => {
  // TODO: get pieces where status === submitted
  //       read receipts to determine if an aggregate accepted for each piece
  //       update piece status to accepted if yes
}

/**
 * @param {import('./api').ServiceContext} context
 * @param {import('./api').PieceRecord} record
 */
export const handlePieceStatusAccepted = async (context, record) => {
  // TODO: invoke filecoin/accept /w content & piece
  return { ok: {} }
}