import { WebhookService } from '../../src/services/WebhookService'
import { BadRequestError, NotFoundError, ConflictError } from '../../src/utils/errors'
import { Status } from '../../src/models/Notification'

// Mock logger to avoid CLS errors
jest.mock('../../src/utils/logger', () => ({
  setLogContext: jest.fn(),
  logger: { info: jest.fn(), error: jest.fn() },
}))

describe('WebhookService', () => {
  let notificationService: any
  let service: WebhookService

  beforeEach(() => {
    notificationService = {
      getByExternalId: jest.fn(),
      canTransition: jest.fn(),
      update: jest.fn(),
    }
    service = new WebhookService(notificationService)
  })

  it('throws BadRequestError when timestamp or event missing', async () => {
    await expect(service.process('id', {} as any)).rejects.toThrow(BadRequestError)
    await expect(service.process('id', { timestamp: '2025-01-01' } as any)).rejects.toThrow(BadRequestError)
    await expect(service.process('id', { event: 'sent' } as any)).rejects.toThrow(BadRequestError)
  })

  it('throws BadRequestError for invalid timestamp format', async () => {
    await expect(
      service.process('id', { timestamp: 'invalid-date', event: 'sent' })
    ).rejects.toThrow(BadRequestError)
  })

  it('throws BadRequestError for unknown event type', async () => {
    await expect(
      service.process('id', { timestamp: new Date().toISOString(), event: 'unknown' })
    ).rejects.toThrow(BadRequestError)
  })

  it('throws NotFoundError when notification not found', async () => {
    notificationService.getByExternalId.mockResolvedValue(null)
    await expect(
      service.process('missing', { timestamp: new Date().toISOString(), event: 'sent' })
    ).rejects.toThrow(NotFoundError)
    expect(notificationService.getByExternalId).toHaveBeenCalledWith('missing')
  })

  it('ignores old events (returns null)', async () => {
    const past = new Date('2025-01-01T00:00:00Z')
    const current = new Date('2025-02-01T00:00:00Z')
    const notif = { id: '1', externalId: 'ext', channel: 'sms', status: 'sent' as Status, updatedAt: current }
    notificationService.getByExternalId.mockResolvedValue(notif)
    const result = await service.process('ext', { timestamp: past.toISOString(), event: 'delivered' })
    expect(result).toBeNull()
  })

  it('throws ConflictError for invalid status transition', async () => {
    const now = new Date()
    const notif = { id: '1', externalId: 'ext', channel: 'sms', status: 'delivered' as Status, updatedAt: now }
    notificationService.getByExternalId.mockResolvedValue(notif)
    notificationService.canTransition.mockReturnValue(false)
    await expect(
      service.process('ext', { timestamp: now.toISOString(), event: 'sent' })
    ).rejects.toThrow(ConflictError)
  })

  it('processes valid webhook and updates notification', async () => {
    const now = new Date()
    const notif = { id: '1', externalId: 'ext', channel: 'sms', status: 'sent' as Status, updatedAt: now }
    const updatedNotif = { ...notif, status: 'delivered' as Status, updatedAt: new Date(now.getTime() + 1000) }
    notificationService.getByExternalId.mockResolvedValue(notif)
    notificationService.canTransition.mockReturnValue(true)
    notificationService.update.mockResolvedValue(updatedNotif)

    const result = await service.process('ext', { timestamp: new Date(now.getTime() + 500).toISOString(), event: 'delivered' })
    expect(notificationService.getByExternalId).toHaveBeenCalledWith('ext')
    expect(notificationService.canTransition).toHaveBeenCalledWith('sms', 'sent', 'delivered')
    expect(notificationService.update).toHaveBeenCalledWith('1', { status: 'delivered' })
    expect(result).toEqual(updatedNotif)
  })
})
