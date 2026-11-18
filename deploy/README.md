# Hosting on the VPS

urielpapa.com is moving from Vercel to the Contabo VPS (`84.247.153.107`, Ubuntu 24.04), next to the n8n and viteseo.ph sites already there.

```
visitor ─► Cloudflare (proxy, CDN, TLS) ─► Nginx :443 ─┬─► /srv/urielpapa.com/current/client   prebuilt pages
                                                       └─► 127.0.0.1:4321 Astro Node server    /api, /dashboard, /keystatic, /preview
```

- The firewall admits 80/443 only from Cloudflare, so the site is reachable only through Cloudflare. Cloudflare talks to Nginx over TLS with a Cloudflare Origin CA certificate.
- **Nginx** (`deploy/nginx/urielpapa.com.conf`) serves the static pages and sets the same headers and redirects as `scripts/vercel-routes.mjs` does on Vercel: www → apex, `.md` copies, `/_image` closed, CSP report-only and the security headers. Until Vercel is retired, change both files together.
- **The Node server** (`deploy/urielpapa.service`, systemd) runs as the `urielpapa` user on a read-only filesystem. Its secrets are in `/etc/urielpapa.com/env`.
- **Deploys** (`.github/workflows/deploy-vps.yml`) run on every push to `main`:
  1. GitHub Actions builds with `DEPLOY_TARGET=vps`.
  2. It bundles the output with production `node_modules` and rsyncs it to `/srv/urielpapa.com/releases/<sha>-<run>/`.
  3. `deploy/activate.sh` flips the `current` symlink and restarts the service. It rolls back if the server does not answer.
  4. The newest five releases are kept.
- **Without `DEPLOY_TARGET`**, the build is the Vercel build, unchanged, so Vercel keeps working until cutover.

## Already done (17 Nov 2026)

- **VPS:** `deploy/setup-vps.sh` has run on the VPS. Node 22.23.5 is installed, along with the `urielpapa` user, its deploy key, sudo rights for the service restart only, `/srv/urielpapa.com`, the systemd unit and the Nginx vhost (with a temporary self-signed certificate).
  - Nginx's earlier config is backed up in `/root/nginx-backup-202611171903.tgz`.
- **First release:** a release of `main` @ `d3d9108` is live on the VPS.
  - Every sitemap URL (126) returns the same status and canonical as Vercel.
  - Headers, redirects, the 404 page, `.md` copies and the contact form's origin check all match.
