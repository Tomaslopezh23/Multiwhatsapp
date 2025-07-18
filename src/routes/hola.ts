import { Express } from 'express'

export function registerHola(app: Express) {
  app.get('/hola', (req, res) => {
    res.send('Hola mundo')
  })
}