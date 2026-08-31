# create-demo-static

A static demo of the [create-ritsdev](https://github.com/uetuluk/create-public)
dashboard. No backend, no account, nothing stored.

**→ [uetuluk.github.io/create-demo-static](https://uetuluk.github.io/create-demo-static)**

## What this is

The real dashboard. Not a mockup of it, not a screenshot of it — the same markup
and the same client-side code the platform serves, with `fetch` replaced by a
script that answers from fixtures in memory.

That distinction is the whole point of building it this way. A hand-drawn
lookalike starts accurate and quietly stops being accurate, and nothing ever
notices. This page is regenerated from `routes/dashboard.ts`, so when the
dashboard changes, the diff shows up here.

Because the client code is real, the interactions are real: create a project,
edit a gallery listing, take the suggested description, change who can see a
project, mint a token, revoke one. The refusals are real too — a project cannot
be listed in the gallery without a description, exactly as the platform refuses
it. Everything lives in memory and disappears when you reload.

What is **not** real: there is no build, no deployment, no database, no
container. For that, the platform [runs from published images in about five
minutes](https://github.com/uetuluk/create-public/blob/main/docs/try-it.md).

## Layout

| Path | What it is |
|---|---|
| `mock.js` | The fixtures and the `fetch` shim. The only hand-written code here. |
| `vendor/dashboard.html` | The dashboard, rendered by the platform repository. Not edited by hand. |
| `tools/build.mjs` | Injects `mock.js` and a banner into the vendored page, and rewrites absolute links. |
| `index.html` | Generated. Do not edit — `npm run build` overwrites it. |

## Regenerating after a dashboard change

The vendored page comes from the platform repository, because rendering it there
uses the same code path a real request does. From a checkout of
[create-public](https://github.com/uetuluk/create-public):

```sh
cat > .render.mts <<'TS'
import {writeFileSync} from 'node:fs'
import {dashboardRoutes} from './src/routes/dashboard'
const app = dashboardRoutes({
    showcaseOrigin: 'https://showcase.demo.example',
    publicBaseUrl: 'https://demo.example',
    signInHint: 'Any Google account can publish here.',
})
writeFileSync(process.argv[2], await (await app.request('/')).text())
TS
cd deploy/platform && npx tsx .render.mts /path/to/create-demo-static/vendor/dashboard.html
rm .render.mts
```

Then, here:

```sh
node tools/build.mjs
```

The build fails rather than emitting a broken page if the dashboard's markup
moves — it looks for the exact point where the inline script begins, and refuses
to write a page whose mock never loaded or whose links would break under the
repository subpath.

## Checking it locally

```sh
python3 -m http.server 8765
# then open http://127.0.0.1:8765/index.html
```

## Licence

[AGPL-3.0-only](LICENSE), the same as the platform — `index.html` contains the
platform's own markup and client code, so it inherits those terms. `mock.js` and
`tools/build.mjs` are original to this repository and carry the same licence.

---

Built with [Claude](https://claude.com/claude-code).
