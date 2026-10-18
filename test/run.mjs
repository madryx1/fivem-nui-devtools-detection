import { spawn } from 'node:child_process'
import { createServer } from 'node:http'
import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const chrome = process.argv[2]
if (!chrome) {
    console.log('usage: node test/run.mjs <path to chrome>')
    process.exit(1)
}

const dir = new URL('./pages/', import.meta.url)
const pages = readdirSync(dir).filter(f => f.endsWith('.html')).map(f => f.slice(0, -5))
const wait = ms => new Promise(r => setTimeout(r, ms))

let hits = 0
const server = createServer((req, res) => {
    if (req.url.startsWith('/hit/')) {
        hits++
    } else if (req.url.endsWith('.html')) {
        res.setHeader('content-type', 'text/html')
        res.write(readFileSync(new URL('.' + req.url, dir)))
    }
    res.end()
}).listen(0, '127.0.0.1')
await new Promise(r => server.once('listening', r))
const port = server.address().port

async function run(page, devtools) {
    const profile = mkdtempSync(join(tmpdir(), 'devtools-test-'))
    const args = [`--user-data-dir=${profile}`, '--no-sandbox', '--no-first-run', '--no-default-browser-check', '--window-size=1280,900']
    if (devtools) args.push('--auto-open-devtools-for-tabs')
    hits = 0
    const proc = spawn(chrome, [...args, `http://127.0.0.1:${port}/${page}.html`], { stdio: 'ignore' })
    await wait(8000)
    proc.kill()
    await wait(1000)
    rmSync(profile, { recursive: true, force: true })
    return hits
}

const version = await new Promise(r => {
    const p = spawn(chrome, ['--version'])
    let out = ''
    p.stdout.on('data', d => out += d)
    p.on('close', () => r(out.trim()))
})

console.log(version)
console.log('page'.padEnd(32), 'closed'.padEnd(8), 'open')
for (const page of pages) {
    const closed = await run(page, false)
    const open = await run(page, true)
    console.log(page.padEnd(32), String(closed).padEnd(8), open)
}
server.close()
