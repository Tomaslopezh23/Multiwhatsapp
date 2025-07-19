import fs from 'fs'
import path from 'path'
import whatsapp from 'whatsapp-web.js'
const { Client, LocalAuth } = whatsapp
import qrcode from 'qrcode'
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

const clientesActivos: Record<string, WhatsAppClient> = {}

const app = express()
const __dirname = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]):/, '$1:'))
app.use(express.static(path.join(__dirname, 'public')))

dotenv.config()

const WEBHOOK_URL = process.env.WEBHOOK_URL!


const fireWebhook = async (payload: unknown) => {
  
  try {
    await axios.post(WEBHOOK_URL, payload, { timeout: 8000 })
  } catch (err) {
    console.error('❌ Error enviando webhook', err)
  }
}

const PORT = 3002

app.use(express.json())

registerDashboard(app)


app.use(express.urlencoded({ extended: true })) // Para manejar formularios

app.get('/qrscan', (req, res) => {
res.send(`
  <html>
    <head>
      <style>
        @font-face {
          font-family: 'KoptivaFont';
          src: url('/fonts/HelveticaNeueLTStd63.otf') format('opentype');
          font-weight: normal;
          font-style: normal;
        }

        body {
          background-color: #f4f6f8;
          font-family: Arial, sans-serif;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          height: 100vh;
          margin: 0;
        }

        .logo {
          font-family: 'KoptivaFont', sans-serif;
          font-size: 42px;
          color: #231f20;
          margin-bottom: 20px;
          font-weight: bold;
        }

        .form-container {
          background-color: white;
          padding: 30px 40px;
          border-radius: 12px;
          box-shadow: 0 0 15px rgba(0,0,0,0.1);
          width: 100%;
          max-width: 400px;
          text-align: center;
        }

        h1 {
          font-size: 20px;
          margin-bottom: 25px;
        }

        label {
          display: block;
          margin-top: 15px;
          margin-bottom: 5px;
          font-weight: bold;
          text-align: left;
        }

        input {
          width: 100%;
          padding: 10px;
          border: 1px solid #ccc;
          border-radius: 6px;
          box-sizing: border-box;
        }

        button {
          margin-top: 20px;
          width: 100%;
          padding: 12px;
          background-color: #231f20;
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 16px;
        }

        button:hover {
          background-color: #000;
        }
      </style>
    </head>
    <body>
      <div class="logo">Koptiva</div> <!-- ✅ Ahora está afuera del form-container -->
      <div class="form-container">
        <h1>Acceso a escáner de QR</h1>
        <form method="POST" action="/qrscan">
          <label>Nombre de la empresa:</label>
          <input type="text" name="empresa" required />

          <label>Correo electrónico:</label>
          <input type="email" name="correo" required />

          <label>Número de teléfono:</label>
          <input type="tel" name="telefono" required />

          <label>Contraseña:</label>
          <input type="password" name="password" required />

          <button type="submit">Entrar</button>
        </form>
      </div>
    </body>
  </html>
`)
})


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
  }

  const rutaInfo = path.join(rutaUsuario, 'info.json')
const data = { correo, telefono }
fs.writeFileSync(rutaInfo, JSON.stringify(data, null, 2))

  const rutaEnv = path.join(rutaUsuario, '.env')

  if (!fs.existsSync(rutaEnv)) {
    const contenidoEnv = `WEBHOOK_URL=https://ejemplo.com/webhook/${nombre}`
    fs.writeFileSync(rutaEnv, contenidoEnv)
  }

  // Redirigir al QR personalizado
