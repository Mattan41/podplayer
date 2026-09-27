# DNS Records — `kruskopf.org` (Cloudflare)

Reference for every DNS record that matters to Podplayer. All records live in the Cloudflare zone for `kruskopf.org`.

## Records

| Type | Name | Target | Proxy | Purpose |
| --- | --- | --- | --- | --- |
| CNAME | `podplayer` | `mattan41.github.io` | DNS only (gray) | Frontend — GitHub Pages |
| CNAME | `podplayer-api` | `ghs.googlehosted.com` | DNS only (gray) | Backend — Cloud Run domain mapping |
| TXT | `_google-site-verification` (or `@`) | `(Google value)` | n/a | Domain verification for the Cloud Run custom domain |

> The TXT verification record is provided by Google when the custom domain mapping is created. The exact value is a Google-issued token and is not reproduced here.

## Why DNS-Only (Gray Cloud)

Cloudflare's proxy (orange cloud) **terminates SSL itself**. That conflicts with the SSL certificates issued by GitHub Pages and Cloud Run:

- GitHub Pages issues a certificate for `podplayer.kruskopf.org` and expects to serve HTTPS directly.
- Cloud Run issues a certificate for `podplayer-api.kruskopf.org` (via its domain mapping) and expects to serve HTTPS directly.

If Cloudflare proxied these records, it would intercept the TLS handshake and present its own certificate, breaking the certificates the origin services provision. Both backends need to manage their own SSL, so both records are set to **DNS only (gray cloud)**.

## SSL Responsibility

| Host | Certificate authority | Renewal |
| --- | --- | --- |
| `podplayer.kruskopf.org` (GitHub Pages) | Let's Encrypt | Automatic, managed by GitHub Pages |
| `podplayer-api.kruskopf.org` (Cloud Run) | Let's Encrypt | Automatic, managed by Cloud Run |

Cloudflare is DNS only and issues no certificates for these hostnames.

## How to Verify DNS Is Correct

```bash
dig podplayer.kruskopf.org CNAME +short
# -> mattan41.github.io.

dig podplayer-api.kruskopf.org CNAME +short
# -> ghs.googlehosted.com.
```

If the output includes a Cloudflare address instead of the target above, the record was flipped to proxied (orange cloud) and must be set back to DNS only.
