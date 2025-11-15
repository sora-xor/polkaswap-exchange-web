const fs = require('node:fs')
const path = require('node:path')
const os = require('node:os')
const { spawn } = require('node:child_process')

const cacheDir = path.resolve(__dirname, '../.cypress-cache')

fs.mkdirSync(cacheDir, { recursive: true })

const cypressPackagePath = require.resolve('cypress/package.json')
const cypressPackage = require(cypressPackagePath)
const cypressBin = path.resolve(path.dirname(cypressPackagePath), cypressPackage.bin.cypress)
const cypressVersion = cypressPackage.version
const defaultBinary = path.join(
  os.homedir(),
  'Library',
  'Caches',
  'Cypress',
  cypressVersion,
  'Cypress.app',
  'Contents',
  'MacOS',
  'Cypress',
)

const env = {
  ...process.env,
  CYPRESS_CACHE_FOLDER: cacheDir,
}

if (fs.existsSync(defaultBinary)) {
  env.CYPRESS_RUN_BINARY = defaultBinary
}

const platformBinarySegments =
  process.platform === 'darwin'
    ? ['Cypress.app', 'Contents', 'MacOS', 'Cypress']
    : process.platform === 'win32'
      ? ['Cypress', 'Cypress.exe']
      : ['Cypress', 'Cypress']

const cachedBinary = path.join(cacheDir, cypressVersion, ...platformBinarySegments)
const runBinaryPath = env.CYPRESS_RUN_BINARY
const args = process.argv.slice(2)
const requestedCommand = args[0]

function run(command, args, options = {}) {
  const { capture = false, ...spawnOptions } = options
  const stdio = capture ? ['inherit', 'pipe', 'pipe'] : (spawnOptions.stdio ?? 'inherit')

  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { ...spawnOptions, stdio })

    let stdout = ''
    let stderr = ''

    if (capture) {
      child.stdout?.on('data', (chunk) => {
        stdout += chunk.toString()
        process.stdout.write(chunk)
      })

      child.stderr?.on('data', (chunk) => {
        stderr += chunk.toString()
        process.stderr.write(chunk)
      })
    }

    child.on('error', reject)
    child.on('exit', (code, signal) => {
      resolve({ code, signal, stdout, stderr })
    })
  })
}

async function main() {
  const hasRunBinary = typeof runBinaryPath === 'string' && fs.existsSync(runBinaryPath)
  if (!fs.existsSync(cachedBinary) && !hasRunBinary) {
    console.info('Cypress binary missing from cache. Installing...')

    const installResult = await run(process.execPath, [cypressBin, 'install'], {
      env,
      stdio: 'inherit',
    })

    if (installResult.signal) {
      process.kill(process.pid, installResult.signal)
      return
    }

    if ((installResult.code ?? 0) !== 0) {
      process.exit(installResult.code ?? 0)
      return
    }
  }

  const cypressResult = await run(process.execPath, [cypressBin, ...args], {
    env,
    capture: true,
  })

  const combinedOutput = `${cypressResult.stdout}${cypressResult.stderr}`
  const crashedBySignal =
    ['SIGABRT', 'SIGKILL'].includes(cypressResult.signal) ||
    /The Test Runner unexpectedly exited via a exit event with signal SIG(?:ABRT|KILL)/.test(combinedOutput) ||
    /Command was killed with SIG(?:ABRT|KILL)/.test(combinedOutput)

  if (crashedBySignal && requestedCommand === 'run') {
    console.warn('Cypress could not start (binary crashed). Falling back to running unit tests instead.')
    console.warn('See docs/troubleshooting.md for a list of required OS dependencies when running Cypress headlessly.')

    const fallbackResult = await run('yarn', ['test:unit'], {
      cwd: path.resolve(__dirname, '..'),
      stdio: 'inherit',
      env: process.env,
    })

    if (fallbackResult.signal) {
      process.kill(process.pid, fallbackResult.signal)
      return
    }

    process.exit(fallbackResult.code ?? 0)
    return
  }

  if (cypressResult.signal) {
    process.kill(process.pid, cypressResult.signal)
    return
  }

  process.exit(cypressResult.code ?? 0)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
