import { NotificationController } from './controllers/NotificationController'
import { WebhookController } from './controllers/WebhookController'
import { NotificationRepository } from './repositories/NotificationRepository'
import { NotificationService } from './services/NotificationService'
import { WebhookService } from './services/WebhookService'

export const notificationRepository = new NotificationRepository()

export const notificationService = new NotificationService(notificationRepository)
export const webhookService = new WebhookService(notificationService)

export const notificationController = new NotificationController(notificationService)
export const webhookController = new WebhookController(webhookService)
