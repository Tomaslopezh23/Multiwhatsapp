import fs from 'fs'
import path from 'path'
import whatsapp from 'whatsapp-web.js'
const { Client, LocalAuth } = whatsapp
import qrcode from 'qrcode' // 👈 usa 'qrcode', no 'qrcode-terminal'
import dotenv from 'dotenv'
import axios from 'axios'
import express from 'express'
import { rm } from 'fs/promises'
import { config } from 'dotenv'
import { registerDashboard } from './routes/dashboard'
import qs from 'qs'
import type { Message } from 'whatsapp-web.js'
import type { Client as WhatsAppClient } from 'whatsapp-web.js'

const conexiones: Record<string, boolean> = {}


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

const app = express()
const PORT = 3002

app.use(express.json())

registerDashboard(app)


app.use(express.urlencoded({ extended: true })) // Para manejar formularios


app.post('/qrscan', async (req, res) => {
  const { empresa, correo, telefono, password } = req.body
  const nombre = empresa.trim().replace(/\s+/g, '-').toLowerCase()
  const regex = /^[a-zA-Z0-9\-]+$/

  if (!regex.test(nombre)) {
    return res.send(`
      <html>
        <body>
          <h1>❌ Nombre inválido</h1>
          <p>Solo se permiten letras, números y guiones (sin espacios).</p>
          <a href="/qrscan">Volver</a>
        </body>
      </html>
    `)
  }

  if (password !== 'aaa') {
    return res.send(`
      <html>
        <body>
          <h1>Contraseña incorrecta</h1>
          <a href="/qrscan">Volver</a>
        </body>
      </html>
    `)
  }

  const rutaUsuario = path.join('Usuarios', nombre)

  // Crear carpeta si no existe
  if (!fs.existsSync(rutaUsuario)) {
    fs.mkdirSync(rutaUsuario, { recursive: true })
    console.log(`📁 Carpeta creada: ${rutaUsuario}`)
  }

  const rutaInfo = path.join(rutaUsuario, 'info.json')
const data = { correo, telefono }
fs.writeFileSync(rutaInfo, JSON.stringify(data, null, 2))

  const rutaEnv = path.join(rutaUsuario, '.env')

  if (!fs.existsSync(rutaEnv)) {
    const contenidoEnv = `WEBHOOK_URL=https://ejemplo.com/webhook/${nombre}`
    fs.writeFileSync(rutaEnv, contenidoEnv)
    console.log(`📝 .env creado para ${nombre}`)
  }

  // Redirigir al QR personalizado
  res.send(`
    <html>
      <head>
        <meta http-equiv="refresh" content="1;url=/qrscan/usuarios/${nombre}" />
      </head>
      <body>
        <h1>⏳ Cargando...</h1>
        <p>En breves segundos saldrá el QR para <strong>${nombre}</strong>.</p>
      </body>
    </html>
  `)
})



app.get('/qrscan/usuarios/:empresa', async (req, res) => {
  const nombre = req.params.empresa
  const rutaUsuario = path.join('Usuarios', nombre)

  // ✅ Si ya está conectado, redirige inmediatamente
if (conexiones[nombre]) {
  return res.send(`
    <html>
      <body>
        <h1>✅ El QR ya fue escaneado</h1>
        <p>Este número de WhatsApp ya está conectado correctamente.</p>
      </body>
    </html>
  `)
}

  // ⚠️ Ya no bloqueamos si la carpeta no existe
  if (!fs.existsSync(rutaUsuario)) {
    console.log(`⚠️ Carpeta de ${nombre} no existe, pero continuaremos con la carga.`)
  }

  conexiones[nombre] = false // default: no conectado

  const client = new Client({
    authStrategy: new LocalAuth({ dataPath: rutaUsuario }),
    puppeteer: { headless: true, args: ['--no-sandbox'] },
  })

  let qrEnBase64 = ''
  let qrTimeout: NodeJS.Timeout

  client.on('qr', async (qr) => {
    qrEnBase64 = await qrcode.toDataURL(qr)

    res.send(`
      <html>
        <head>
          <script>
            let tiempo = 0
            const checkEstado = async () => {
              const res = await fetch('/estado/${nombre}')
              const data = await res.json()
              if (data.conectado) {
                window.location.href = '/conectado'
              } else if (tiempo >= 30) {
                window.location.href = '/fallado'
              } else {
                tiempo += 3
                setTimeout(checkEstado, 3000)
              }
            }
            window.onload = checkEstado
          </script>
        </head>
        <body>
          <h1>Escanea este QR para conectar WhatsApp de ${nombre}</h1>
          <img src="${qrEnBase64}" />
          <p><strong>Este QR solo estará disponible durante 30 segundos.</strong></p>
        </body>
      </html>
    `)

    // Eliminación de carpeta en 30s si no se conecta
    qrTimeout = setTimeout(async () => {
      if (!conexiones[nombre]) {
        try {
          await client.destroy()
          await rm(rutaUsuario, { recursive: true, force: true })
          console.log(`🗑️ Carpeta eliminada por inactividad: ${rutaUsuario}`)
        } catch (e: any) {
          console.error(`❌ Error eliminando carpeta de ${nombre}:`, e.message)
        }
      }
    }, 30_000)
  })

  client.on('ready', () => {
    console.log(`✅ WhatsApp listo para ${nombre}`)
    conexiones[nombre] = true
    clearTimeout(qrTimeout)
  })

client.on('message', async (msg) => {
  const rutaEnv = path.join(rutaUsuario, '.env')
  const envRaw = fs.readFileSync(rutaEnv)
  const parsed = dotenv.parse(envRaw)
  const webhook = parsed.WEBHOOK_URL

  if (!webhook || !webhook.startsWith('http')) {
    console.error(`❌ WEBHOOK_URL inválido o no definido para ${nombre}:`, webhook)
    return
  }

  const payload = {
    from: msg.from,
    body: msg.body,
  }

  const chat = await msg.getChat()
  let continuarTyping = true
  let typingInterval: NodeJS.Timeout | undefined

  setTimeout(() => {
    if (!continuarTyping) return
    chat.sendStateTyping().catch(() => {}) // primer intento
    typingInterval = setInterval(() => {
      if (continuarTyping) {
        chat.sendStateTyping().catch(() => {})
      }
    }, 5000) // renovarlo cada 5s
  }, 1500)

  try {
    const response = await axios.post(webhook, payload, {
      timeout: 8000,
      headers: { 'Content-Type': 'application/json' },
      validateStatus: (status) => status >= 200 && status < 300
    })

    console.log(`📤 Webhook enviado para ${nombre} → Código: ${response.status}`)
  } catch (err: any) {
    console.error(`❌ Error enviando webhook para ${nombre}`)
    console.error(err.message)
    console.error(err.toJSON?.() || err)
  } finally {
  continuarTyping = false
  if (typingInterval) clearInterval(typingInterval)
  await chat.clearState()
}
})

  client.initialize()
})


