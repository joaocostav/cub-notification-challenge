import { NotificationController } from './controllers/NotificationController'
import { WebhookController } from './controllers/WebhookController'
import { NotificationRepository } from './repositories/NotificationRepository'
import { NotificationService } from './services/NotificationService'
import { WebhookService } from './services/WebhookService'
import { EventService } from './services/EventService'

const brokers = (process.env.KAFKA_BROKER || 'localhost:9092').split(',')

export const notificationRepository = new NotificationRepository()

export const eventService = new EventService(brokers)
export const notificationService = new NotificationService(
  notificationRepository,
  eventService
)
export const webhookService = new WebhookService(notificationService)

export const notificationController = new NotificationController(notificationService)
export const webhookController = new WebhookController(webhookService)
