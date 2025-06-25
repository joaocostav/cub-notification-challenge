import { Channel, Notification } from '../models/Notification'

export class NotificationSdk {
  // checks if a notification with the given externalId exists
  async exists(externalId: string): Promise<boolean> {
    // mocked value, could return false
    return true
  }

  // sends a notification
  async send(
    channel: Channel,
    to: string,
    body: string,
    externalId: string
  ): Promise<Notification> {
    // mocked charge
    const id = (Math.random() + 1).toString(36).substring(7)
    return {
      id,
      channel,
      to,
      body,
      externalId,
      status: 'processing',
      createdAt: new Date(),
      updatedAt: new Date(),
    }
  }
}
