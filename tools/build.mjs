/**
 * Builds index.html from the platform's own dashboard markup.
 *
 * The input is `vendor/dashboard.html`, rendered by the platform repository
 * rather than written here — see the README for the one command that produces
 * it. Copying markup by hand would mean this page slowly stops resembling the
 * thing it claims to demonstrate, with nothing to notice the drift.
 *
 * Two edits are made and no others:
 *
 *   1. `mock.js` is inserted before the dashboard's own inline script, because
 *      it replaces `fetch` and must be in place before anything calls it.
 *   2. A banner is added saying what this is, since a page that looks exactly
 *      like a working dashboard should say plainly that it is not one.
 */

import {readFileSync, writeFileSync} from 'node:fs'
import {dirname, join} from 'node:path'
import {fileURLToPath} from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const source = readFileSync(join(root, 'vendor', 'dashboard.html'), 'utf8')

// The dashboard closes its markup and opens its script in one place. If this
// ever stops matching, the build should fail rather than emit a page whose
// mock silently never loaded.
const ANCHOR = '</main><script>'
if (!source.includes(ANCHOR)) {
    throw new Error(
        `could not find ${JSON.stringify(ANCHOR)} in vendor/dashboard.html — `
        + 'the dashboard markup changed shape; check where its inline script now starts',
    )
}

const BANNER = `<div id="demo-banner" role="note">
  <strong>Static demo.</strong> This is the real dashboard with its backend replaced by a script:
  nothing is stored and no request leaves your browser. Changes you make are kept in memory and
  disappear when you reload.
  <a href="https://github.com/uetuluk/create-public">Source</a> ·
  <a href="https://github.com/uetuluk/create-public/blob/main/docs/try-it.md">Run it yourself</a>
</div>
<style>
  #demo-banner{position:sticky;top:0;z-index:99;padding:10px 16px;font-size:13px;line-height:1.5;
    background:#1d2433;color:#c9d3e4;border-bottom:1px solid #2c3547}
  #demo-banner strong{color:#f4f6fb}
  #demo-banner a{color:#7aa2f7}
  @media (prefers-reduced-motion:no-preference){#demo-banner{transition:opacity .2s}}
</style>`

/**
 * The dashboard links by absolute path, which is right when it is served from
 * the root of its own installation and wrong here: this page sits under a
 * repository subpath, so `/admin` would leave the site entirely. Each is
 * pointed somewhere that exists.
 */
const LINKS = {
    // Server-rendered pages with no static equivalent. The source is the
    // honest destination for someone who wants to see what they do.
    '/admin': 'https://github.com/uetuluk/create-public/blob/main/deploy/platform/src/routes/admin.ts',
    '/skills/create-ritsdev/SKILL.md': 'https://github.com/uetuluk/create-public/blob/main/skills/create-ritsdev/SKILL.md',
    // Sign-in is already mocked as complete, so this should not navigate.
    '/auth/google': '#',
    '/favicon.svg': './favicon.svg',
}

let out = source
    .replace('<body>', `<body>\n${BANNER}`)
    .replace(ANCHOR, '</main><script src="./mock.js"></script><script>')

for (const [from, to] of Object.entries(LINKS)) {
    out = out.split(`href="${from}"`).join(`href="${to}"`)
}

const leftover = [...out.matchAll(/(?:href|src)="(\/[^"]*)"/g)].map(m => m[1])
if (leftover.length) {
    throw new Error(`absolute paths would break under a subpath: ${[...new Set(leftover)].join(', ')}`)
}

if (out === source) throw new Error('no substitutions were made; refusing to write an unmodified page')

writeFileSync(join(root, 'index.html'), out)
console.log(`index.html written (${out.length} bytes)`)
