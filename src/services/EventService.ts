import { Kafka, Producer } from 'kafkajs'
import { logger } from '../utils/logger'

export class EventService {
  private producer: Producer

  constructor(brokers: string[], clientId = 'notification-service', transactionId = 'notification-transaction') {
    const kafka = new Kafka({ clientId, brokers })
    this.producer = kafka.producer({
      idempotent: true,
      transactionalId: transactionId,
      maxInFlightRequests: 1,
    })
  }

  async connect() {
    await this.producer.connect()
    logger.info('Kafka producer connected')
  }

  async publish(topic: string, message: object, key?: string) {
    const transaction = await this.producer.transaction()
    try {
      await transaction.send({
        topic,
        messages: [
          { key, value: JSON.stringify(message) }
        ]
      })
      await transaction.commit()
      logger.info(`Event published to ${topic}`, message)
    } catch (err) {
      await transaction.abort()
      logger.error('Failed to publish event, aborting transaction', err)
      throw err
    }
  }

  async disconnect() {
    await this.producer.disconnect()
    logger.info('Kafka producer disconnected')
  }
}