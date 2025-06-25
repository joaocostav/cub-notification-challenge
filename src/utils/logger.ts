import { createNamespace } from 'cls-hooked'
import { NextFunction, Request, Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { createLogger, format, transports } from 'winston'

export const mdc = createNamespace('request')

export function clearLogContext() {
  mdc.set('context', {})
}

export function setLogContext(key: string, value: any) {
  const context = (mdc.get('context') as Record<string, any>) || {}
  context[key] = value
  mdc.set('context', context)
}

export function requestContextMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const incomingId = req.headers['x-request-id']
  const requestId =
    typeof incomingId === 'string' && incomingId.trim() ? incomingId : uuidv4()

  mdc.run(() => {
    mdc.set('requestId', requestId)
    mdc.set('context', {})
    next()
  })
}

export const logger = createLogger({
  level: 'info',
  format: format.combine(
    format.timestamp(),
    format.errors({ stack: true }),
    format.printf((info) => {
      const { timestamp, level, message, stack, ...rest } = info

      const requestId = mdc.get('requestId') || '-'
      const bag = (mdc.get('context') as Record<string, any>) || {}

      // merge any per-call metadata passed to logger.info(msg, obj)
      const meta = { ...bag, ...rest }
      const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : ''

      const msg = stack || message
      return `${timestamp} [${requestId}] ${level.toUpperCase()}: ${msg}${metaStr}`
    })
  ),
  transports: [new transports.Console()],
})
