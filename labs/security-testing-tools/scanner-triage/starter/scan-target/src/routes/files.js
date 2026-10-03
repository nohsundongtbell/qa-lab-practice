// 첨부 파일·이미지 변환 라우트 (분석용 샘플 — 실행하지 않음)
import fs from 'node:fs/promises'
import path from 'node:path'
import { exec, execFile } from 'node:child_process'

const UPLOAD_DIR = '/srv/uploads'
const SAFE_NAME = /^[a-z0-9_-]{1,40}\.(png|jpg)$/

export function registerFileRoutes(app) {
  app.get('/files', async (req, res) => {
    const data = await fs.readFile(path.join(UPLOAD_DIR, req.query.name))
    res.send(data)
  })

  app.get('/files/safe', async (req, res) => {
    const safe = path.basename(req.query.name)
    const data = await fs.readFile(path.join(UPLOAD_DIR, safe))
    res.send(data)
  })

  app.post('/images/convert', async (req, res) => {
    exec('convert ' + req.query.file + ' /tmp/out.png', () => res.send('ok'))
  })

  app.post('/images/convert-safe', async (req, res) => {
    if (!SAFE_NAME.test(req.query.file)) return res.status(400).send('bad name')
    execFile('convert', [path.join(UPLOAD_DIR, req.query.file), '/tmp/out.png'], () => res.send('ok'))
  })
}