- **GitHub:**
  - Secrets: `VPS_SSH_KEY` (private key also at `~/.ssh/urielpapa_deploy_ed25519` on Uriel's Mac) and `VPS_KNOWN_HOSTS`.
  - Variables: `VPS_HOST` and the public build values `PUBLIC_GA4_ID`, `PUBLIC_GOOGLE_SITE_VERIFICATION`, `PUBLIC_BING_SITE_VERIFICATION` and `PUBLIC_TURNSTILE_SITE_KEY`.

## Cutover checklist

Vercel keeps serving the site until the nameservers change, so nothing below causes downtime.

1. **Server secrets.** Copy the values from Vercel (Settings → Environment Variables; "Sensitive" ones can't be read back, so take them from where they were made) into `/etc/urielpapa.com/env` as `KEY=value` lines. Wrap the service-account JSON in single quotes on one line. Then run `systemctl restart urielpapa`.
   - Contact form: `RESEND_API_KEY`, `TURNSTILE_SECRET_KEY`, and optionally `CONTACT_TO_EMAIL` and `CONTACT_FROM_EMAIL`.
   - Newsletter: `BUTTONDOWN_API_KEY`.
   - Dashboard sign-in: `DASHBOARD_GOOGLE_CLIENT_ID`, `DASHBOARD_GOOGLE_CLIENT_SECRET`, `DASHBOARD_EMAILS` and `DASHBOARD_PASSWORD`.
   - Dashboard refresh: `GSC_SERVICE_ACCOUNT_JSON`, `BING_WEBMASTER_API_KEY`, `GITHUB_DATA_TOKEN` and `CLARITY_API_TOKEN`.
   - Keystatic: `KEYSTATIC_GITHUB_CLIENT_ID`, `KEYSTATIC_GITHUB_CLIENT_SECRET` and `KEYSTATIC_SECRET`.
2. **Keystatic app slug.** Add the GitHub variable `PUBLIC_KEYSTATIC_GITHUB_APP_SLUG` (Vercel has it). It is baked in at build time.
3. **Merge this branch.** The push to `main` runs the first automated deploy, which is also the first build with the `PUBLIC_*` values.
   - Check that the run is green.
   - On the VPS, `curl -sk --resolve urielpapa.com:443:127.0.0.1 https://urielpapa.com/ | grep G-BL63KG5ZJS` should find the GA4 tag.
   - Re-check a few pages' headers the same way before going further.
4. **Cloudflare zone.** Add `urielpapa.com` to Cloudflare (Free plan). Cloudflare scans the current records; check them against this list, taken from Hostinger's zone on 17 Nov 2026. The domain stays registered at Hostinger (Hostinger operations, UAB): only DNS moves, so the transfer lock stays on and nothing is transferred. DNSSEC is off, so nothing needs disabling first.
   - **Website**, **proxied** (orange cloud). These replace the Vercel records:

     | Type | Name | Value            |
     | ---- | ---- | ---------------- |
     | A    | `@`  | `84.247.153.107` |
     | A    | `www` | `84.247.153.107` |

   - **Mail**, **DNS only** (grey cloud). Hostinger Email and Resend need every one of these:

     | Type  | Name                         | Value                                                  |
     | ----- | ---------------------------- | ------------------------------------------------------ |
     | MX    | `@`                          | `mx1.hostinger.com` (priority 5)                       |
     | MX    | `@`                          | `mx2.hostinger.com` (priority 10)                      |
     | TXT   | `@`                          | `v=spf1 include:_spf.mail.hostinger.com ~all`          |
     | CNAME | `hostingermail-a._domainkey` | `hostingermail-a.dkim.mail.hostinger.com`              |
     | CNAME | `hostingermail-b._domainkey` | `hostingermail-b.dkim.mail.hostinger.com`              |
     | CNAME | `hostingermail-c._domainkey` | `hostingermail-c.dkim.mail.hostinger.com`              |
     | CNAME | `autodiscover`               | `autodiscover.mail.hostinger.com`                      |
     | CNAME | `autoconfig`                 | `autoconfig.mail.hostinger.com`                        |
     | TXT   | `resend._domainkey`          | copy the full `p=…` key from Hostinger's zone          |
     | MX    | `send`                       | `feedback.forge.rmta.net` (priority 10)                |
     | TXT   | `send`                       | `v=spf1 ip4:52.3.252.119 ip4:44.222.39.36 ip4:199.249.231.0/24 ~all` |
     | TXT   | `_dmarc`                     | `v=DMARC1; p=none`                                     |

   - Also open hPanel → Domains → urielpapa.com → DNS / Nameservers → DNS records and copy anything not listed above (for example a verification TXT), since public lookups can't list every record.
5. **Origin certificate.**
   - Under SSL/TLS → Origin Server, create a certificate for `urielpapa.com, *.urielpapa.com`.
   - Save it to `/etc/nginx/ssl/urielpapa.com/fullchain.pem` and its key to `privkey.pem` (chmod 600).
   - Run `nginx -t && systemctl reload nginx`.
   - Set the SSL/TLS mode to **Full (strict)** and turn on **Always Use HTTPS**.
   - Leave Rocket Loader off; it rewrites scripts the CSP expects.
   - The site relies on search engines and AI crawlers and on serving its HTML unmodified, so check these settings on the new zone:
     - Turn off AI crawler blocking and Cloudflare's managed robots.txt (Security → Bots, and Overview → "Control AI crawlers").
     - Turn off Bot Fight Mode.
     - Turn off Email Address Obfuscation (Scrape Shield), which rewrites addresses in the HTML.
     - Set Browser Cache TTL to "Respect Existing Headers" (Caching → Configuration).
6. **Nameservers.** In Hostinger's hPanel, go to Domains → urielpapa.com → DNS / Nameservers → Change nameservers → "Change nameservers" (custom). Replace `lunar.dns-parking.com` and `solar.dns-parking.com` with the two nameservers Cloudflare gives you, and save.
   - Propagation takes minutes to a few hours, and Vercel keeps serving anyone who still has the old answer.
   - Cloudflare emails you once the zone is active. `dig +short urielpapa.com NS` should then show the Cloudflare names.
   - After this, Hostinger's DNS zone editor no longer applies. Make every DNS change in Cloudflare, including any record that Hostinger Email asks for later.
7. **Verify on the live domain.**
   - `curl -sI https://urielpapa.com` shows `server: cloudflare`.
   - Send a test through the contact form.
   - Sign in to the dashboard with Google and run "Refresh search data". Its commit should trigger a deploy, and the dashboard should notice the new `deploy-version.json`.
   - Sign in to Keystatic and save a draft.
   - Mail to @urielpapa.com still arrives.
8. **IndexNow.** Set the GitHub variable `PRODUCTION_HOST=vps`. `deploy-vps.yml` then submits changed URLs and `indexnow.yml` stops.
9. **After a quiet week.**
   - Remove the domain and project from Vercel.
   - Delete the Vercel side of the code: `@astrojs/vercel`, the `DEPLOY_TARGET` switch, the route list in `scripts/vercel-routes.mjs` and `indexnow.yml`.
   - Update the README's "Deploy on Vercel" section.

**Rollback during the switch.** In Cloudflare, point the records back at Vercel, both **DNS only**. These are the values Hostinger had on 17 Nov 2026:

- apex: `A 216.150.1.1`
- `www`: `CNAME c8fd6a59e6a26497.vercel-dns-016.com`

This works as long as the domain is still on the Vercel project.

## What changes compared with Vercel

- **No preview deployments.** To see drafts, run `PUBLIC_SHOW_DRAFTS=true pnpm dev` locally. The on-demand `/preview/blog/<slug>` route still works.
- **No 60-second function limit.** Nginx allows on-demand requests up to 180 s.
- **Edge caching moves to Cloudflare**, which caches `/_astro` and the other static files. HTML is not cached at the edge by default, same as `max-age=0` on Vercel.

## Operations

```sh
# Logs
ssh root@84.247.153.107 journalctl -u urielpapa -f
ssh root@84.247.153.107 tail -f /var/log/nginx/urielpapa.error.log

# Roll back to an earlier release
ssh urielpapa@84.247.153.107 'ls -t /srv/urielpapa.com/releases'
ssh urielpapa@84.247.153.107 'bash /srv/urielpapa.com/releases/<name>/activate.sh <name>'

# Re-run the server setup after changing the unit or vhost
scp deploy/urielpapa.service deploy/nginx/urielpapa.com.conf root@84.247.153.107:/tmp/urielpapa-deploy/
ssh root@84.247.153.107 "bash -s -- '$(cat ~/.ssh/urielpapa_deploy_ed25519.pub)'" < deploy/setup-vps.sh
```
