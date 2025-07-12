import { Client } from 'whatsapp-web.js'
import qrcode from 'qrcode-terminal'
import dotenv from 'dotenv'
import axios from 'axios'
import express from 'express'

dotenv.config()

const WEBHOOK_URL = process.env.WEBHOOK_URL!

const fireWebhook = async (payload: unknown) => {
  try {
    await axios.post(WEBHOOK_URL, payload, { timeout: 8000 })
    console.log('✅ Webhook enviado')
  } catch (err) {
    console.error('❌ Error enviando webhook', err)
  }
}

const client = new Client({
  puppeteer: {
    headless: true,
    args: ['--no-sandbox']
  }
})

client.on('qr', (qr) => {
  qrcode.generate(qr, { small: true })
})

client.on('ready', () => {
  console.log('✅ WhatsApp listo')
})

client.on('message', async (msg) => {
  const payload = {
    id: msg.id._serialized,
    from: msg.from,
    timestamp: msg.timestamp,
    body: msg.body,
    isGroup: msg.from.endsWith('@g.us')
  }

  // Obtener el chat
  const chat = await msg.getChat()

    // Enviar el webhook de inmediato
  await fireWebhook(payload)
  
  // Esperar 2s antes de comenzar a escribir
  setTimeout(() => {
    chat.sendStateTyping()
  }, 1500)

})

client.initialize()

const app = express()
const PORT = 3002

app.use(express.json())

// 🧠 Ruta para enviar mensajes desde n8n
app.post('/send-message', async (req, res) => {
  const { to, message } = req.body

  if (!to || !message) {
    return res.status(400).json({ error: 'Falta "to" o "message"' })
  }

  try {
    const chat = await client.getChatById(to)

    await client.sendMessage(to, message)

    // Limpia el estado
    await chat.clearState()

    console.log(`✅ Mensaje enviado a ${to}: ${message}`)
    res.json({ status: 'ok' })
  } catch (error: any) {
    console.error('❌ Error enviando mensaje', error?.message || error)
    res.status(500).json({ error: 'Error enviando mensaje' })
  }
})

app.listen(PORT, () => {
  console.log(`🌐 API activa en http://localhost:${PORT}`)
})