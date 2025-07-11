import express from 'express'
import { createBot, createFlow, MemoryDB, createProvider, addKeyword } from '@bot-whatsapp/bot'
import { WPPConnectProviderClass } from '@bot-whatsapp/provider-wppconnect'

const app = express()
const PORT = 3002

// 🧠 Necesario para leer JSON en peticiones POST
app.use(express.json())

// 🌐 Endpoint para recibir webhooks desde n8n o cualquier servicio
app.post('/webhook', (req, res) => {
    console.log('🪝 Webhook recibido:', req.body)

    // Aquí puedes hacer lo que quieras con los datos
    // incluso enviarlos a WhatsApp o guardarlos

    res.sendStatus(200)
})

// 🔄 Endpoint base para test
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