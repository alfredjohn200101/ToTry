# ToTry Supabase Setup — Final Steps

## What's done already

✓ Edge Function `ai-proxy` deployed
✓ Anthropic API key added as secret
✓ Database tables, RLS policies (run via Supabase AI)
✓ Email OTP auth ready

## What you need to do in Supabase Dashboard

### 1. Set the model environment variable (Edge Function secrets)

Go to: **Project Settings → Edge Functions → Manage secrets**

Add a new secret:
- Name: `ANTHROPIC_MODEL`
- Value: `claude-sonnet-4-6`

This means anytime Anthropic releases a new model (e.g. claude-sonnet-4-7), you just change this value to upgrade the entire app's AI — no code deploy needed.

### 2. Re-deploy the Edge Function

If you haven't already updated to the new version that reads `ANTHROPIC_MODEL` from env, paste the latest `ai-proxy/index.ts` to your Supabase AI and ask it to redeploy.

### 3. Configure auth redirect URLs

Go to: **Authentication → URL Configuration**

- Site URL: `https://alfredjohn200101.github.io/ToTry/`
- Redirect URLs: Add `https://alfredjohn200101.github.io/ToTry/**`

### 4. Customize the OTP email template

Go to: **Authentication → Email Templates → Magic Link**

Replace the body with:

```
Your ToTry sign-in code is: {{ .Token }}

Enter this 6-digit code in the app to sign in.

Or tap this link instead: {{ .ConfirmationURL }}

This code expires in 1 hour. If you didn't request this, ignore this email.
```

## Testing checklist

1. Open the app → should show email entry screen
2. Enter your email → check inbox for OTP
3. Type the 6-digit code → should sign you in
4. Complete onboarding (apps → name → identity → season → vices)
5. Open Coach → type a message → AI should respond
6. Sign out from Settings → should log out
7. Sign in again with same email → all your data should restore from cloud

## Future model upgrades

When Anthropic releases a new model:
1. Go to Supabase Dashboard → Settings → Edge Functions → Manage secrets
2. Update `ANTHROPIC_MODEL` value (e.g. from `claude-sonnet-4-6` to `claude-sonnet-4-7`)
3. No need to re-upload anything to GitHub. All users get the new model on next AI call.

## Cost monitoring

- Supabase: free tier covers ~50,000 active users
- Anthropic API: pay-per-use, approx $0.003-0.01 per message
- For a typical user using the Coach 5x/week = ~$0.10/month

Set a billing cap in Anthropic console at $10/month to start. Increase as you grow.
