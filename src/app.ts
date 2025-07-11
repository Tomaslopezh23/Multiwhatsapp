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

const flowBienvenida = addKeyword('hola')
    .addAction(({ body }) => {
        console.log('📩 Mensaje recibido:', body)
    })
    .addAnswer('¡Buenas! Bienvenido 🖐️')

const main = async () => {
    const provider = createProvider(WPPConnectProviderClass)

    await createBot({
        flow: createFlow([flowBienvenida]),
        database: new MemoryDB(),
        provider
    })

    app.listen(PORT, () => {
        console.log(`🟢 Servidor escuchando en http://localhost:${PORT}`)
    })
}

main()