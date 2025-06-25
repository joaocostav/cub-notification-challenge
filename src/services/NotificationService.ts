import { Channel, Notification, Status } from '../models/Notification'
import { NotificationRepository } from '../repositories/NotificationRepository'
import { NotificationSdk } from '../sdk/NotificationSdk'
import { logger } from '../utils/logger'
import { EventService } from './EventService'

// HTTP‐style errors for controller to map
export class BadRequestError extends Error {}
export class NotFoundError extends Error {}

export class NotificationService {
  private sdk = new NotificationSdk()
  private repository: NotificationRepository
  private eventService: EventService

  constructor(
    repository: NotificationRepository,
    eventService: EventService
  ) {
    this.repository = repository
    this.eventService = eventService
  }

  /**
   * Ordered statuses per channel. Allows skipping ahead but never back.
   */
  private statusOrder: Record<Channel, Status[]> = {
    sms: ['processing', 'rejected', 'sent', 'delivered'],
    whatsApp: ['processing', 'rejected', 'sent', 'delivered', 'viewed'],
  }

  canTransition(channel: Channel, from: Status, to: Status): boolean {
    const order = this.statusOrder[channel]
    if (!order) return false

    const fromIdx = order.indexOf(from)
    const toIdx = order.indexOf(to)

    // invalid statuses
    if (fromIdx < 0 || toIdx < 0) return false

    // terminal rejection: no further transitions
    if (from === 'rejected') return false

    // only allow moving forward in the ordered list
    return toIdx > fromIdx
  }

  /** Sends a new notification (via SDK + DB) */
  async send(data: {
    externalId: string
    channel: Channel
    to: string
    body: string
  }): Promise<Notification> {
    // prevent duplicates
    const exists = await this.repository.findByExternalId(data.externalId)
    if (exists) {
      throw new BadRequestError(
        `Notification with externalId=${data.externalId} already exists`
      )
    }

    // call external SDK
    const sent = await this.sdk.send(
      data.channel,
      data.to,
      data.body,
      data.externalId
    )
    logger.info('Sent via SDK, now persisting to DB', { sent })

    // persist in our DB
    const created = await this.repository.create({
      externalId: sent.externalId,
      channel: sent.channel,
      to: sent.to,
      body: sent.body,
    })

    // publish event to Kafka at-least-once
    await this.eventService.publish(
      'notification-events',
      {
        id: created.id,
        externalId: created.externalId,
        status: created.status,
        channel: created.channel,
        to: created.to,
        body: created.body,
        updatedAt: created.updatedAt,
      },
      created.id
    )

    return created
  }

  /** Retrieve one by internal ID */
  async getById(id: string): Promise<Notification> {
    const notification = await this.repository.findById(id)
    if (!notification)
      throw new NotFoundError(`Notification id=${id} not found`)
    return notification
  }

  /** Retrieve one by external ID */
  async getByExternalId(externalId: string): Promise<Notification> {
    const notification = await this.repository.findByExternalId(externalId)
    if (!notification)
      throw new NotFoundError(`Notification externalId=${externalId} not found`)
    return notification
  }

  /** List all or filter by channel */
  async list(channel?: string): Promise<Notification[]> {
    if (channel) {
      // validate channel
      if (!Object.values(Channel).includes(channel as Channel)) {
        throw new BadRequestError(`Unknown channel: ${channel}`)
      }
      return this.repository.listByChannel(channel as Channel)
    }
    return this.repository.listAll()
  }

  /** Update any mutable fields */
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
    const existing = await this.repository.findById(id)
    if (!existing) throw new NotFoundError(`Notification id=${id} not found`)
    return this.repository.update(id, existing.updatedAt, data)
  }

  /** Delete by ID */
  async delete(id: string): Promise<void> {
    const existing = await this.repository.findById(id)
    if (!existing) throw new NotFoundError(`Notification id=${id} not found`)
    await this.repository.delete(id)
  }
}
