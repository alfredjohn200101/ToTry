# Earned access — blocking the way Opal does, and whether it rewires anything

> *"look into locking screentime and doing things the way opal does in terms to help out with
> blocking users things they want to be blocked from such as social media. if they want to go on it
> they must achieve a task or do push ups etc with proof i know apps exist in which the camera turns
> on to log someone do push ups etc. The forced impact of people to do hard things to achieve rewards
> would help rewire someone's need for whats bad for them no?"*

Two questions in there, and they have different answers. **Can we build it: yes, and the hard part is
paperwork, not code.** **Does forcing hard things rewire the wanting: no — and the evidence for what
*does* work is better news for this app than a yes would have been.**

Read `docs/SCREEN-TIME.md` first; this shares its entitlement and inherits all of its limits.

---

## 1. Can we do it? Yes — the same entitlement, one more framework

The lock is real and it is OS-enforced. Three frameworks, all behind the one
`com.apple.developer.family-controls` entitlement that `SCREEN-TIME.md` already costs us:

- **`FamilyControls`** — `AuthorizationCenter.requestAuthorization(for: .individual)`, then
  `FamilyActivityPicker` so the person chooses which apps. **We never learn which apps they picked.**
  The selection is opaque tokens (`ApplicationToken`), not bundle ids — we can shield an app we
  cannot name, which is Apple's whole privacy design here and it suits this app fine.
- **`ManagedSettings`** — `ManagedSettingsStore().shield.applications = tokens`. The shield is
  enforced by the OS, so **force-quitting ToTry does not lift it.** That is the property that makes
  this different from a willpower feature.
- **`DeviceActivity`** — schedules, and the threshold events from `SCREEN-TIME.md`.

The bit that makes it *earned* access rather than a plain block is
**`ShieldActionDelegate`**: when someone taps the secondary button on the shield, our extension
decides what happens. That is the seam Opal uses, and it is where a task would live — the extension
hands off to ToTry, ToTry decides whether the condition is met, and only then does the store clear.

**What it costs, all of it non-code:**

| | |
|---|---|
| Entitlement | Requested per **bundle id and per extension target** — so 2–4 separate Apple forms, not one |
| Timing | Needed for **distribution including TestFlight**. It cannot quietly ride along on a later build; it gates the build |
| Eligibility | A solo developer qualifies — `.individual` authorization is exactly this case |
| Minimum OS | iOS 15 for everything here (only `DeviceActivityReport`, which we are not using, needs 16) |
| Android | Strictly better: `UsageStatsManager` gives real per-app foreground milliseconds |

**Two limits worth designing around now, not discovering later:**

1. **You cannot reliably read back what is currently shielded.** The store persists across launches
   but the API to inspect it is partial. So ToTry must keep its own record of what it shielded and
   when, and treat that record as the truth — the same discipline the app already uses for
   device-local keys like `totry_lock_on`.
2. **It is a statement about a device, not a person.** Like every other entry in that family, it
   **must not sync.** Four written precedents already exist (`totry_push_prefs`, `totry_lock_on`,
   `totry_health_write`, `totry_progress_photos`). A shield restored onto a second phone from the
   cloud is a lock somebody did not set.

---

## 2. Does forcing hard things rewire the wanting?

**No — not on the evidence.** And the honest version of the answer is more useful than a yes.

### What blocking demonstrably does

