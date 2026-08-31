/**
 * The backend, replaced by a script tag.
 *
 * This page is the real dashboard — the same markup and the same client code
 * the platform serves — with `fetch` intercepted before any of it runs. Nothing
 * is reachable, nothing is stored, and no request leaves the browser.
 *
 * It is written this way rather than as a screenshot or a hand-built lookalike
 * because a mockup drifts. The markup here comes from the platform's own
 * `routes/dashboard.ts`, so when that changes and this is regenerated, the
 * difference shows up. A picture of a UI tells you what someone intended it to
 * look like a while ago.
 *
 * Mutations are applied to the in-memory state below, so creating a project,
 * editing a listing, minting a token and revoking one all behave. They vanish
 * on reload, which is the honest behaviour for a page with nowhere to write.
 */

(() => {
    const today = new Date()
    const dayKey = offset => {
        const d = new Date(today)
        d.setDate(d.getDate() - offset)
        return d.toISOString().slice(0, 10)
    }

    /** A plausible 30-day series: quiet, with a launch bump and a weekend dip. */
    const series = (base, spike) => Array.from({length: 30}, (_, i) => {
        const day = 29 - i
        if (!base) return {day: dayKey(day), views: 0}
        const weekend = [0, 6].includes(new Date(dayKey(day)).getDay()) ? 0.45 : 1
        const bump = day === spike ? 6 : day === spike - 1 ? 3 : 1
        return {day: dayKey(day), views: Math.round(base * weekend * bump + (day % 3))}
    })

    const total = rows => rows.reduce((sum, r) => sum + r.views, 0)

    const state = {
        me: {email: 'you@example.edu', displayName: 'You', role: 'operator'},

        projects: [
            {
                slug: 'seminar-signup',
                url: 'https://seminar-signup.demo.example',
                status: 'ready',
                currentVersionId: 'v_8f21c4',
                access: 'showcase',
                showcase: {
                    description: 'Pick a slot for the Thursday reading group, and see who else is coming.',
                    draft: '',
                },
            },
            {
                slug: 'lab-inventory',
                url: 'https://lab-inventory.demo.example',
                status: 'ready',
                currentVersionId: 'v_2ad907',
                access: 'network',
                showcase: {
                    description: '',
                    // What the "suggested description" flow looks like: drafted by
                    // a model that read the page, shown to the owner, never
                    // published unless they choose it.
                    draft: 'Track which bench each instrument is on, and who signed it out.',
                },
            },
            {
                slug: 'thesis-notes',
                url: 'https://thesis-notes.demo.example',
                status: 'ready',
                currentVersionId: null,
                access: 'owner',
                showcase: {description: '', draft: ''},
            },
        ],

        analytics: {
            'seminar-signup': {views: 0, visitors: 214, apiRequests: 1893, days: 30, daily: series(38, 11)},
            'lab-inventory': {views: 0, visitors: 31, apiRequests: 0, days: 30, daily: series(6, 24)},
            'thesis-notes': {views: 0, visitors: 0, apiRequests: 0, days: 30, daily: series(0, -1)},
        },

        showcase: [
            {
                slug: 'seminar-signup',
                url: 'https://seminar-signup.demo.example',
                screenshotUrl: '',
                description: 'Pick a slot for the Thursday reading group, and see who else is coming.',
                ownerName: 'You',
                views: 0,
            },
            {
                slug: 'reading-list',
                url: 'https://reading-list.demo.example',
                screenshotUrl: '',
                description: 'What the group read this term, with the papers attached.',
                ownerName: 'A Colleague',
                views: 486,
            },
        ],

        tokens: [
            {
                id: 'tok_a1b2c3',
                name: 'laptop',
                lastFour: '9f2e',
                scopes: ['sites:read', 'sites:write', 'deployments:write', 'logs:read'],
                expiresAt: new Date(today.getTime() + 62 * 864e5).toISOString(),
                lastUsedAt: new Date(today.getTime() - 2 * 864e5).toISOString(),
                revokedAt: null,
            },
            {
                id: 'tok_d4e5f6',
                name: 'ci',
                lastFour: '41ab',
                scopes: ['deployments:write'],
                expiresAt: null,
                lastUsedAt: null,
                revokedAt: null,
            },
        ],
    }

    // Totals are derived rather than written down, so the sparkline and the
    // figure beside it can never disagree.
    for (const [slug, a] of Object.entries(state.analytics)) {
        a.views = total(a.daily)
        const listed = state.showcase.find(p => p.slug === slug)
        if (listed) listed.views = a.views
    }

    const json = (body, status = 200) =>
        new Response(JSON.stringify(body), {status, headers: {'content-type': 'application/json'}})

    const notFound = () => json({message: 'not part of this demo'}, 404)

    const slugOf = path => decodeURIComponent(path.split('/')[3] ?? '')

    /** Everything the dashboard asks for, and nothing else. */
    const routes = [
        ['GET', /^\/auth\/me$/, () => json(state.me)],

        ['POST', /^\/auth\/logout$/, () => json({ok: true})],

        ['GET', /^\/v1\/projects$/, () => json({projects: state.projects})],

        ['POST', /^\/v1\/projects$/, (_p, body) => {
            const slug = String(body.slug || '').trim()
            if (!/^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/.test(slug)) {
                return json({message: 'a slug is 3-40 characters of lowercase letters, digits and hyphens'}, 400)
            }
            if (state.projects.some(p => p.slug === slug)) {
                return json({message: `"${slug}" already exists`}, 409)
            }
            state.projects.push({
                slug,
                url: `https://${slug}.demo.example`,
                status: 'ready',
                currentVersionId: null,
                access: body.access === 'network' ? 'network' : 'owner',
                showcase: {description: '', draft: ''},
            })
            state.analytics[slug] = {views: 0, visitors: 0, apiRequests: 0, days: 30, daily: series(0, -1)}
            return json({slug}, 201)
        }],

        ['GET', /^\/v1\/projects\/[^/]+\/analytics$/, path =>
            json(state.analytics[slugOf(path)] ?? {views: 0, visitors: 0, apiRequests: 0, days: 30, daily: series(0, -1)})],

        ['PUT', /^\/v1\/projects\/[^/]+\/showcase$/, (path, body) => {
            const project = state.projects.find(p => p.slug === slugOf(path))
            if (!project) return notFound()
            project.showcase.description = String(body.description ?? '')
            project.showcase.draft = ''
            return json({ok: true})
        }],

        ['PATCH', /^\/v1\/projects\/[^/]+\/access$/, (path, body) => {
            const project = state.projects.find(p => p.slug === slugOf(path))
            if (!project) return notFound()
            const access = body.access
            // The same refusal the platform makes: a gallery card with no
            // description would be a bare slug, and only its owner can say what
            // the thing is for.
            if (access === 'showcase' && !project.showcase.description.trim()) {
                return json({message: 'set a showcase description first: a gallery card needs one line saying what this app is for'}, 409)
            }
            project.access = access
            const listed = state.showcase.findIndex(p => p.slug === project.slug)
            if (access === 'showcase' && listed < 0) {
                state.showcase.unshift({
                    slug: project.slug,
                    url: project.url,
                    screenshotUrl: '',
                    description: project.showcase.description,
                    ownerName: state.me.displayName,
                    views: state.analytics[project.slug]?.views ?? 0,
                })
            } else if (access === 'showcase') {
                state.showcase[listed].description = project.showcase.description
            } else if (listed >= 0) {
                state.showcase.splice(listed, 1)
            }
            return json({ok: true})
        }],

        ['GET', /^\/v1\/showcase$/, () => json({projects: state.showcase})],

        ['GET', /^\/v1\/tokens$/, () => json({tokens: state.tokens})],

        ['POST', /^\/v1\/tokens$/, (_p, body) => {
            const scopes = Array.isArray(body.scopes) ? body.scopes : []
            if (!scopes.length) return json({message: 'select at least one scope'}, 400)
            const lastFour = Math.random().toString(16).slice(2, 6)
            state.tokens.push({
                id: `tok_${Math.random().toString(16).slice(2, 8)}`,
                name: String(body.name || 'token'),
                lastFour,
                scopes,
                expiresAt: body.expiresInDays
                    ? new Date(Date.now() + Number(body.expiresInDays) * 864e5).toISOString()
                    : null,
                lastUsedAt: null,
                revokedAt: null,
            })
            // Shown once and never again, exactly as the real endpoint behaves.
            return json({token: `ritsdev_demo_${'x'.repeat(28)}${lastFour}`}, 201)
        }],

        ['DELETE', /^\/v1\/tokens\/[^/]+$/, path => {
            const id = decodeURIComponent(path.split('/')[3] ?? '')
            const token = state.tokens.find(t => t.id === id)
            if (!token) return notFound()
            token.revokedAt = new Date().toISOString()
            return json({ok: true})
        }],
    ]

    const realFetch = globalThis.fetch.bind(globalThis)

    globalThis.fetch = async (input, init = {}) => {
        const url = typeof input === 'string' ? input : input.url
        const method = (init.method || 'GET').toUpperCase()

        // Anything absolute is somebody else's business — let it fail on its
        // own terms rather than answering for a host we know nothing about.
        if (/^[a-z]+:\/\//i.test(url)) return realFetch(input, init)

        const path = url.split('?')[0]
        const match = routes.find(([m, pattern]) => m === method && pattern.test(path))
        if (!match) return notFound()

        let body = {}
        try {
            body = init.body ? JSON.parse(init.body) : {}
        } catch {
            body = {}
        }

        // A beat of latency, so loading states are visible rather than skipped.
        await new Promise(resolve => setTimeout(resolve, 120))
        return match[2](path, body)
    }
})()