app.get('/qrscan', (req, res) => {
  res.send(`
    <html>
      <body>
        <h1>Acceso a escáner de QR</h1>
        <form method="POST" action="/qrscan">
          <label>Nombre de la empresa:</label><br>
          <input type="text" name="empresa" required /><br><br>

          <label>Correo electrónico:</label><br>
          <input type="email" name="correo" required /><br><br>

          <label>Número de teléfono:</label><br>
          <input type="tel" name="telefono" required /><br><br>

          <label>Contraseña:</label><br>
          <input type="password" name="password" required /><br><br>

          <button type="submit">Entrar</button>
        </form>
      </body>
    </html>
  `)
})

app.get('/fallado', (req, res) => {
  res.send(`
    <html>
      <body>
        <h1>😓 No se pudo escanear el QR a tiempo</h1>
        <p>Este intento ha fallado porque no se escaneó el código en los 30 segundos disponibles.</p>
        <a href="/qrscan">
          <button>🔁 Volver al inicio</button>
        </a>
      </body>
    </html>
  `)
})

app.get('/conectado', (req, res) => {
  res.send(`
    <html>
      <body>
        <h1>✅ WhatsApp conectado correctamente</h1>
        <p>Este número ya está conectado y listo para usarse.</p>
      </body>
    </html>
  `)
})

app.get('/estado/:empresa', (req, res) => {
  const nombre = req.params.empresa
  const conectado = conexiones[nombre] === true
  res.json({ conectado })
})

const clientesActivos: Record<string, WhatsAppClient> = {}

app.post('/send-message/:empresa', express.json(), async (req, res) => {
  const nombre = req.params.empresa
  const rutaUsuario = path.join('Usuarios', nombre)

  if (!fs.existsSync(rutaUsuario)) {
    return res.status(404).json({ error: `Empresa "${nombre}" no encontrada` })
  }

  const { to, message } = req.body
  if (!to || !message) {
    return res.status(400).json({ error: 'Faltan campos "to" o "message" en el body' })
  }

  try {
    // Si ya existe un cliente activo, lo reutilizamos
    let client = clientesActivos[nombre]

    if (!client) {
      client = new Client({
        authStrategy: new LocalAuth({ dataPath: rutaUsuario }),
        puppeteer: { headless: true, args: ['--no-sandbox'] },
      })

      client.initialize()

      client.on('ready', () => {
        console.log(`📲 Cliente listo para ${nombre}`)
      })

      client.on('message', (msg: Message) => {
        console.log(`📥 Mensaje recibido en ${nombre}: ${msg.body}`)
      })

      clientesActivos[nombre] = client
    }

    await client.sendMessage(to, message)
    console.log(`✅ Mensaje enviado a ${to} desde ${nombre}`)
    return res.json({ status: 'ok', empresa: nombre })
  } catch (err: any) {
    console.error(`❌ Error enviando mensaje desde ${nombre}:`, err.message)
    return res.status(500).json({ error: 'Error enviando mensaje' })
  }
})


app.listen(PORT, '0.0.0.0', () => {
  console.log(`🌐 API activa en http://localhost:${PORT}`)
  console.log(`🔍 Escanea el QR en: http://localhost:${PORT}/qrscan`)
})