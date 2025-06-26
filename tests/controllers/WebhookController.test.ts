import express from 'express'
import request from 'supertest'
import { WebhookController } from '../../src/controllers/WebhookController'
import { BadRequestError, NotFoundError, ConflictError } from '../../src/utils/errors'
import bodyParser from 'body-parser'

describe('WebhookController', () => {
  let app: express.Express
  let service: any

  beforeEach(() => {
    service = { process: jest.fn() }
    const controller = new WebhookController(service)
    app = express()
    app.use(bodyParser.json())
    app.use(controller.router)
  })

  it('returns 200 and ignored message for older event', async () => {
    const payload = { timestamp: '2025-01-01T00:00:00Z', event: 'sent' }
    service.process.mockResolvedValue(null)
    const res = await request(app)
      .post('/webhook/external1')
      .send(payload)
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ ok: true, message: 'Older event ignored' })
    expect(service.process).toHaveBeenCalledWith('external1', payload)
  })

  it('returns 200 and notification object for new event', async () => {
    const payload = { timestamp: new Date().toISOString(), event: 'delivered' }
    const notif = { id: '1', externalId: 'external1', status: 'delivered', channel: 'sms', to: 't', body: 'b', updatedAt: new Date() }
    service.process.mockResolvedValue(notif)
    const res = await request(app)
      .post('/webhook/external1')
      .send(payload)
    expect(res.status).toBe(200)
    expect(res.body).toEqual({
      ok: true,
      notification: { ...notif, updatedAt: notif.updatedAt.toISOString() }
    })
  })

  it('returns 404 when service throws NotFoundError', async () => {
    service.process.mockRejectedValue(new NotFoundError('not found'))
    const res = await request(app)
      .post('/webhook/id')
      .send({ timestamp: new Date().toISOString(), event: 'sent' })
    expect(res.status).toBe(404)
    expect(res.body).toEqual({ error: 'not found' })
  })

  it('returns 409 when service throws ConflictError', async () => {
    service.process.mockRejectedValue(new ConflictError('conflict'))
    const res = await request(app)
      .post('/webhook/id')
      .send({ timestamp: new Date().toISOString(), event: 'sent' })
    expect(res.status).toBe(409)
    expect(res.body).toEqual({ error: 'conflict' })
  })

  it('returns 400 when service throws BadRequestError', async () => {
    service.process.mockRejectedValue(new BadRequestError('bad request'))
    const res = await request(app)
      .post('/webhook/id')
      .send({ timestamp: new Date().toISOString(), event: 'sent' })
    expect(res.status).toBe(400)
    expect(res.body).toEqual({ error: 'bad request' })
  })

  it('propagates unexpected errors with next', async () => {
    // Simulate unexpected error
    service.process.mockRejectedValue(new Error('oops'))
    // Define error handler to capture next
    app.use((err: any, req: any, res: any, next: any) => {
      res.status(500).json({ error: err.message })
    })
    const res = await request(app)
      .post('/webhook/id')
      .send({ timestamp: new Date().toISOString(), event: 'sent' })
    expect(res.status).toBe(500)
    expect(res.body).toEqual({ error: 'oops' })
  })
})
