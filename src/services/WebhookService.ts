import { Status } from '../models/Notification'
import { BadRequestError, ConflictError, NotFoundError } from '../utils/errors'
import { logger, setLogContext } from '../utils/logger'
import { NotificationService } from './NotificationService'

export class WebhookService {
  private notificationService: NotificationService

  constructor(notificationService: NotificationService) {
    this.notificationService = notificationService
  }

  /**
   * Processes a single webhook event.
   * Returns `null` if the event is older than the current state.
   */
  async process(
    externalId: string,
    payload: { timestamp?: string; event?: string }
  ) {
    const { timestamp, event } = payload

    if (!timestamp || !event) {
      logger.error('Webhook payload missing timestamp or event')
      throw new BadRequestError('Missing timestamp or event')
    }
    const date = new Date(timestamp)
    if (isNaN(date.getTime())) {
      logger.error('Webhook payload has invalid timestamp format')
      throw new BadRequestError('Invalid timestamp format')
    }

    if (!Object.values(Status).includes(event as Status)) {
      logger.error('Webhook payload has unknown event type')
      throw new BadRequestError(`Unknown event type: ${event}`)
    }

    const notification = await this.notificationService.getByExternalId(
      externalId
    )
    if (!notification) {
      logger.error('Webhook payload refers to non-existent notification')
      throw new NotFoundError('Notification not found')
    }

    if (date < notification.updatedAt) {
      setLogContext('lastUpdated', notification.updatedAt.toISOString())
      logger.info('Webhook ignored: event older than last update')
      return null
    }

    const newStatus = event as Status

    if (
      !this.notificationService.canTransition(
        notification.channel,
        notification.status,
        newStatus
      )
    ) {
      throw new ConflictError(
        `Invalid transition: ${notification.status} → ${newStatus}`
      )
    }

    setLogContext('fromStatus', notification.status)
    logger.info('Applying webhook status update')
    const updated = await this.notificationService.update(notification.id, {
      status: newStatus,
    })

    return updated
  }
}
