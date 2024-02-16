import { Queue } from './queue.js'

/**
 * @param {Map<string, unknown[]>} queuedMessages
 */
export const getQueueImplementations = (
  queuedMessages,
  QueueImplementation = Queue
) => {
  queuedMessages.set('storeDeliverQueue', [])
  const storeDeliverQueue = new QueueImplementation({
    /**
     * @param {any} message 
     */
    onMessage: (message) => {
      const messages = queuedMessages.get('storeDeliverQueue') || []
      messages.push(message)
      queuedMessages.set('storeDeliverQueue', messages)
    },
  })
  return {
    storeDeliverQueue,
  }
}
