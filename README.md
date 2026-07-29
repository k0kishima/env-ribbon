# env-ribbon

A corner ribbon that tells you which deployment you are looking at — **LOCAL** or **PREVIEW**. It never renders in production.

<!-- TODO: screenshot / GIF of the green LOCAL and yellow PREVIEW ribbons -->
<!-- ![env-ribbon](./docs/screenshot.png) -->

A Vercel preview deployment looks exactly like production apart from the URL, which is how people end up seeding test data into the wrong place. One line in your root layout removes the ambiguity.

- **No `next` dependency.** The package only reads environment variables, so `react` is the single peer dependency.
- **No CSS framework.** Inline styles, no Tailwind, no stylesheet to import, no build config to change.
- **Production is a hard gate**, not a convention — see [Detection rules](#detection-rules).

## Install

```sh
npm install env-ribbon
# pnpm add env-ribbon / yarn add env-ribbon
```

## Quick start

Next.js App Router, inside `<body>` of your root layout:

```tsx
// app/layout.tsx
import { EnvironmentRibbon } from 'env-ribbon';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <EnvironmentRibbon />
      </body>
    </html>
  );
}
```

That is the whole setup. Running `next dev` you get a green **LOCAL** ribbon; on a Vercel preview deployment a yellow **PREVIEW** one; in production, nothing.

> **Mount it as a Server Component.** `EnvironmentRibbon` reads `process.env` on the server and passes only the resolved variant string to the client, so `VERCEL_ENV` never has to be exposed through a `NEXT_PUBLIC_*` variable. Imported into a client component tree it cannot read the environment and will not work.

### Tip: apps with more than one root layout

If your app has several layouts that render `<html>`/`<body>` — one per route group, for example — mount the ribbon in **every** one. Miss one and the ribbon silently disappears on those URLs, which is the exact moment you needed it.

## Detection rules

Evaluated in order, first match wins:

| # | Condition | Result |
| - | --- | --- |
| 1 | `VERCEL_ENV === 'production'` | nothing — hard gate |
| 2 | `NODE_ENV === 'test'` | nothing — keeps E2E runs clean |
| 3 | `VERCEL_ENV === 'preview'` | `PREVIEW` (yellow) |
| 4 | (`VERCEL_ENV === 'development'` or unset) **and** `NODE_ENV !== 'production'` | `LOCAL` (green) |
| 5 | anything else | nothing — fail-safe |

Two details worth knowing:

- **Vercel preview builds run with `NODE_ENV === 'production'`.** `VERCEL_ENV` is the only signal that separates preview from production, which is why rule 3 ignores `NODE_ENV`.
- **A self-hosted production build has no `VERCEL_ENV` and `NODE_ENV === 'production'`.** That is what the `NODE_ENV` guard in rule 4 is for: without it such a build would proudly announce itself as LOCAL.

When the environment cannot be identified, nothing is rendered.

## Non-Vercel hosts

On Netlify, Cloudflare, or your own servers there is no `VERCEL_ENV`, so auto-detection only ever yields `LOCAL` during development. Pass `variant` to render a ribbon explicitly:

```tsx
<EnvironmentRibbon variant="STAGING" />
```

`variant` **bypasses detection completely** — the production gate and the `NODE_ENV=test` guard included. The ribbon renders wherever that code runs, so the responsibility for keeping it out of production becomes yours:

```tsx
{process.env.DEPLOY_ENV === 'staging' && <EnvironmentRibbon variant="STAGING" />}
```

## Props

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `variant` | `string` | auto-detected | Render this label unconditionally, bypassing detection. Used verbatim — no casing applied. |
| `colors` | `Record<string, string>` | `{ LOCAL: '#22c55e', PREVIEW: '#facc15' }` | Variant to background color, merged over the defaults. Anything unmapped gets `#6b7280`. |
| `position` | `'top-right' \| 'top-left'` | `'top-right'` | Which corner to pin the ribbon to. |
| `zIndex` | `number` | `60` | Raise it if the ribbon ends up behind your header or modals. |

The label is always white — weak contrast on yellow, but it is the established convention for deploy-preview ribbons.

Dismissal is always available: click, tap, <kbd>Enter</kbd> or <kbd>Space</kbd> hides the ribbon. The state lives in React memory only and is deliberately **not** persisted, so a reload brings the ribbon back.

## `env-ribbon/detect`

The detection logic is a pure function with no dependencies and no environment access of its own — it takes the signals as arguments, so it runs anywhere:

```ts
import { detectEnvironmentVariant } from 'env-ribbon/detect';
// => 'LOCAL' | 'PREVIEW' | null

detectEnvironmentVariant({
  vercelEnv: process.env.VERCEL_ENV,
  nodeEnv: process.env.NODE_ENV,
});
```

Useful if you want the same rules behind your own UI, a log line, or a feature flag.

## Testing

- **`data-testid="environment-ribbon"`** is a public contract. It is what your E2E tests should select, and changing it is a semver-major change here.
- Under `NODE_ENV === 'test'` the ribbon hides itself, so it will not sit on top of the element your Playwright test is trying to click.

```ts
await expect(page.getByTestId('environment-ribbon')).toHaveText('PREVIEW');
```

## Known limitations

- **Strict CSP.** Environments that forbid `unsafe-inline` in `style-src` / `style-src-attr` will block the inline styles and the small `<style>` tag this component renders. Since the ribbon only ever shows up in development and preview, the practical impact is limited to those environments.

- **A small client chunk still ships to production.** Nothing is *rendered* in production, but the dismiss button is a client component, so its code reaches the browser anyway. Measured on a Next.js 16 / Turbopack app: **+1,078 bytes raw, +514 bytes gzipped**, or 0.19% of that app's 265 KB of gzipped initial JS.

  Deferring the import until after the production gate — `await import('./EnvironmentRibbonClient.js')` — does **not** remove it. Turbopack merges the module into a shared chunk that other client components already load unconditionally, so the bytes are present whether or not this component renders; a measurement across both variants came out byte-identical. Reaching zero would mean dropping the client component altogether and doing the dismissal in CSS, which moves `data-testid` off the `<button>` and breaks the contract above. At half a kilobyte that trade is not worth making, so the bytes stay.

## Scope

Built for Next.js / React with Server Components. React Native is out of scope; a separate package is planned for it, reusing `env-ribbon/detect` as-is.

## License

MIT © [k0kishima](https://www.npmjs.com/~k0kishima)
