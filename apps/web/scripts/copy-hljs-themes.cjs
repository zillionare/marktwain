#!/usr/bin/env node
/* eslint-disable node/prefer-global/process */
const fs = require(`node:fs`)
const path = require(`node:path`)

const destDir = path.resolve(__dirname, `../public/assets/hljs-themes`)

// Strict behavior: only look for highlight.js in this package's node_modules
const srcDir = path.resolve(__dirname, `../node_modules/highlight.js/styles`)
console.log(`Copying highlight.js themes from ${srcDir} to ${destDir}...`)
if (!fs.existsSync(srcDir)) {
  console.error(`highlight.js styles not found in apps/web/node_modules. Please install highlight.js in apps/web before running this script.`)
  process.exit(1)
}

fs.mkdirSync(destDir, { recursive: true })

const files = fs.readdirSync(srcDir).filter(f => f.endsWith(`.css`))
files.forEach((file) => {
  const src = path.join(srcDir, file)
  const dest = path.join(destDir, file)
  fs.copyFileSync(src, dest)
  console.log(`copied ${file}`)
})

// write a themes.json manifest so the client can discover available themes
const manifest = files.map(f => ({ name: f.replace(/\.css$/, ``), file: f, url: `/assets/hljs-themes/${f}` }))
fs.writeFileSync(path.join(destDir, `themes.json`), JSON.stringify(manifest, null, 2), `utf8`)

console.log(`Copied ${files.length} highlight.js theme files to ${destDir}`)
console.log(`Wrote themes.json with ${manifest.length} entries`)
