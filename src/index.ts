import dotenv from 'dotenv'
import express, { RequestHandler } from 'express'
import { apiTokenAuth } from './middlewares/AuthHandler'
import { ErrorHandler } from './middlewares/ErrorHandler'
import { notificationController, webhookController } from './singleton'
import { logger, requestContextMiddleware } from './utils/logger'

dotenv.config()

const app = express()
app.use(express.json())
app.use(requestContextMiddleware) // MDC-style context per request
app.use(apiTokenAuth as RequestHandler) // API Token authentication middleware

app.use(webhookController.router)
app.use(notificationController.router)

app.use(ErrorHandler)

const PORT = process.env.PORT || 3000
if (require.main === module) {
  app.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`)
  })
}

export default app
