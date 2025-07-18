import fs from 'fs'
import path from 'path'
import express, { Express } from 'express'

const USUARIOS_PATH = path.join(process.cwd(), 'Usuarios')

export function registerDashboard(app: Express) {
  app.get('/dashboard', (req, res) => {
    const empresas = fs.readdirSync(USUARIOS_PATH).filter((nombre) => {
      const ruta = path.join(USUARIOS_PATH, nombre)
      return fs.statSync(ruta).isDirectory()
    })

    const clave = req.query.clave as string

      if (clave !== 'hola123') {
        return res.send(`
          <html>
            <body>
              <h1>🔒 Acceso restringido</h1>
              <form method="GET" action="/dashboard">
                <label>Contraseña:</label>
                <input type="password" name="clave" required />
                <button type="submit">Entrar</button>
              </form>
            </body>
          </html>
        `)
      }

    let html = `
      <html>
        <body>
          <h1>📋 Dashboard de empresas</h1>
    `

    empresas.forEach((empresa) => {
      const rutaEnv = path.join(USUARIOS_PATH, empresa, '.env')
      let valorWebhook = ''

      try {
        const raw = fs.readFileSync(rutaEnv, 'utf-8')
        const match = raw.match(/^WEBHOOK_URL=(.*)$/m)
        valorWebhook = match ? match[1] : ''
      } catch {
        valorWebhook = ''
      }

      // ✅ Agregamos carga de info.json
      const rutaInfo = path.join(USUARIOS_PATH, empresa, 'info.json')
      let correo = 'N/A'
      let telefono = 'N/A'

      try {
        const info = JSON.parse(fs.readFileSync(rutaInfo, 'utf-8'))
        correo = info.correo || 'N/A'
        telefono = info.telefono || 'N/A'
      } catch {}

      html += `
        <hr>
        <h2>📁 ${empresa}</h2>
        <p>📬 Endpoint para enviar mensajes:<br>
          <code>http://200.58.107.121:3002/send-message/${empresa}</code>
        </p>
        <p>📧 Correo: <strong>${correo}</strong><br>
           📱 Teléfono: <strong>${telefono}</strong></p>
        <form method="POST" action="/dashboard/guardar/${empresa}">
          <label><strong>WEBHOOK_URL=</strong>
            <input type="text" name="webhook" value="${valorWebhook}" size="80"/>
          </label><br><br>
          <button type="submit">💾 Guardar cambios</button>
        </form>
      `
    })

    html += `
        </body>
      </html>
    `

    res.send(html)
  })

  app.post('/dashboard/guardar/:empresa', express.urlencoded({ extended: true }), (req, res) => {
    const empresa = req.params.empresa
    const nuevaUrl = req.body.webhook
    const ruta = path.join(USUARIOS_PATH, empresa, '.env')

    // Validar que la URL tenga formato correcto
    if (!nuevaUrl || !nuevaUrl.startsWith('http')) {
      console.error(`❌ URL inválida para ${empresa}: ${nuevaUrl}`)
      return res.status(400).send(`<p>❌ URL inválida. Debe comenzar con "http".</p><a href="/dashboard">Volver</a>`)
    }

    try {
      fs.writeFileSync(ruta, `WEBHOOK_URL=${nuevaUrl}`)
      console.log(`✅ .env actualizado para ${empresa}`)
    } catch (error) {
      console.error(`❌ Error actualizando .env para ${empresa}:`, error)
    }

    res.redirect('/dashboard')
  })
}