The strongest study here is a month-long RCT that blocked **all** mobile internet on participants'
phones for two weeks with objective compliance tracking ([PNAS Nexus,
2025](https://academic.oup.com/pnasnexus/article/4/2/pgaf017/8016017)). The results are not small:

- **91% improved on at least one** of mental health, subjective well-being, or sustained attention.
- **71% reported better mental health** afterwards, with the average change in depressive symptoms
  larger than that reported in several antidepressant trials (the authors' own comparison).
- Sustained attention improved by roughly **the equivalent of reversing ten years** of age-related
  decline.

So the block works. That part of the instinct is right.

### But the mechanism is not the block

The same paper's mediation analysis is the finding that matters here: the improvements were
**partially explained by how people spent the freed time** — more in-person socialising, more
exercise, more time outdoors. The gate did not fix anything by being a gate. **It bought hours, and
what filled those hours did the work.**

Nothing in this literature shows that *effort* at the gate — push-ups, a task, proof — is an active
ingredient. Effort raises response cost, which reliably suppresses the behaviour **while the cost is
there**. That is a well-understood effect and it is not the same claim as rewiring a want.

### And over-restriction has a cost of its own

Restrictive blocking can **undermine autonomy and provoke reactance**, which is why people abandon
these tools ([Wellspent RCT](https://mhealth.jmir.org/2026/1/e56824)). And abstinence periods can
produce craving and a **rebound** in the behaviour afterwards. So a harsh gate can buy two good weeks
and then give them back with interest.

### The honest summary

> Effort-gating changes **behaviour while the gate is there**. It does not, on current evidence,
> change the **wanting**. What changes over time is what the freed hours get spent on — and a person
> who does something that matters to them in that hour is the one who comes out different.

---

## 3. Why this is good news for ToTry specifically

Every blocker on the App Store hands you a locked screen **and nothing to do with the next ten
minutes.** They own the gate and none of them own the other side of it. The PNAS mechanism says the
other side is where the entire effect lives.

**ToTry already owns the other side.** The Feeling Door, guided breathing, the urge-surf and
defusion mechanisms, a logged set in Train, a reach-out, The Release off-ramp — all of it is built,
tested, and sitting behind a tab bar. The lock is the commodity here; **the off-ramp is the moat.**

That reframes the feature. It is not "block Instagram until you do push-ups." It is:

> **The shield is how the app gets to be there at the moment it is most useful — and what it offers
> is the thing it is already best at.**

That is also the only framing that survives the soul document. A gate that punishes is a shame-clock,
and this app has a written rule against those. A gate that *meets* someone is the Feeling Door with a
new door.

---

## 4. What to build, in order

**Phase 1 — the shield, with the off-ramp as the unlock (no camera).**
FamilyControls picker → `ManagedSettings` shield on a schedule the person sets → `ShieldActionDelegate`
hands off to ToTry → ToTry offers the thing it already has (a minute of breath, the Feeling Door, a
logged set, a reach-out) → the store clears. The "proof" is **the app's own data**, which it already
records honestly: a completed breath session, a logged set, a check-in. No camera, no pose estimation,
no new trust problem.

**Phase 2 — let the person choose the toll.** Which action unlocks is theirs to set in Settings,
because a toll someone picked is a commitment and a toll imposed on them is reactance. The app already
knows this shape — the Faith dials work the same way.

**Phase 3 — only if asked for.** Camera-verified reps. This is a real product category and it is
heavy: on-device pose estimation, a whole new permission, a whole new failure mode, and **no evidence
that proof-of-effort is the active ingredient.** Do not lead with it.

### What NOT to build

- **A gate with no off-ramp.** That is the commodity product and the one the evidence says produces
  reactance.
- **Punishment framing.** No "you failed", no streak that a lapse destroys. Grace over shame is a
  written rule and this is exactly where it would be easiest to break.
- **Syncing the shield.** Device-local, like its four precedents.
- **Claiming it rewires anything.** The app must not say a thing the evidence does not support. It
  can say, truthfully: *this buys you the hour — here is something to do with it.*

---

## 5. The open question, stated honestly

Whether the off-ramp actually gets *taken* — whether someone met at a shield does the minute of breath
or just waits the timer out — is not something the literature answers, because no one has shipped this
exact shape. It is measurable, though: the app would know its own completion rate. That is the number
to watch after Phase 1, and it should be allowed to kill the feature if it comes back near zero.

---

**Sources**

- [Blocking mobile internet on smartphones improves sustained attention, mental health, and subjective well-being — PNAS Nexus, 2025](https://academic.oup.com/pnasnexus/article/4/2/pgaf017/8016017)
- [Promoting Self-Regulated Social Media Use on Smartphones With a Mobile Intervention App (Wellspent): Randomized Controlled Trial — JMIR mHealth](https://mhealth.jmir.org/2026/1/e56824)
- [Planning a digital detox: a randomized controlled trial to reduce smartphone usage time](https://www.sciencedirect.com/science/article/pii/S0747563225000718)
- [A Developer's Guide to Apple's Screen Time APIs (FamilyControls, ManagedSettings, DeviceActivity)](https://medium.com/@juliusbrussee/a-developers-guide-to-apple-s-screen-time-apis-familycontrols-managedsettings-deviceactivity-e660147367d7)
- [What's new in Screen Time API — WWDC22](https://developer.apple.com/videos/play/wwdc2022/110336/)
- [Apple's Screen Time API has some major issues — riedel.wtf](https://riedel.wtf/state-of-the-screen-time-api-2024/)
- [Open Parent App From ShieldActionDelegate — Apple Developer Forums](https://developer.apple.com/forums/thread/793060)
