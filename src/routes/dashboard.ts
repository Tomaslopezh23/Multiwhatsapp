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
          background-color: white;
          padding: 40px 30px;
          border-radius: 12px;
          box-shadow: 0 0 15px rgba(0, 0, 0, 0.1);
          text-align: center;
          width: 100%;
          max-width: 400px;
        }

        .logo {
          font-family: 'KoptivaFont', sans-serif;
          font-size: 36px;
          font-weight: bold;
          color: #231f20;
          margin-bottom: 20px;
        }

        h1 {
          font-size: 24px;
          color: #c0392b;
          margin-bottom: 20px;
        }

        label {
          display: block;
          text-align: left;
          font-weight: bold;
          margin-bottom: 8px;
        }

        input[type="password"] {
          width: 100%;
          padding: 10px;
          border: 1px solid #ccc;
          border-radius: 6px;
          box-sizing: border-box;
          margin-bottom: 20px;
        }

        button {
          width: 100%;
          padding: 12px;
          background-color: #231f20;
          color: white;
          border: none;
          border-radius: 6px;
          font-size: 16px;
          cursor: pointer;
        }

        button:hover {
          background-color: #000;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="logo">Koptiva</div>
        <h1>🔒 Acceso restringido</h1>
        <form method="GET" action="/dashboard">
          <label>Contraseña:</label>
          <input type="password" name="clave" required />
          <button type="submit">Entrar</button>
        </form>
      </div>
    </body>
  </html>
`)
      }

    let html = `
      <html>
      <head>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');

  body {
    font-family: 'Inter', Arial, sans-serif;
    background-color: #f4f6f8;
    margin: 0;
    padding: 30px;
  }

  h1 {
    font-size: 32px;
    font-weight: 700;
    color: #231f20;
    margin-bottom: 30px;
  }

  .empresa-card {
    background: white;
    padding: 24px 28px;
    margin-bottom: 32px;
    border-radius: 12px;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.05);
    transition: transform 0.2s ease;
  }

  .empresa-card:hover {
    transform: scale(1.01);
  }

  .empresa-card h2 {
    font-size: 20px;
    font-weight: 600;
    margin-bottom: 12px;
  }

  .endpoint label {
    font-weight: 600;
    display: block;
    margin-top: 10px;
  }

  .endpoint-box {
    background-color: #f0f0f0;
    padding: 10px 12px;
    border-radius: 6px;
    font-family: monospace;
    font-size: 14px;
    word-break: break-word;
  }

  .info {
    margin: 18px 0;
    font-size: 15px;
    color: #444;
    line-height: 1.6;
  }

  .webhook-input {
    width: 100%;
    padding: 12px;
    font-size: 15px;
    border-radius: 6px;
    border: 1px solid #ccc;
    background: #fdfdfd;
    box-sizing: border-box;
    transition: border-color 0.2s;
  }

  .webhook-input:focus {
    border-color: #231f20;
    outline: none;
  }

  .btn {
    padding: 10px 18px;
    font-size: 14px;
    font-weight: 500;
    border-radius: 6px;
    border: none;
    cursor: pointer;
    transition: background-color 0.2s ease;
  }

  .btn.guardar {
    background-color: #231f20;
    color: white;
    margin-right: 10px;
  }

  .btn.guardar:hover {
    background-color: #000;
  }

  .btn.eliminar {
    background-color: #e74c3c;
    color: white;
  }

  .btn.eliminar:hover {
    background-color: #c0392b;
  }

  hr {
    border: none;
    border-top: 1px solid #ddd;
    margin: 40px 0;
  }
</style>
</head>
        <body>
          <h1>Dashboard de empresas</h1>
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
          <h3><code>http://200.58.107.121:3002/send-message/${empresa}</code></h3>
        </p>
        <p>Correo: <strong>${correo}</strong><br>
           Teléfono: <strong>${telefono}</strong></p>
        <form method="POST" action="/dashboard/guardar/${empresa}">
        <input type="hidden" name="clave" value="${clave}" />
          <label><strong>WEBHOOK_URL=</strong>
            <input type="text" name="webhook" value="${valorWebhook}" size="80"/>
          </label><br><br>
          <button type="submit">💾 Guardar cambios</button>
        </form>

          <button onclick="eliminarEmpresa('${empresa}')">Eliminar</button>
          <br><br>
        
      `
    })

    html += `
    <script>
      function eliminarEmpresa(empresa) {
        const pass = prompt('🔐 Ingresa la contraseña para eliminar "' + empresa + '"')
        if (pass !== '123') {
          alert('❌ Contraseña incorrecta')
          return
        }

        if (!confirm('¿Estás seguro de que deseas eliminar "' + empresa + '"? Esta acción no se puede deshacer.')) {
          return
        }

        fetch('/dashboard/eliminar/' + empresa, {
          method: 'POST'
        }).then(() => {
          alert('✅ Empresa "' + empresa + '" eliminada')
          window.location.reload()
        }).catch(() => {
          alert('❌ Error al eliminar empresa')
        })
      }
    </script>
    </body>
    </html>
    `

    res.send(html)
  })

  app.post('/dashboard/eliminar/:empresa', (req, res) => {
  const empresa = req.params.empresa
  const ruta = path.join(USUARIOS_PATH, empresa)

  try {
    fs.rmSync(ruta, { recursive: true, force: true })
    console.log(`🗑️ Carpeta eliminada: ${empresa}`)
    res.status(200).send('ok')
  } catch (err) {
    console.error(`❌ Error eliminando empresa ${empresa}:`, err)
    res.status(500).send('error')
  }
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

const clave = Array.isArray(req.body.clave) ? req.body.clave[0] : (req.body.clave || 'hola123') as string;
res.redirect('/dashboard?clave=' + encodeURIComponent(clave))
  })
}
