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
    // The admin view is rendered by the server, so there is nothing static to
    // link to. Sending someone to admin.ts instead was worse than useless: a
    // nav button that looks like part of the app and drops you into a
    // TypeScript file. It opens an explanation on the page instead, and offers
    // the source to whoever actually wants it.
    '/admin': '#admin-note',
    // The guide is a document, so GitHub renders the real thing.
    '/skills/create-ritsdev/SKILL.md': 'https://github.com/uetuluk/create-public/blob/main/skills/create-ritsdev/SKILL.md',
    // Sign-in is already mocked as complete, so this should not navigate.
    '/auth/google': '#',
    '/favicon.svg': './favicon.svg',
}

/**
 * Revealed by `:target` when the admin link is clicked — no script, so it
 * cannot break if the dashboard's own JS changes shape underneath it.
 */
const ADMIN_NOTE = `<section id="admin-note">
  <h2>The admin view is not part of this demo</h2>
  <p>Operators get a read-only view of every project and account, live host and
  runtime resource use, the job queue, and recent audit events. It is rendered
  by the server, so there is no version of it that can run on a page with no
  backend — unlike the dashboard around it, which is the real client code.</p>
  <p><a href="https://github.com/uetuluk/create-public/blob/main/deploy/platform/src/routes/admin.ts">Read what it does</a>
  · <a href="https://github.com/uetuluk/create-public/blob/main/docs/operations.md#system-admin-view">Operations guide</a>
  · <a href="#">Close</a></p>
</section>
<style>
  #admin-note{display:none}
  /* The :target jump scrolls the panel to the top of the viewport, which puts it under
     the sticky banner and pushes the header off screen. A margin larger than the
     panel's own offset clamps to zero at the top of the page, so it opens in
     place with the nav still visible, and still clears the banner from further
     down the page. */
  #admin-note:target{display:block;scroll-margin-top:240px;margin:16px auto;max-width:900px;padding:16px 20px;
    background:#1d2433;color:#c9d3e4;border:1px solid #2c3547;border-radius:8px}
  #admin-note h2{margin:0 0 8px;font-size:16px;color:#f4f6fb}
  #admin-note p{margin:0 0 8px;font-size:14px;line-height:1.6}
  #admin-note a{color:#7aa2f7}
</style>`

let out = source
    .replace('<body>', `<body>\n${BANNER}`)
    .replace('</header>', `</header>\n${ADMIN_NOTE}`)
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
