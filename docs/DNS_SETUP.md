# DNS: pointing thenotarybook.com at GitHub Pages

`thenotarybook.com` is registered at Wix and uses Wix nameservers
(`ns12.wixdns.net` / `ns13.wixdns.net`). Wix only hosts the DNS records; the
site is served by GitHub Pages.

## GitHub side

Repository **westongriffin/notary** → Settings → Pages:

- Source: **Deploy from a branch**, branch `main`, folder `/ (root)`.
- Custom domain: `thenotarybook.com` (the `CNAME` file in the repo sets this too).
- Enforce HTTPS: on, once the certificate is issued.

With the apex as the custom domain, GitHub also serves `www.thenotarybook.com`
and redirects it to the apex.

## Wix side (Domains → thenotarybook.com → ⋯ → Manage DNS Records)

Replace Wix's default records with these:

| Type | Host name | Value |
| --- | --- | --- |
| A | `thenotarybook.com` | `185.199.108.153` |
| A | `thenotarybook.com` | `185.199.109.153` |
| A | `thenotarybook.com` | `185.199.110.153` |
| A | `thenotarybook.com` | `185.199.111.153` |
| CNAME | `www` | `westongriffin.github.io` |

Delete the Wix parking A records (`185.230.63.x`) and the `www` CNAME to
`*.wixdns.net`; leave any TXT/MX records alone.

## Verify

```bash
dig +short A thenotarybook.com
dig +short CNAME www.thenotarybook.com
```

Expected: the four GitHub IPs, and `westongriffin.github.io.`

```bash
curl -sI https://thenotarybook.com | head -3
```

Expected: `HTTP/2 200`.

## Firebase authorized domains

Sign-in only works from domains Firebase trusts. `thenotarybook.com` and
`www.thenotarybook.com` are listed under Firebase Console → Authentication →
Settings → Authorized domains.

## Previous address

`notary.wes-griffin.com` still has a CNAME to GitHub, but GitHub Pages serves
one custom domain per site, so that hostname now returns GitHub's 404 page.
Remove that record in Wix (wes-griffin.com → Manage DNS Records) when you no
longer want it to resolve.
