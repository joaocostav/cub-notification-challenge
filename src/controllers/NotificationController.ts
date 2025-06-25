import { Channel } from '@prisma/client'
import {
  NextFunction,
  Request,
  RequestHandler,
  Response,
  Router,
} from 'express'
import {
  BadRequestError,
  NotFoundError,
  NotificationService,
} from '../services/NotificationService'
import { clearLogContext, logger, setLogContext } from '../utils/logger'

export class NotificationController {
  public router = Router()
  private service: NotificationService

  constructor(service: NotificationService) {
    this.service = service
    this.router.post('/notifications', this.send.bind(this) as RequestHandler)
    this.router.get(
      '/notifications/:id',
      this.getById.bind(this) as RequestHandler
    )
    this.router.get('/notifications', this.list.bind(this) as RequestHandler)
    this.router.patch(
      '/notifications/:id',
      this.update.bind(this) as RequestHandler
    )
    this.router.delete(
      '/notifications/:id',
      this.delete.bind(this) as RequestHandler
    )
  }

  /** POST /notifications */
  private async send(
    req: Request<
      {},
      {},
      { externalId?: string; channel?: string; to?: string; body?: string }
    >,
    res: Response,
    next: NextFunction
  ) {
    // reset and capture full payload
    clearLogContext()
    setLogContext('payload', req.body)
    logger.info('Create notification request')

    try {
      const { externalId, channel, to, body } = req.body

      // basic validation
      if (!externalId || !channel || !to || !body) {
        throw new BadRequestError(
          'externalId, channel, to and body are required'
        )
      }

      // call service
      const notif = await this.service.send({
        externalId,
        channel: channel as Channel,
        to,
        body,
      })

      return res.status(201).json({ ok: true, notification: notif })
    } catch (err) {
      if (err instanceof BadRequestError) {
        return res.status(400).json({ error: err.message })
      }
      next(err)
    }
  }

  /** GET /notifications/:id */
  private async getById(
    req: Request<{ id: string }>,
    res: Response,
    next: NextFunction
  ) {
    clearLogContext()
    setLogContext('params', req.params)
    logger.info('Get notification by ID')

    try {
      const notif = await this.service.getById(req.params.id)
      return res.json({ ok: true, notification: notif })
    } catch (err) {
      if (err instanceof NotFoundError) {
        return res.status(404).json({ error: err.message })
      }
      next(err)
    }
  }

  /** GET /notifications?channel=sms */
  private async list(
    req: Request<{}, {}, {}, { channel?: string }>,
    res: Response,
    next: NextFunction
  ) {
    clearLogContext()
    setLogContext('query', req.query)
    logger.info('List notifications')

    try {
      const items = await this.service.list(req.query.channel)
      return res.json({ ok: true, notifications: items })
    } catch (err) {
      if (err instanceof BadRequestError) {
        return res.status(400).json({ error: err.message })
      }
      next(err)
    }
  }

  /** PATCH /notifications/:id */
  private async update(
    req: Request<{ id: string }, {}, { to?: string; body?: string }>,
    res: Response,
    next: NextFunction
  ) {
    clearLogContext()
    setLogContext('params', req.params)
    setLogContext('payload', req.body)
    logger.info('Update notification')

    try {
      const { to, body } = req.body
      if (!to && !body) {
        throw new BadRequestError('At least one of to or body must be provided')
      }
      const updated = await this.service.update(req.params.id, { to, body })
      return res.json({ ok: true, notification: updated })
    } catch (err) {
      if (err instanceof BadRequestError) {
        return res.status(400).json({ error: err.message })
      }
      if (err instanceof NotFoundError) {
        return res.status(404).json({ error: err.message })
      }
      next(err)
    }
  }

  /** DELETE /notifications/:id */
  private async delete(
    req: Request<{ id: string }>,
    res: Response,
    next: NextFunction
  ) {
    clearLogContext()
    setLogContext('params', req.params)
    logger.info('Delete notification')

    try {
      await this.service.delete(req.params.id)
      return res.status(204).send()
    } catch (err) {
      if (err instanceof NotFoundError) {
        return res.status(404).json({ error: err.message })
      }
      next(err)
    }
  }
}
