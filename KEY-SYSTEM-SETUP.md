# Server-side key system setup

The website and Edge Function source code is committed, but GitHub Pages cannot deploy Supabase database migrations or Edge Functions. Complete the setup below in the Supabase project before using the generator.

## 1. Create a Cloudflare Turnstile widget

1. Open https://dash.cloudflare.com/ and choose **Turnstile**.
2. Add a widget for the hostname `haralampos2009.github.io`.
3. Copy its **Site Key** (public) and **Secret Key** (private).
4. In `key-generator.html`, replace `REPLACE_WITH_CLOUDFLARE_TURNSTILE_SITE_KEY` with the Site Key. Commit that change to GitHub.
5. Keep the Secret Key private; only set it as a Supabase secret.

## 2. Create the database tables and functions

1. Open the Supabase project `krractyhrblivsejrpdm`.
2. Go to **SQL Editor → New query**.
3. Copy all of `key-system-migration.sql` from this repository and run it once.
4. If SQL Editor reports an error, stop and fix that error before deploying the Edge Functions.

The `keys` and `key_rate_limits` tables have RLS enabled and no public policies. Never add public read/write policies to these tables.

## 3. Set Edge Function secrets

Create a long random secret for hashing IP addresses. Do not reuse a password. In a terminal with the Supabase CLI installed, run:

```sh
supabase login
supabase link --project-ref krractyhrblivsejrpdm
supabase secrets set TURNSTILE_SECRET_KEY=PASTE_PRIVATE_TURNSTILE_SECRET
supabase secrets set IP_HASH_SECRET=PASTE_A_LONG_RANDOM_SECRET
supabase secrets set KEY_TTL_HOURS=24
supabase secrets set OWNER_USER_ID=PASTE_YOUR_SUPABASE_AUTH_USER_UUID
supabase secrets set ALLOWED_SITE_ORIGIN=https://haralampos2009.github.io
```

Find your Auth user UUID in **Supabase → Authentication → Users**. Never put the Supabase service-role/secret key in HTML, browser JavaScript, Roblox code, or GitHub. Supabase provides the service role environment variable to Edge Functions.

## 4. Deploy the functions

Run from the repository root (the folder containing `supabase/config.toml`):

```sh
supabase functions deploy generate-key --project-ref krractyhrblivsejrpdm
supabase functions deploy check-key --project-ref krractyhrblivsejrpdm
supabase functions deploy owner-keys --project-ref krractyhrblivsejrpdm
```

If the CLI asks for your project database password, enter it in the terminal only; do not send it in chat.

## 5. URLs and Roblox request

The validation URL is:

```
https://krractyhrblivsejrpdm.supabase.co/functions/v1/check-key?key=DS-XXXX-XXXX-XXXX-XXXX&uid=ROBLOX_USER_ID
```

The function is configured with `verify_jwt = false`, so the Roblox `game:HttpGet` request does not need an Authorization header or a user JWT. Do not put a service-role key in the URL. Example success response:

```json
{"valid":true,"reason":"ok","seconds_left":86399}
```

Example invalid response:

```json
{"valid":false,"reason":"not_found"}
```

Expected invalid reasons include `bad_format`, `not_found`, `expired`, `revoked`, `bound_to_other`, and `rate_limited`. The handler returns JSON with HTTP 200 for its normal validation outcomes.

## 6. Owner panel

After deploying `owner-keys` and setting `OWNER_USER_ID`, open:

https://haralampos2009.github.io/Dyserrealm-Script/owner-keys.html

Sign in with the configured owner account. The Edge Function checks the authenticated user's UUID server-side before allowing search, revocation, or binding reset.

## Notes

- Keys use exactly `DS-XXXX-XXXX-XXXX-XXXX`, with four groups of four uppercase letters/digits.
- Default expiry is 24 hours; `KEY_TTL_HOURS` can be set from 1 to 168.
- Generation is limited to 3 attempts per day by IP and by account. An account's existing active key is returned to that account rather than duplicated.
- Validation is limited to 20 requests per minute per IP. First successful use binds the key to that Roblox UserId.
- IP addresses are hashed with a private pepper before being stored; the raw IP is not stored.
- Do not claim the system is live until the SQL migration and all three Edge Functions are deployed and tested in Supabase.
