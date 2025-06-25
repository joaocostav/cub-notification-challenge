import { NextFunction, Request, Response } from 'express'
import { logger } from '../utils/logger'

/**
 * API-Token auth. Expects:
 *   Authorization: Bearer <API_TOKEN>
 * where API_TOKEN is set in process.env.API_TOKEN.
 */
export function apiTokenAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.header('authorization') || ''
  const [scheme, token] = authHeader.split(' ')

  if (scheme !== 'Bearer' || token !== process.env.API_TOKEN) {
    logger.warn('Unauthorized request', { path: req.path, method: req.method })
    return res.status(401).json({ error: 'Unauthorized' })
  }

  next()
}
