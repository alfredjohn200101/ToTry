# Four production edge functions were not under version control

Found 22 Oct 2026 while investigating a reminder-timing complaint. The Supabase project has
**seven** ACTIVE edge functions; `supabase/functions/` held **three**. The four missing ones were
running in production, serving real users, with their only copy inside Supabase:

| slug | version | what it does |
|---|---|---|
| `send-push` | 20 | the web-push sender, fired every 15 min by the `totry-push-reminders` pg_cron job |
| `send-feedback-email` | 16 | forwards a `feedback` row to the owner via Resend |
| `google-health-auth` | 26 | Google Health OAuth exchange |
| `strava-oauth` | 17 | Strava OAuth exchange |

`send-push` is the one that mattered: the repo's own notes had concluded that the PWA could not
deliver background reminders at all, *because the sender was not in the repo to be found*. It had
been delivering them — an hour late — the whole time.

They are pulled in now so the repo is the record. **They are NOT automatically deployed**: a file
here and the running version can drift, exactly as a stale archive and the current bundle can, so
verify with `list_edge_functions` / `get_edge_function` before assuming this directory is what is
live.
