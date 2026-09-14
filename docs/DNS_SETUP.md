# DNS: pointing notary.wes-griffin.com at GitHub Pages

Wix is the registrar and DNS host for `wes-griffin.com` (nameservers
`ns12.wixdns.net` / `ns13.wixdns.net`). That is the only thing Wix does for
this project. The site itself is served by GitHub Pages.

## 1. GitHub side

Repository **westongriffin/notary** → Settings → Pages:

- Source: **Deploy from a branch**, branch `main`, folder `/ (root)`.
- Custom domain: `notary.wes-griffin.com` (the `CNAME` file in the repo sets this too).
- Enforce HTTPS: on (available once the DNS record below resolves).

GitHub Pages on a free account requires the repository to be **public**.

## 2. Wix side (the only Wix step)

Wix dashboard → account menu → **Domains** → `wes-griffin.com` → **⋯** →
**Manage DNS Records** → under **CNAME (Aliases)** click **Add Record**:

| Host name | Value | TTL |
| --- | --- | --- |
| `notary` | `westongriffin.github.io` | 1 hour (default) |

Save. Do not add an A record for the subdomain, and leave the root domain's
existing records alone.

## 3. Verify

```bash
dig +short CNAME notary.wes-griffin.com
```

Expected: `westongriffin.github.io.` Then GitHub's Pages settings page shows
"DNS check successful" and issues a certificate, usually within an hour.

```bash
curl -sI https://notary.wes-griffin.com | head -3
```

Expected: `HTTP/2 200`.

## 4. Firebase authorized domain

Sign-in only works from domains Firebase trusts. Add
`notary.wes-griffin.com` under Firebase Console → Authentication → Settings →
**Authorized domains**. See `FIREBASE_SETUP.md`.
