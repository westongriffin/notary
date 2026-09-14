# Pointing notary.wes-griffin.com at the Wix site

## Current state (checked 2026-09-14)

- `wes-griffin.com` is served by **Wix nameservers** (`ns12.wixdns.net`,
  `ns13.wixdns.net`). DNS for the whole domain is already managed inside Wix.
- `notary.wes-griffin.com` has **no DNS record yet** (no A, no CNAME).

Because Wix already controls the zone, there is nothing to configure at an
outside registrar. The subdomain is created entirely in the Wix dashboard.

## Prerequisites

- The notary site must be on a **Premium plan** (Light or higher). Free sites
  cannot use custom domains or subdomains.
- The Wix account that owns `wes-griffin.com` must be the same account (or a
  collaborator) that owns the notary site.

## Steps

1. **Publish the notary site** at least once so it has a live URL.
2. Go to **Wix Dashboard → Settings → Domains** (from the account-level
   dashboard, not the site dashboard).
3. Find `wes-griffin.com` → **⋯** → **Manage Subdomains**
   (label may read *Add Subdomain* on some accounts).
4. Click **Add Subdomain**, enter `notary`, and choose **Connect to a Wix
   site** → select the notary site.
5. Wix creates the CNAME record in its own DNS automatically and starts SSL
   issuance. Propagation is usually under an hour; up to 48 h worst case.
6. Back in the **notary site's dashboard → Settings → Domains**, confirm
   `notary.wes-griffin.com` shows as **Connected** and set it as the
   **primary domain** so the `*.wixsite.com` URL redirects to it.
7. Under **Settings → Domains → ⋯ → Advanced**, confirm **HTTPS** is enforced
   (it is on by default once the certificate is issued).

## Verify

```bash
dig +short CNAME notary.wes-griffin.com
```

Expected: a `*.wixdns.net` or `*.wixsite.com` target. Then:

```bash
curl -sI https://notary.wes-griffin.com | head -5
```

Expected: `HTTP/2 200` with a valid certificate. The Members login should be
reachable and `/dashboard` should redirect logged-out visitors (see
`src/pages/masterPage.js`).

## If DNS were ever moved off Wix

Should the root domain later move to an outside DNS host, add this record
there instead, using the exact target shown in the site's Domains panel under
*Connect via pointing*:

| Type | Host | Value |
| --- | --- | --- |
| CNAME | `notary` | value shown by Wix (e.g. `www123.wixdns.net`) |

Never use an A record for a Wix subdomain; Wix's IPs change.

## Cleanup

`.firebaserc` and `.nojekyll` from the earlier Firebase/GitHub Pages attempt
were removed from this repo. If a Firebase Hosting site or GitHub Pages
custom-domain entry still references `notary.wes-griffin.com`, delete those
so they cannot compete for the hostname later.
