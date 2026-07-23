import express from 'express'
import cors from 'cors'
import router from './routes'
import { errorHandler } from './middleware/errorHandler'

const app = express()

const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',')
  : ['*']

app.use(cors({
  origin: allowedOrigins,
}))
app.use(express.json())

app.get('/health', (_, res) => res.json({ status: 'ok' }))

app.use('/api', router)

app.use(errorHandler)

export default app
