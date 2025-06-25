import { logger } from '../utils/logger'
import { db } from '../db'
import { Notification, Channel, Status } from '../models/Notification'

export class NotificationRepository {
  /** 
   * Create a new notification  
   * @param data.externalId  unique id from external system
   * @param data.channel     sms | whatsApp
   * @param data.to          recipient (e.g. "+5511999999999")
   * @param data.body        message body
   */
  async create(data: {
    externalId: string
    channel: Channel
    to: string
    body: string
  }): Promise<Notification> {
    logger.debug('Creating notification', data)
    return db.notification.create({ data })
  }

  /** Find by our internal ID */
  async findById(id: string): Promise<Notification | null> {
    logger.debug('Finding notification by ID', id)
    return db.notification.findUnique({ where: { id } })
  }

  /** Find by the externalId (so we don’t double-send) */
  async findByExternalId(externalId: string): Promise<Notification | null> {
    logger.debug('Finding notification by external ID', externalId)
    return db.notification.findUnique({ where: { externalId } })
  }

  /** General update (any subset of fields) */
  async update(
    id: string,
    data: Partial<{
      externalId: string
      channel: Channel
      to: string
      body: string
      status: Status
    }>
  ): Promise<Notification> {
    return db.notification.update({
      where: { id },
      data,
    })
  }

  /** Delete by ID */
  async delete(id: string): Promise<void> {
    await db.notification.delete({ where: { id } })
  }

  /** List all notifications for a given channel */
  async listByChannel(channel: Channel): Promise<Notification[]> {
    return db.notification.findMany({ where: { channel } })
  }

  /** List everything */
  async listAll(): Promise<Notification[]> {
    return db.notification.findMany()
  }
}
