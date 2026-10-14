# App Store Connect — the fields you fill in, and why

Everything here is derived from the code, not from memory. Where a claim is checkable,
the check that holds it is named. Re-derive rather than trust this file if it is old —
that failure mode is recorded in CLAUDE.md twice.

---

## 1. App Review Information → Notes  ← **PASTE THIS. It is the one that prevents a rejection.**

> **You do not need an account to review this app.**
>
> On the sign-in screen, tap the button reading **"Something's pulling at me right now →"**.
> That is the no-account path: it opens the full app immediately with everything saved on the
> device. Sign-in exists only to sync between devices, and it is a code emailed to the address
> you enter — so an account would not help you here.
>
> The button is worded that way on purpose: the app is for people in a bad moment, and
> "continue as guest" is not the sentence they need to read first.
>
> If you would rather sign in, email **totrybyaj@gmail.com** and I will create an account and
> send you the code within the hour.
>
> **Health data:** HealthKit is read-only for steps, energy, workouts, heart rate, mindful
> minutes and sleep, to save manual logging. It is never used for advertising and never sold.
> The app works fully without granting it.
>
> **Shared content:** community food and exercise *names* are pre-moderated — nothing is shown
> to anyone until approved, and anything flagged is withheld. Settings → **Report shared
> content** lets any person report an item, which reaches me directly.
>
> **Crisis handling:** the app detects disclosures of self-harm across 57 text entry points and
> shows verified local helplines rather than attempting to counsel. It states in several places
> that it is not medical advice and is not a substitute for a real person.

**Sign-In Required toggle: NO.** Guest mode is a real, complete path.

---

## 2. The answers, with the evidence

| Field | Answer | Why / where it is enforced |
|---|---|---|
| Account deletion in-app | **Yes** | Settings → Delete account permanently (`deleteAccount()`); it refuses to claim a server delete it could not reach |
| Sign in with Apple required? | **No** | Email OTP only; Google sign-in is deliberately disabled, so 5.1.1(iv) is not triggered |
| Export compliance | **No non-exempt encryption** | `ITSAppUsesNonExemptEncryption = false` in Info.plist — upload will not re-ask |
| Third-party content | **Yes, pre-moderated** | `pullSharedLibrary` requires `approved:true` **and** `flagged:false` |
| Report mechanism | **Yes** | Settings → Report shared content → the `feedback` queue, tagged `content_report` |
| Contact | totrybyaj@gmail.com | Published in-app, in Settings |
| Privacy policy | https://alfredjohn200101.github.io/ToTry/privacy.html | Verified HTTP 200 |

---

## 3. Before you click Upload

- [ ] **Build number.** The archive is **1.0 (9)**. App Store Connect refuses a build number it has
      already seen. If build 9 was ever uploaded, bump `CURRENT_PROJECT_VERSION` to 10, re-archive
      and re-verify. Nothing local can tell you this — only Connect can.
- [ ] **Screenshots.** Lead with the Feeling Door. See §4.
- [ ] **Age rating.** The app covers alcohol, gambling and pornography as things a person is
      fighting, and handles suicide disclosure. Answer the questionnaire honestly on
      "Frequent/Intense" vs "Infrequent/Mild" rather than guessing low — a wrong rating is a
      removal after approval, which is worse than a higher rating now.
- [ ] `npm run preflight` — must end "ready to archive" with no warnings.
- [ ] Verify the **IPA**, never the archive: the archive is Development-signed because the export
      re-signs it. Check `Apple Distribution`, `get-task-allow = false`, arm64, and that the web
      bundle sha matches the repo.

---

## 4. Screenshots

**Order matters — the first image is most of the decision.**

1. **The Feeling Door** — "What are you feeling?" with the ten chips. This is the product in one
   frame and it should lead.
2. Today / the day's shape
3. Nourish
4. Money / Stewardship

Avoid: any frame where a row is bisected by the floating tab bar, and any Settings screen.
Sizes accepted: **6.9" 1320×2868** and **6.5" 1242×2688**; at least one per size, up to 10.
