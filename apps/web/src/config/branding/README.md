# White-label branding

The admin web supports two build-time brand presets. Both ship from
the same codebase — selection happens via `NEXT_PUBLIC_BRAND` at
build time. There is **no** runtime brand switcher; each Vercel
build produces ONE brand bundle.

## How to build each brand

```bash
# Default (Ezgate)
pnpm --filter web build
NEXT_PUBLIC_BRAND=ezgate pnpm --filter web build

# Alternate (Ezegate)
NEXT_PUBLIC_BRAND=ezegate pnpm --filter web build
```

For Vercel: set `NEXT_PUBLIC_BRAND=ezegate` in the Project Environment
Variables for the Ezegate deployment, leave it unset (or set to
`ezgate`) for the default deployment.

## Where to edit values

All brand state lives in `src/config/branding/`:

- `types.ts` — the `Brand` interface (don't edit unless adding new
  brand fields)
- `ezgate.ts` — default brand colors + strings
- `ezegate.ts` — alternate brand colors + strings (placeholder
  values — replace with the real Ezegate palette when finalised)
- `index.ts` — picks the brand from `NEXT_PUBLIC_BRAND`
- `brand-styles.tsx` — server-renders the CSS variable overrides
  into `<head>`; rarely needs to change

Edit `<brand>.ts` to change:
- `appName` — display name (auth header, sidebar, page titles)
- `tagline` — sub-heading on auth screen + footer
- `legalEntity` — copyright line
- `logoLetter` — single character inside the logo tile
- `appLabels.{admin,resident,guard}` — wrong-app routing copy
- `colors.light.*` / `colors.dark.*` — every CSS color token

## How it works

1. `index.ts` reads `process.env.NEXT_PUBLIC_BRAND` at build time
   and exports `BRAND` — the active `Brand` object.
2. `<RootLayout>` sets `<html data-brand={BRAND.id}>` and renders
   `<BrandStyles>` in `<head>`.
3. `<BrandStyles>` emits a `<style>` tag declaring `--color-*` CSS
   variables for both `:root` and `.dark`. These override the
   default values declared in `globals.css` `@theme` block, so
   every Tailwind utility (`bg-primary`, `text-foreground`, …)
   resolves to the brand color.
4. Brand strings are read from `BRAND.appName` etc. directly in
   each component.

## Adding a third brand

1. Create `branding/<slug>.ts` exporting a `Brand` object (copy
   `ezgate.ts` as a template).
2. Register it in `branding/index.ts` `BRANDS` map.
3. Set `NEXT_PUBLIC_BRAND=<slug>` in the deploy environment.

## Verifying a brand build

After `NEXT_PUBLIC_BRAND=<slug> pnpm --filter web build`:

```bash
grep -oE 'data-brand="[^"]*"' apps/web/.next/server/app/legal/privacy.html | head -1
# expect: data-brand="<slug>"

grep -oE '<title>[^<]*</title>' apps/web/.next/server/app/legal/privacy.html | head -1
# expect title containing the brand's appName
```