res.send(`
  <html>
    <head>
    <meta http-equiv="refresh" content="1;url=/qrscan/usuarios/${nombre}" />
      <style>
        @font-face {
          font-family: 'KoptivaFont';
          src: url('/fonts/HelveticaNeueLTStd63.otf') format('opentype');
          font-weight: normal;
        }

        body {
          background-color: #f4f6f8;
          font-family: Arial, sans-serif;
          margin: 0;
          height: 100vh;
          display: flex;
          justify-content: center;
          align-items: center;
        }

        .container {
          text-align: center;
          background: white;
          padding: 40px 60px;
          border-radius: 12px;
          box-shadow: 0 0 20px rgba(0,0,0,0.1);
        }

        .logo {
          font-family: 'KoptivaFont', sans-serif;
          font-size: 36px;
          font-weight: bold;
          color: #231f20;
          margin-bottom: 10px;
        }

        .spinner {
          margin: 30px auto;
          width: 50px;
          height: 50px;
          border: 6px solid #ddd;
          border-top-color: #231f20;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .text {
          font-size: 18px;
          color: #333;
        }

        .empresa {
          font-weight: bold;
          color: #231f20;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="logo">Koptiva</div>
        <div class="spinner"></div>
        <div class="text">En breves segundos saldrá el QR para <span class="empresa">${nombre}</span>.</div>
        <div class="text">Este listo para escanearlo en su WhatsApp</span>.</div>
      </div>
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
      <style>
        @font-face {
          font-family: 'KoptivaFont';
          src: url('/fonts/HelveticaNeueLTStd63.otf') format('opentype');
          font-weight: normal;
        }

        body {
          background-color: #f4f6f8;
          font-family: Arial, sans-serif;
          margin: 0;
          height: 100vh;
          display: flex;
          justify-content: center;
          align-items: center;
        }

        .container {
          background: white;
          padding: 40px;
          border-radius: 12px;
          box-shadow: 0 0 20px rgba(0,0,0,0.1);
          text-align: center;
        }

        .logo {
          font-family: 'KoptivaFont', sans-serif;
          font-size: 36px;
          font-weight: bold;
          color: #231f20;
          margin-bottom: 20px;
        }

        .qr {
          margin: 20px 0;
        }

        .mensaje {
          color: #555;
          font-size: 16px;
          margin-top: 10px;
        }
      </style>
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
      <div class="container">
        <div class="logo">Koptiva</div>
        <h2>Escanea este QR para conectar WhatsApp de <span style="color:#231f20">${nombre}</span></h2>
        <div class="qr">
          <img src="${qrEnBase64}" alt="Código QR" />
        </div>
        <p class="mensaje">Este QR solo estará disponible durante 60 segundos.</p>
      </div>
    </body>
  </html>
`)

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
    }, 60_000)
  })

client.on('ready', () => {
  console.log(`✅ WhatsApp listo para ${nombre}`)
  conexiones[nombre] = true
  clientesActivos[nombre] = client // 🔥 ESTA LÍNEA ES LA CLAVE
  clearTimeout(qrTimeout)
})

client.on('message', async (msg) => {
  const rutaEnv = path.join(rutaUsuario, '.env')
  const envRaw = fs.readFileSync(rutaEnv)
  const parsed = dotenv.parse(envRaw)
  const webhook = parsed.WEBHOOK_URL

  if (!webhook || !webhook.startsWith('http')) {
    return
  }

  const payload = {
    from: msg.from,
    body: msg.body,
  }

  const chat = await msg.getChat()
  setTimeout(() => {
    chat.sendStateTyping().catch(() => {})
  }, 1500)

  try {
    const response = await axios.post(webhook, payload, {
      timeout: 8000,
      headers: { 'Content-Type': 'application/json' },
      validateStatus: (status) => status >= 200 && status < 300
    })

  } catch (err: any) {
  } finally {
  await chat.clearState()
}
})

  client.initialize()
})

app.get('/fallado', (req, res) => {
res.send(`
  <html>
    <head>
      <style>
        @font-face {
          font-family: 'KoptivaFont';
          src: url('/fonts/HelveticaNeueLTStd63.otf') format('opentype');
          font-weight: normal;
        }

        body {
          background-color: #f4f6f8;
          font-family: Arial, sans-serif;
          margin: 0;
          height: 100vh;
          display: flex;
          justify-content: center;
          align-items: center;
        }

        .container {
          background: white;
          padding: 40px;
          border-radius: 12px;
          box-shadow: 0 0 20px rgba(0,0,0,0.1);
          text-align: center;
          max-width: 500px;
        }

        .logo {
          font-family: 'KoptivaFont', sans-serif;
          font-size: 36px;
          font-weight: bold;
          color: #231f20;
          margin-bottom: 20px;
        }

        .emoji {
          font-size: 48px;
          margin-bottom: 10px;
        }

        .title {
          font-size: 22px;
          font-weight: bold;
          color: #c0392b;
          margin-bottom: 10px;
        }

        .message {
          font-size: 16px;
          color: #444;
          margin-bottom: 20px;
        }

        .btn {
          background-color: #231f20;
          color: white;
          padding: 12px 20px;
          border: none;
          border-radius: 6px;
          font-size: 16px;
          cursor: pointer;
          text-decoration: none;
        }

        .btn:hover {
          background-color: #000;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="logo">Koptiva</div>
        <div class="emoji">😓</div>
        <div class="title">No se pudo escanear el QR a tiempo</div>
        <div class="message">Este intento ha fallado porque no se escaneó el código en los 30 segundos disponibles.</div>
        <a href="/qrscan" class="btn">🔁 Volver al inicio</a>
      </div>
    </body>
  </html>
`)
})

