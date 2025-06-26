import { NotificationService, BadRequestError, NotFoundError } from '../../src/services/NotificationService'
import { Channel, Status } from '../../src/models/Notification'

type NotificationRecord = {
  id: string
  externalId: string
  channel: Channel
  to: string
  body: string
  status: Status
  updatedAt: Date
}

describe('NotificationService (in-memory)', () => {
  let store: NotificationRecord[]
  let repository: any
  let eventService: any
  let service: NotificationService

  beforeEach(() => {
    store = []
    let idCounter = 1
    repository = {
      async findByExternalId(externalId: string) {
        return store.find(n => n.externalId === externalId) || null
      },
      async findById(id: string) {
        return store.find(n => n.id === id) || null
      },
      async create(data: { externalId: string; channel: Channel; to: string; body: string }) {
        const record: NotificationRecord = {
          id: (idCounter++).toString(),
          externalId: data.externalId,
          channel: data.channel,
          to: data.to,
          body: data.body,
          status: 'processing',
          updatedAt: new Date(),
        }
        store.push(record)
        return record
      },
      async update(id: string, expectedUpdatedAt: Date, data: Partial<NotificationRecord>) {
        const rec = store.find(n => n.id === id)
        if (!rec) throw new Error('not found')
        if (rec.updatedAt !== expectedUpdatedAt) throw new Error('conflict')
        Object.assign(rec, data)
        rec.updatedAt = new Date()
        store = store.map(n => (n.id === id ? rec : n))
        return rec
      },
      async delete(id: string) {
        store = store.filter(n => n.id !== id)
      },
      async listByChannel(channel: Channel) {
        return store.filter(n => n.channel === channel)
      },
      async listAll() {
        return [...store]
      },
    }
    eventService = { publish: jest.fn() }
    service = new NotificationService(repository, eventService)
  })

  it('sends and stores a notification', async () => {
    const out = await service.send({ externalId: 'e1', channel: 'sms', to: 't', body: 'b' })
    expect(store).toHaveLength(1)
    expect(out.externalId).toBe('e1')
    expect(eventService.publish).toHaveBeenCalledWith(
      'notification-events',
      expect.objectContaining({ id: out.id }),
      out.id
    )
  })

  it('rejects duplicate externalId', async () => {
    await service.send({ externalId: 'dup', channel: 'sms', to: 't', body: 'b' })
    await expect(
      service.send({ externalId: 'dup', channel: 'sms', to: 't2', body: 'b2' })
    ).rejects.toThrow(BadRequestError)
  })

  it('getById returns stored record or throws', async () => {
    const rec = await service.send({ externalId: 'x', channel: 'sms', to: 't', body: 'b' })
    await expect(service.getById(rec.id)).resolves.toEqual(rec)
    await expect(service.getById('nope')).rejects.toThrow(NotFoundError)
  })

  it('lists all and by channel', async () => {
    await service.send({ externalId: 'a', channel: 'sms', to: 't', body: 'b' })
    await service.send({ externalId: 'b', channel: 'whatsApp', to: 'u', body: 'm' })
    const all = await service.list()
    expect(all).toHaveLength(2)
    const smsOnly = await service.list('sms')
    expect(smsOnly).toHaveLength(1)
    await expect(service.list('invalid' as any)).rejects.toThrow(BadRequestError)
  })

  it('updates and deletes notifications', async () => {
    const rec = await service.send({ externalId: 'u1', channel: 'sms', to: 't', body: 'b' })
    const updated = await service.update(rec.id, { body: 'new' })
    expect(updated.body).toBe('new')
    await expect(service.update('no', {})).rejects.toThrow(NotFoundError)
    await service.delete(rec.id)
    await expect(service.getById(rec.id)).rejects.toThrow(NotFoundError)
  })

  it('getByExternalId returns stored record or throws', async () => {
    const rec = await service.send({ externalId: 'ext1', channel: 'sms', to: 't', body: 'b' })
    await expect(service.getByExternalId(rec.externalId)).resolves.toEqual(rec)
    await expect(service.getByExternalId('no-exists')).rejects.toThrow(NotFoundError)
  })

  it('allows updating status in correct order', async () => {
    const rec = await service.send({ externalId: 'ext2', channel: 'sms', to: 't', body: 'b' })
    const sentRec = await service.update(rec.id, { status: 'sent' })
    expect(sentRec.status).toBe('sent')
    const deliveredRec = await service.update(rec.id, { status: 'delivered' })
    expect(deliveredRec.status).toBe('delivered')
  })

  it('enforces canTransition logic via canTransition method', () => {
    // valid transitions
    expect(service.canTransition('sms', 'processing', 'sent')).toBe(true)
    expect(service.canTransition('sms', 'sent', 'delivered')).toBe(true)
    // invalid transitions
    expect(service.canTransition('sms', 'delivered', 'sent')).toBe(false)
    expect(service.canTransition('sms', 'rejected', 'sent')).toBe(false)
    // invalid statuses or channels
    expect(service.canTransition('sms', 'invalid' as Status, 'sent')).toBe(false)
    expect(service.canTransition('invalid' as any, 'processing', 'sent')).toBe(false)
  })
})
