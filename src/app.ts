import { createBot, createFlow, MemoryDB, createProvider, addKeyword } from '@bot-whatsapp/bot'
import { WPPConnectProviderClass } from '@bot-whatsapp/provider-wppconnect'
import express from 'express'

const app = express()
const PORT = 3002

app.use(express.json())

// ⬇️ Mueve esta variable afuera para poder usarla luego
let providerInstance: any

app.post('/send-message', async (req, res) => {
  const { to, message } = req.body

  if (!to || !message) {
    return res.status(400).json({ error: 'Faltan campos: to y message' })
  }

  try {
    await providerInstance.sendMessage(to, message)
    console.log(`📤 Mensaje enviado a ${to}: "${message}"`)
    res.json({ success: true })
  } catch (err) {
    console.error('❌ Error enviando mensaje:', err)
    res.status(500).json({ error: 'No se pudo enviar el mensaje' })
  }
})

app.get('/', (req, res) => {
  res.send('Servidor corriendo en puerto 3002 🚀')
})

const flowWebhook = addKeyword(['.']).addAction(async (ctx, { endFlow }) => {
  const payload = {
    from: ctx.from,
    message: ctx.body,
  }

  await fetch('https://n8n.koptiva.com/webhook-test/afa604a2-e040-4176-8906-b1dc3dcbd9bf', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  return endFlow()
})

const main = async () => {
const provider = createProvider(WPPConnectProviderClass)
providerInstance = provider

  await createBot({
    flow: createFlow([flowWebhook]),
    database: new MemoryDB(),
    provider
  })


  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🟢 Servidor escuchando en http://0.0.0.0:${PORT}`)
  })
}

main()