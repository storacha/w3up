import { Queue } from './queue.js'

/**
 * @param {Map<string, unknown[]>} queuedMessages
 */
export const getQueueImplementations = (
  queuedMessages,
  QueueImplementation = Queue
) => {
  queuedMessages.set('storeConfirmQueue', [])
  const storeConfirmQueue = new QueueImplementation({
    /**
     * @param {any} message 
     */
    onMessage: (message) => {
      const messages = queuedMessages.get('storeConfirmQueue') || []
      messages.push(message)
      queuedMessages.set('storeConfirmQueue', messages)
    },
  })
  return {
    storeConfirmQueue,
  }
}