app.get('/conectado', (req, res) => {
res.send(`
  <html>
    <head>
      <style>
        @font-face {
          font-family: 'KoptivaFont';
          src: url('/fonts/HelveticaNeueLTStd63.otf') format('opentype');
          font-weight: normal;
        }

        body {
          background-color: #f4f6f8;
          font-family: Arial, sans-serif;
          margin: 0;
          height: 100vh;
          display: flex;
          justify-content: center;
          align-items: center;
        }

        .container {
          background: white;
          padding: 40px;
          border-radius: 12px;
          box-shadow: 0 0 20px rgba(0,0,0,0.1);
          text-align: center;
          max-width: 500px;
        }

        .logo {
          font-family: 'KoptivaFont', sans-serif;
          font-size: 36px;
          font-weight: bold;
          color: #231f20;
          margin-bottom: 20px;
        }

        .checkmark {
          font-size: 60px;
          color: #28a745;
          margin-bottom: 20px;
        }

        .title {
          font-size: 24px;
          font-weight: bold;
          margin-bottom: 10px;
          color: #231f20;
        }

        .message {
          font-size: 16px;
          color: #444;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="logo">Koptiva</div>
        <div class="checkmark">✅</div>
        <div class="title">WhatsApp conectado correctamente</div>
        <div class="message">Este número ya está conectado y listo para usarse.</div>
      </div>
    </body>
  </html>
`)
})

app.get('/estado/:empresa', (req, res) => {
  const nombre = req.params.empresa
  const conectado = conexiones[nombre] === true
  res.json({ conectado })
})


const rutaBase = path.join(__dirname, 'Usuarios')
if (fs.existsSync(rutaBase)) {
  const empresas = fs.readdirSync(rutaBase, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)

  for (const nombre of empresas) {
    const rutaUsuario = path.join(rutaBase, nombre)
    const client = new Client({
      authStrategy: new LocalAuth({ dataPath: rutaUsuario }),
      puppeteer: { headless: true, args: ['--no-sandbox'] },
    })

    client.on('ready', () => {
      console.log(`✅ Cliente restaurado para ${nombre}`)
      conexiones[nombre] = true
      clientesActivos[nombre] = client
    })

    client.on('auth_failure', (msg) => {
      console.error(`❌ Fallo de autenticación para ${nombre}:`, msg)
    })

    client.initialize()
  }
}

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
    let client = clientesActivos[nombre]

      if (!client) {
        client = new Client({
          authStrategy: new LocalAuth({ dataPath: rutaUsuario }),
          puppeteer: { headless: true, args: ['--no-sandbox'] },
        })

        clientesActivos[nombre] = client

        const clienteListo = new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error(`⏰ Timeout: el cliente de ${nombre} no respondió a tiempo`))
          }, 15000)

          client.on('ready', () => {
            clearTimeout(timeout)
            resolve()
          })

          client.on('auth_failure', (msg) => {
            clearTimeout(timeout)
            reject(new Error(`❌ Fallo de autenticación para ${nombre}: ${msg}`))
          })
        })

        client.initialize()
        await clienteListo
      }


    const chat = await client.getChatById(to)
    await client.sendMessage(to, message)
    await chat.clearState()

    return res.json({ status: 'ok', empresa: nombre })
  } catch (err: any) {
    console.error(`❌ Error enviando mensaje desde ${nombre}:`, err.message)
    return res.status(500).json({ error: 'Error enviando mensaje' })
  }
})


app.listen(PORT, '0.0.0.0', () => {
  console.log(`El proyecto se inicio correctamente`)
})