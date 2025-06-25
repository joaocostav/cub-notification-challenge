import {
  NextFunction,
  Request,
  RequestHandler,
  Response,
  Router,
} from 'express'
import { WebhookService } from '../services/WebhookService'
import { BadRequestError, ConflictError, NotFoundError } from '../utils/errors'
import { clearLogContext, logger, setLogContext } from '../utils/logger'

export class WebhookController {
  public router = Router()
  private service: WebhookService

  constructor(service: WebhookService) {
    this.service = service
    this.router.post(
      '/webhook/:externalId',
      this.handle.bind(this) as RequestHandler
    )
  }

  private async handle(
    req: Request<{ externalId: string }>,
    res: Response,
    next: NextFunction
  ) {
    clearLogContext()
    const { externalId } = req.params
    const payload = req.body
    setLogContext('externalId', externalId)
    setLogContext('payload', payload)

    logger.info('Webhook received')

    try {
      const result = await this.service.process(externalId, payload)
      if (result === null) {
        // older‐event, safe to ack
        return res
          .status(200)
          .json({ ok: true, message: 'Older event ignored' })
      }
      return res.json({ ok: true, notification: result })
    } catch (error) {
      if (error instanceof BadRequestError) {
        return res.status(400).json({ error: error.message })
      }
      if (error instanceof NotFoundError) {
        return res.status(404).json({ error: error.message })
      }
      if (error instanceof ConflictError) {
        return res.status(409).json({ error: error.message })
      }
      next(error)
    }
  }
}
