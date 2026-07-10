import express from 'express'
import cors from 'cors'
import router from './routes'
import { errorHandler } from './middleware/errorHandler'

const app = express()

app.use(cors())
app.use(express.json())

app.get('/health', (_, res) => res.json({ status: 'ok' }))

app.use('/api', router)

app.use(errorHandler)

export default app
