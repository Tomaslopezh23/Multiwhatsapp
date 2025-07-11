import { createBot, createFlow, MemoryDB, createProvider, addKeyword } from '@bot-whatsapp/bot'
import { WPPConnectProviderClass } from '@bot-whatsapp/provider-wppconnect'

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
}

main()