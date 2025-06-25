import { Request, Response, NextFunction } from 'express'
import { logger } from '../utils/logger'

export function ErrorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) {
  logger.error(err.message)
  res
    .status(err.status || 500)
    .json({ error: err.message || 'Internal Server Error' })
}
