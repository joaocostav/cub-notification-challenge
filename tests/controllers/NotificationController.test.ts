import express from 'express'
import request from 'supertest'
import { NotificationController } from '../../src/controllers/NotificationController'
import { BadRequestError, NotFoundError } from '../../src/services/NotificationService'
import bodyParser from 'body-parser'

// Mock logger to prevent CLS issues
jest.mock('../../src/utils/logger', () => ({
  clearLogContext: jest.fn(),
  setLogContext: jest.fn(),
  logger: { info: jest.fn(), error: jest.fn() },
}))

describe('NotificationController', () => {
  let app: express.Express
  let service: any

  beforeEach(() => {
    service = {
      send: jest.fn(),
      getById: jest.fn(),
      list: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    }
    const controller = new NotificationController(service)
    app = express()
    app.use(bodyParser.json())
    app.use(controller.router)
    // error handler
    app.use((err: any, req: any, res: any, next: any) => {
      res.status(500).json({ error: err.message })
    })
  })

  it('returns 400 on create when missing fields', async () => {
    const res = await request(app).post('/notifications').send({})
    expect(res.status).toBe(400)
    expect(res.body).toEqual({ error: 'externalId, channel, to and body are required' })
    expect(service.send).not.toHaveBeenCalled()
  })

  it('returns 201 on successful create', async () => {
    const now = new Date()
    const notif = { id: '1', externalId: 'e1', channel: 'sms', to: 't', body: 'b', status: 'processing', createdAt: now, updatedAt: now }
    service.send.mockResolvedValue(notif)
    const payload = { externalId: 'e1', channel: 'sms', to: 't', body: 'b' }
    const res = await request(app).post('/notifications').send(payload)
    expect(res.status).toBe(201)
    expect(res.body).toEqual({ ok: true, notification: { ...notif, createdAt: notif.createdAt.toISOString(), updatedAt: notif.updatedAt.toISOString() } })
  })

  it('returns 404 on getById when not found', async () => {
    service.getById.mockRejectedValue(new NotFoundError('not found'))
    const res = await request(app).get('/notifications/1')
    expect(res.status).toBe(404)
    expect(res.body).toEqual({ error: 'not found' })
  })

  it('returns 200 on getById', async () => {
    const now = new Date()
    const notif = { id: '1', externalId: 'e1', channel: 'sms', to: 't', body: 'b', status: 'processing', createdAt: now, updatedAt: now }
    service.getById.mockResolvedValue(notif)
    const res = await request(app).get('/notifications/1')
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ ok: true, notification: { ...notif, createdAt: notif.createdAt.toISOString(), updatedAt: notif.updatedAt.toISOString() } })
  })

  it('returns 200 on list', async () => {
    const now = new Date()
    const notif1 = { id: '1', externalId: 'e1', channel: 'sms', to: 't', body: 'b', status: 'processing', createdAt: now, updatedAt: now }
    const notif2 = { id: '2', externalId: 'e2', channel: 'whatsApp', to: 'u', body: 'm', status: 'processing', createdAt: now, updatedAt: now }
    service.list.mockResolvedValue([notif1, notif2])
    const res = await request(app).get('/notifications')
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ ok: true, notifications: [
      { ...notif1, createdAt: notif1.createdAt.toISOString(), updatedAt: notif1.updatedAt.toISOString() },
      { ...notif2, createdAt: notif2.createdAt.toISOString(), updatedAt: notif2.updatedAt.toISOString() },
    ] })
  })

  it('returns 400 on list invalid channel', async () => {
    service.list.mockRejectedValue(new BadRequestError('Unknown channel: invalid'))
    const res = await request(app).get('/notifications?channel=invalid')
    expect(res.status).toBe(400)
    expect(res.body).toEqual({ error: 'Unknown channel: invalid' })
  })

  it('returns 400 on update when missing data', async () => {
    const res = await request(app).patch('/notifications/1').send({})
    expect(res.status).toBe(400)
    expect(res.body).toEqual({ error: 'At least one of to or body must be provided' })
    expect(service.update).not.toHaveBeenCalled()
  })

  it('returns 200 on update', async () => {
    const now = new Date()
    const notif = { id: '1', externalId: 'e1', channel: 'sms', to: 't', body: 'b', status: 'processing', createdAt: now, updatedAt: now }
    service.update.mockResolvedValue(notif)
    const res = await request(app).patch('/notifications/1').send({ body: 'new' })
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ ok: true, notification: { ...notif, createdAt: notif.createdAt.toISOString(), updatedAt: notif.updatedAt.toISOString() } })
  })

  it('returns 404 on update when not found', async () => {
    service.update.mockRejectedValue(new NotFoundError('not found'))
    const res = await request(app).patch('/notifications/1').send({ to: 'x' })
    expect(res.status).toBe(404)
    expect(res.body).toEqual({ error: 'not found' })
  })

  it('returns 204 on delete', async () => {
    service.delete.mockResolvedValue(undefined)
    const res = await request(app).delete('/notifications/1')
    expect(res.status).toBe(204)
  })

  it('returns 404 on delete when not found', async () => {
    service.delete.mockRejectedValue(new NotFoundError('not found'))
    const res = await request(app).delete('/notifications/1')
    expect(res.status).toBe(404)
    expect(res.body).toEqual({ error: 'not found' })
  })

  it('propagates unexpected errors', async () => {
    service.send.mockRejectedValue(new Error('oops'))
    const res = await request(app).post('/notifications').send({ externalId: 'e1', channel: 'sms', to: 't', body: 'b' })
    expect(res.status).toBe(500)
    expect(res.body).toEqual({ error: 'oops' })
  })
})
