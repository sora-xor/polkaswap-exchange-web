#!/usr/bin/env node
import { execSync } from 'node:child_process'
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { ESLint } from 'eslint'
import * as prettier from 'prettier'

const DEFAULT_EXT_PATTERN = /\.(cjs|mjs|js|jsx|ts|tsx|vue|md|css|scss|sass)$/i
const DEFAULT_GLOB = '**/*.{ts,js,vue,md,css,scss,sass}'

const args = process.argv.slice(2)
const mode = args.includes('--write') ? 'write' : 'check'
const useAll = args.includes('--all')
const explicitTargets = args.filter((arg) => !arg.startsWith('--') && !arg.startsWith('-'))

const resolveChangedFiles = () => {
  try {
    const stdout = execSync('git diff --name-only --diff-filter=ACMRTUXB HEAD', { encoding: 'utf8' })
    return stdout
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line && DEFAULT_EXT_PATTERN.test(line) && !line.startsWith('node_modules/'))
  } catch {
    return []
  }
}

const targets = explicitTargets.length > 0 ? explicitTargets : useAll ? [DEFAULT_GLOB] : resolveChangedFiles()

const eslint = new ESLint({
  fix: true,
  errorOnUnmatchedPattern: false,
})

const formatFile = async (filePath, write) => {
  const absolutePath = path.resolve(filePath)
  const fileInfo = await prettier.getFileInfo(absolutePath, { ignorePath: '.prettierignore' })

  if (fileInfo.ignored || fileInfo.inferredParser === null) {
    return { formatted: false, errors: 0 }
  }

  const original = await readFile(absolutePath, 'utf8')
  const prettierConfig = await prettier.resolveConfig(absolutePath, { editorconfig: true })
  const prettierFormatted = await prettier.format(original, {
    ...(prettierConfig ?? {}),
    filepath: absolutePath,
  })

  const [lintResult] = await eslint.lintText(prettierFormatted, {
    filePath: absolutePath,
    warnIgnored: false,
  })

  const finalText = lintResult?.output ?? prettierFormatted
  const hasChanges = finalText !== original

  if (write && hasChanges) {
    await writeFile(absolutePath, finalText, 'utf8')
  }

  return {
    formatted: hasChanges,
    errors: lintResult?.errorCount ?? 0,
  }
}

const main = async () => {
  const write = mode === 'write'

  if (targets.length === 0) {
    console.log('No files matched for formatting.')
    return
  }

  const filesNeedingFormat = []
  let errorCount = 0

  for (const target of targets) {
    if (target.includes('*')) {
      const results = await eslint.lintFiles([target])
      const filePaths = results.map((result) => path.relative(process.cwd(), result.filePath))
      // Recurse on concrete files resolved by ESLint globbing.
      for (const filePath of filePaths) {
        const outcome = await formatFile(filePath, write)
        if (outcome.formatted && !write) filesNeedingFormat.push(filePath)
        errorCount += outcome.errors
      }
    } else {
      const outcome = await formatFile(target, write)
      if (outcome.formatted && !write) filesNeedingFormat.push(target)
      errorCount += outcome.errors
    }
  }

  if (filesNeedingFormat.length > 0) {
    console.error('Files require formatting:')
    filesNeedingFormat.forEach((file) => console.error(`  ${file}`))
    process.exit(1)
  }

  if (errorCount > 0) {
    console.error('ESLint reported errors during formatting.')
    process.exit(1)
  }

  if (!write) {
    console.log('Format check passed.')
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
