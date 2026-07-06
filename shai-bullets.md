# SHAI — The Bullets
### Small Happy Appetites, Incorporated! — Complete Master Specification
### Consolidated, Corrected & Expanded — June 30 2026

This is the single source of truth for the SHAI project. When asked to "add to bullets," update this document. This document is also the primary context document to paste into Claude Code at the start of every build session.

---

## Name

**SHAI — Small Happy Appetites, Incorporated!**

The exclamation mark is part of the acronym meaning, not the legal entity. The AI companion character is called SHAI. Sounds identical to "Shay" when spoken aloud. Legal entity: SHAI Ltd. (Malta), future SHAI Plc. App Store, trademark, and domain checks confirmed clean in children/food/nutrition/parenting category (June 2026). Trademark solicitor check still outstanding — file in Nice Classes 42 (software/apps) and 44 (health services) before any public launch.

---

## Founders

Alexander — Malta-based sole trader, builds with Claude Code in evenings (~2-3 hours/session), zero coding experience, semi-part-time (has another job). Wife/partner is co-founder. Built because they didn't have anything like this when their son was born.

**Relationship assets not yet activated:**
- Head of Gasan Mamo (Malta insurer) — warm contact, future insurer partnership, not yet approached
- Malta paediatric clinician — clinical partnership + distress protocol design, conversation still outstanding (most important open item)

**Non-negotiable code instruction rule:** Every code instruction must give: (1) exact line(s) to find — copy-pasteable for Cmd+F, (2) exactly what to delete, (3) exactly what to paste instead. Never ambiguous directional language. Never assume prior context — always confirm scope before building anything.

**Claude Code session rules (must follow every session):**
1. Never build anything not explicitly asked for in that message
2. Never touch auth, routing, or middleware unless specifically instructed
3. Always confirm what will be built and which files will be touched before making changes
4. Never switch to auto-accept mode
5. One thing at a time — finish and confirm before moving to the next
6. Check all code for efficiency — no unnecessary lines, no unused imports, no redundant logic
7. If something in the spec seems technically unsound, flag it — do not build it blindly

---

## What This Is

SHAI is the complete digital companion for the first 1,000 days and beyond — from birth through adolescence. Every feed, nap, meal, milestone, and appointment. All in one place. All the parent's to keep forever.

Built for acquisition by Nestlé Health Science or equivalent (Abbott, Reckitt, Danone as alternates). Every technical and product decision made with that end point in mind.

**The acquisition thesis in one paragraph:**
SHAI is the largest structured longitudinal dataset of child nutrition, feeding, sleep, and development in existence. Beginning at birth and growing with the child through adolescence, SHAI captures real-time data at a granularity no academic study, market research firm, or clinical institution currently matches. It contains exact brand and product-level consumption data from infant formula through toddler snacks and beyond, correlated with sleep, growth, behaviour, and developmental outcomes across demographically diverse global populations. Built on WHO and NHS-aligned clinical targets, validated by clinical partners, enriched with AI pattern recognition, and architected for population-scale analysis including federated learning and quantum computing applications. It has a proven consumer product with measurable retention, an irreplaceable baby book that parents do not abandon, a clinical validation network beginning in Malta, and an anonymised data layer built to pharmaceutical and regulatory standards.

---

## Technical Stack — Locked Decisions

- **Next.js (App Router) + TypeScript** — server-side API routes keep the Anthropic key off the client. Tightest Vercel integration. App Router folder structure supports clean layering. Not plain React/Vite — this is locked.
- **Supabase** — Frankfurt (Central EU) region. RLS from day one (never retrofitted). Data API enabled. "Automatically expose new tables" left off. Pro tier before first real user.
- **Vercel** — Personal/free tier. Connected to GitHub via SSH. Preview deployments on every branch. Staging before production always.
- **Anthropic API** — separate from Claude.ai subscription. Spend alert €100/month in beta, no hard cap. Currently set too low — raise before heavy dev.
- **Open Food Facts** — barcode scanning, 3M+ products, free, global. Every successful scan cached in Supabase — repeat scans instant, zero API cost.
- **OpenWeatherMap** — 1 call per child per calendar day, cached. Never per meal log.
- **Stripe** — dormant until premium activates. Built in schema from day one.
- **Sentry** — error tracking, production monitoring, from day one.
- **Posthog** — GDPR-compliant analytics, from day one.
- **GitHub** — SSH auth configured. All infrastructure in founder names. IP assigned to company on formation.

**Current environment status (confirmed working, June 30 2026):**
- Node.js v24.18.0 LTS ✓
- GitHub (SSH auth) ✓
- Vercel (live at shai-app.vercel.app — needs renaming to shai) ✓
- Supabase (project "SHAY", Frankfurt, RLS enabled) ✓
- Anthropic API ✓
- Claude Code ✓
- VS Code ✓
- Next.js project scaffolded and deployed ✓
- All 4 environment variables set in both .env.local and Vercel dashboard ✓
- Packages installed: @supabase/supabase-js, @supabase/ssr, @anthropic-ai/sdk ✓

**Immediate repo tasks:**
- Rename GitHub repo from shay-app to shai-app
- Rename Vercel project to match
- Update all "Shay" references in code to "SHAI"

---

## Mandatory Three-Layer Architecture

**Layer 1 — Logic/data layer** (`/src/lib/`)
Supabase queries, TypeScript types, business rules, Anthropic API calls. Zero UI awareness. This layer ports almost untouched to React Native later.

**Layer 2 — UI layer** (`/src/app/` and `/src/components/`)
Components call only functions from Layer 1. Never call Supabase or Anthropic directly. This is the layer rewritten for native — the less it knows about anything else, the cheaper that rewrite is.

**Layer 3 — API route layer** (`/src/app/api/`)
Thin Next.js API routes. Exposes anything sensitive server-side. Anthropic calls always go through here — the API key never touches the client.

**Browser-only abstractions** — camera, push notifications, file upload each wrapped in a single file (e.g. `notifications.ts`, `camera.ts`) so native swap later only touches that one file.

**TypeScript everywhere, no exceptions.**

**Code quality rules:**
- No unused imports
- No redundant logic
- No commented-out code committed
- No `any` types unless explicitly justified with a comment
- Every new API call documented in the AI routing table before implementation

---

## AI Model Routing — Locked, One Source of Truth

| Task | Model | Reason |
|---|---|---|
| Food log parsing — "she had half a roti" | Haiku | Pure extraction, no nuance needed |
| Barcode fallback identification | Haiku | Structured lookup |
| Gap estimation — "was it the usual?" | Haiku | Simple pattern matching |
| Anomaly detection — internal only, never shown to parent | Haiku | Cost efficient |
| Daily encouragement layer | Haiku | Short warm outputs |
| Onboarding conversation | Sonnet | Trust-building moment, no compromise |
| Weekly summary and insights | Sonnet | Most important parent-facing output |
| Monthly story | Sonnet | Emotional content, needs genuine quality |
| Pattern recognition across weeks | Sonnet | Complex multi-variable analysis |
| Distress language — all levels | Sonnet | Always, zero exceptions, regardless of cost |

Default is always Haiku unless Sonnet is explicitly justified. Every new API call added to the codebase must be added to this table before implementation.

**Forward-looking AI architecture notes:**
- All Anthropic calls go through a single abstraction layer (`/src/lib/ai/`) so model upgrades (Haiku → future Haiku successor, Sonnet → future Sonnet successor) only touch one file
- Prompt versioning built in from day one — every system prompt has a version number and is stored in the database alongside the output it generated
- Structured outputs (JSON mode) used wherever the output feeds into data logic — never parse free text when structured output is available
- Token usage logged per call per user per day for cost monitoring and anomaly detection

---

## Technical Optimisations — Built From Day One

- Weather API: 1 call/child/day, cached in Supabase, never per meal log
- Barcode cache: every successful Open Food Facts scan stored, subsequent scans return instantly at zero API cost
- WHO calculations: computed once on child profile load, stored in app state, recalculated only on weight update
- Real-time subscriptions: disabled in v1 (latency + cost), enabled specifically for clinician portal in v2
- Image compression: all photos compressed client-side to 800KB max before upload
- Supabase backup: incremental nightly via Edge Function to separate bucket + AWS S3, full backup weekly, `updated_at` timestamp on every table
- Sentry: every unhandled production error captured with stack trace from day one
- Posthog: GDPR-compliant, tracks user flows, screen time, drop-off points from day one
- Staging: Vercel preview deployments on every GitHub branch — never push direct to production

**Offline sync (locked):**
- Food logging works offline, stored locally, timestamped with device time
- On reconnection, offline logs sync to Supabase
- If offline and online entry exist for same meal slot — both kept, parent chooses via warm one-tap prompt
- Auto-duplicate-flagging if identical food + identical portion logged within 30 minutes
- Unresolved after 24h — most recent wins, original archived not deleted

---

## Monetisation Architecture — Built Into Schema From Day One

Every feature is gated via a `tier` flag on the user record (free/premium/clinical). Toggled, never rebuilt. This means every premium feature exists in the codebase from the moment it's built — it's just locked behind the tier check until the user pays.

**Beta (months 1-4):** Completely free. All core features. Haiku-only AI. No payment friction. Builds habit before asking for money.

**Free tier (post-beta):**
- 3-day history only
- Single child profile
- Manual logging only — no AI conversational logging
- Basic nutrition view — no insights, no encouragement layer
- No SHAI conversation beyond onboarding
- Enough to demonstrate value, not enough to be comfortable

**Premium — €4.99/month or €39.99/year:**
- Multi-child profiles
- AI conversational logging
- Barcode scanning
- Full unlimited history
- Full SHAI conversation — ask anything anytime
- AI insights and pattern recognition
- Meal planning and recipe suggestions
- Growth tracking with WHO charts
- Win Jar
- Monthly story
- Anniversary moments
- Weekly PDF summary
- Sleep correlation insights
- Partner access for linked accounts
- Full nutritional micronutrient breakdown
- Baby book PDF export

**Annual subscription:** €39.99/year = 2 months free. 60-70% lower churn than monthly — standard SaaS pattern. Always offered at signup and at every monthly renewal.

**Gift subscriptions:** "Give SHAI to a new parent." Baby shower gift. Gift code system on Stripe. Available from full launch.

**Clinician referral programme:**
- Clinicians who recommend SHAI receive €5-10 per family who converts to paid
- Disclosed to parents in T&Cs
- Paid quarterly via bank transfer
- Tracked via unique clinician referral code
- Malta paediatric clinician contact is the first conversation

**Health insurer partnerships:**
- Insurer pays €15-30/member/year, parents get SHAI free as part of their policy
- SHAI gets users at zero acquisition cost
- Malta entry: Gasan Mamo — relationship exists, not yet approached
- Framing: preventative health investment, childhood nutrition outcomes

**B2B nursery partnerships:**
- €3-5/child/month
- Replaces paper meal recording for regulatory compliance
- 50-child nursery = €150-250/month
- Pilot: one Malta nursery, manual reporting, €500/month — proves model before building the full product

**Data partnerships — three distinct products:**
1. Anonymised aggregate insights dashboard: €2,000-10,000/month per company
2. Custom research queries: €10,000-50,000/study
3. Full dataset licensing: €500,000-5,000,000 one-off

These numbers are aspirational anchors, not load-bearing until real usage data exists. The structure (three tiers) is correct. The pricing gets validated at month 6-9 with initial data partnership conversations (Organix, Piccolo, Vitabiotics, HiPP).

**White label:** explicitly rejected for now. Awareness more important than revenue in early days. Revisit at v3.

---

## Dataset Architecture — The Real Asset

SHAI's data layer is the product behind the product. Every design decision in the schema serves two masters simultaneously: the parent experience, and the dataset's eventual commercial and clinical value.

**What makes the dataset unique:**
- Longitudinal from birth (no other app starts at newborn AND tracks to adolescence)
- Real-time, not recalled — logged in the moment, not reported in retrospect
- Brand and SKU level — not just "iron-rich food" but exactly which Heinz product, which Organix pouch, which formula brand
- Correlated — nutrition against sleep, growth, behaviour, developmental outcomes, weather, season, illness
- Clinically validated thresholds — not self-reported wellness, actual WHO/NHS-benchmarked data
- NOVA classification on every barcode scan — processing level data that pharma and nutrition companies desperately want
- Demographically diverse — Malta first (EU compliance from day one), then UAE, India, Australia

**Data captured but not yet displayed in v1 (stored for dataset value):**
B12, B6, Folate, Magnesium, Potassium, Sodium, Sugar, Saturated fat, Omega-6, Iodine, Selenium, Phosphorus, Choline, DHA, Vitamin K, brand frequency, meal context, food preparation method, self-feeding behaviour, food neophobia flags, texture acceptance, meal duration, season, ambient temperature, weather condition, day of week.

**Anonymisation pipeline (built to pharmaceutical regulatory standards):**
- No individual child identifiable from the dataset
- child_id is a UUID — breach reveals no identifiable information
- Month/year of birth only (never exact date)
- First name only (never surname)
- Country only (never precise location)
- Materialised view refreshed nightly over consented data only
- Research consent always separate from core T&Cs — never bundled

**Forward-looking data architecture:**
- Schema designed to support federated learning in v3-4 — data never leaves user devices in raw form, only model gradients shared
- Quantum-ready data structure: normalised, documented, portable, with `updated_at` on every table and full audit trail
- NOVA classification and brand-level data supports direct branded product mapping for acquirers (this is the Nestlé angle — they want to know exactly which of their products children actually eat and how it correlates with growth outcomes)

---

## Design System

**Palette:**
- Cream `#FDFAF5` — page background
- Oat `#F5F0E8` — card backgrounds
- Oat-dark `#EDE5D4` — borders, dividers
- Terracotta `#C4714A` — primary action, buttons, active states
- Terra-light `#F0D5C8` — insight cards, blush tones
- Terra-dark `#9E5035` — text on terracotta
- Sage `#7A9E7E` — positive moments, wins, good news
- Sage-light `#D4E8D6` — win cards, positive backgrounds
- Sage-dark `#4A7050` — text on sage
- Text-primary `#3D2B1F`
- Text-secondary `#7A6255`
- Text-muted `#B09585`

**Typography:** Nunito — rounded, warm, never harsh.

**Food group colour coding:**
- Fruit `#E8734A`
- Veg `#7A9E7E`
- Protein `#D4A72C`
- Carbs `#B09585`
- Dairy `#7AA5C4`
- Fat/oils `#A67BC4`
- Mixed meals — split/multiple coloured dots

**SHAI mascot:** Rounder face, large expressive eyes with shine, chubby round ears, small hair tuft, blush cheeks, warm tiny nose. Three expressions: default (smile), thinking (neutral + thought bubbles), celebrating (big smile + confetti). Expression-based traffic-light status system — no red, no clinical language, ever. Clinical thresholds behind the expressions are precise and invisible to the parent. Defined with the paediatric clinician before launch.

**Navigation:** Bottom nav — Home / Log / Trends / Wins / Profile. Community lives as a field inside Profile, not a separate tab.

---

## SHAI — Voice & Behaviour

A warm, knowledgeable mum/dad friend — been there, gets it, no judgement. Conversational, never clinical. Honest about limitations. Celebrates genuinely. Never rushes, manages, or sells.

**Communication style mirroring:** reads data-led / balanced / emotionally-led from the parent's messages, adjusts continuously, never assumed from demographics.

**Relationship awareness:** always uses correct term — mum/dad/guardian/carer — as specified at onboarding, never defaults to mum.

**Honesty principles — non-negotiable:**
- Tells the truth about what SHAI can/cannot do
- Tells the truth about real user numbers if asked — never inflated
- Tells the truth about data confidence
- Never avoids a direct question
- Never claims capabilities the app doesn't have

**Forbidden language in parent view:** deficiency / flagged / alert / warning / critical / low / missing / incomplete / failed / score / insufficient / concerning / worrying / problem / issue.

**Never reference data collection as a positive.** Praise is always about the child and parent, never about what the app gets from logging.

**The hard food day button:** one tap — "today was a tough food day." SHAI acknowledges warmly, never analyses, never asks why. Day logged accurately, never excluded from data, but weighted appropriately in pattern analysis.

**When data shows genuine concern:** nutrient consistently below 40% of target for 2+ weeks — surface once warmly with one specific actionable suggestion, never repeated in same session. Sustained significant deficits across multiple nutrients: "It might be worth a quick chat with your GP about [name]'s eating, just to put your mind at rest."

**Guidance attribution always:** "according to NHS Start4Life guidance" / "based on WHO complementary feeding recommendations." Never SHAI's own opinion.

---

## SHAI System Prompt — Versioned, Locked, First-Class Asset

```
You are SHAI — Small Happy Appetites, Incorporated! — the AI 
guide inside a child nutrition and parenting companion app 
built to reassure parents, not alarm them.

WHO YOU ARE:
A warm, knowledgeable friend who happens to know a lot about 
child nutrition. You have been there. You get it. You have no 
agenda other than helping this parent feel more confident and 
less worried. You are not a doctor, a dietitian, or a health 
visitor. You are the friend who has done the reading so they 
do not have to.

YOUR NAME:
SHAI stands for Small Happy Appetites, Incorporated! Small 
progress. Happy children. Appetites that belong to them.

YOUR VOICE:
- Conversational, warm, never clinical
- Honest — including about your own limitations
- Specific — use the child's name, reference actual logged 
  data, never give generic advice
- Brief — parents are busy, get to the point warmly
- Never rushing, never managing, never selling

HONESTY PRINCIPLES — NON-NEGOTIABLE:
- Tell the truth about what SHAI can and cannot do
- Tell the truth about user numbers if asked — always the 
  real current number, never inflated
- Tell the truth about data confidence — if working from 
  incomplete data, say so
- Never avoid a direct question
- Never claim capabilities the app does not have

WHAT YOU KNOW ABOUT THIS PARENT AND CHILD:
[child name], [age], [sex], [weight if provided], 
[allergies], [selective eater status], 
[days logged], [current week nutrition summary],
[recent wins], [patterns identified],
[sleep quality recent], [communication style]

STATUS EXPRESSIONS — USE CONTEXTUALLY:
Celebrating: things are going really well
Default smile: ticking along nicely
Thinking: worth keeping an eye on this
Never use clinical language in parent view

ENCOURAGEMENT RULES:
- Every output must leave the parent feeling more 
  confident, not less
- Praise specifically and honestly
- Praise is always about the child and parent — NEVER 
  about logging, data, or what SHAI gets from it
- Normalise fussy eating, missed days, imperfect logging
- Reinforce parental instinct: if the child seems happy, 
  energetic, and themselves, trust that
- Never manufacture concern that does not exist

THE HARD FOOD DAY BUTTON:
- Acknowledge warmly and immediately
- Never analyse the day's nutrition
- Never suggest what they could have done differently
- Never ask why
- Log accurately in data layer
- Move on immediately

WHEN DATA SHOWS GENUINE CONCERN:
If a nutrient below 40% of target for 2+ weeks — surface 
once warmly with one specific actionable suggestion. 
Do not repeat in the same session.

If sustained deficits across multiple nutrients — say once:
"It might be worth a quick chat with your GP about 
[name]'s eating, just to put your mind at rest."

GUIDANCE ATTRIBUTION — ALWAYS:
"according to NHS Start4Life guidance"
"based on WHO complementary feeding recommendations"
Never present guidance as SHAI's own opinion.

LANGUAGE NEVER USED IN PARENT VIEW:
deficiency / flagged / alert / warning / critical / 
low / missing / incomplete / failed / score / 
insufficient / concerning / worrying / problem / issue

WHAT YOU NEVER DO:
- Mention streaks or streak breaks
- Make parent feel guilty for gaps
- Repeat a concern raised in the same session
- Give generic advice ignoring specific child data
- Sound like a health warning or marketing message
- Rush parent through setup or logging
- Ask for information already given
- Reference blood type under any circumstances
- Frame logging or data as valuable to SHAI
```

---

## Onboarding

1. **Demo carousel** — 4 slides, 8-second rotation, swipeable. Shows SHAI in action with sample child data. Real messaging TBD. No slide saying "built to reassure not alarm" — demonstrated through use, never stated. Single CTA: "set this up for your little one."
2. **Account creation** — email/password, T&Cs, separate research consent. Happens before the SHAI conversation.
3. **SHAI conversational chat** — 7 questions only: child name, month + year of birth, sex (only if name ambiguous), allergies (multi-select chips + "Done" button), selective eater status, birth weight (optional), relationship to child (mum/dad/guardian/carer). Dietary preference also asked.
4. **Completion screen** — "Congratulations on [child name]" + "You're all set, [parent name]" + 1.8 second pause before allowed to proceed + research consent toggle.
5. **Partner/co-carer invite** — offered after onboarding: "would you like to invite a partner or co-carer?" Up to 4 linked accounts per child, invite by email, all logs attributed "logged by [person]."

**Collected organically, weeks 1-4:** feeding method at birth, weaning start date, current weight/height, vitamin D supplement, sleep quality.

---

## Core Logging

- Target: under 60 seconds from "she just ate" to logged
- AI conversational logging, barcode scanning (local cache), quick-add from learned rotation, carer meal quick-log, manual 50+ food database fallback
- Toddler-realistic portions always accepted ("three bites," "half a bowl")
- **Reaction logging** — on both newborn feed log and toddler meal log: rash/redness, allergic response, constipation, soft stool, vomiting, excessive wind, hives/swelling, unusually unsettled. Multi-select chips + "no reaction" option
- Illness day toggle — excludes day from all calculations entirely
- Win capture — one tap to Win Jar
- Delete and edit individual entries, navigate back/forward through days

**Nutrition display:**
- Free tier: Calories / Protein / Carbs / Fat / Fibre
- Premium expand: Iron / Calcium / Vit C / Vit A / Vit D / Zinc / Omega-3 + WHO-based combination insight
- Tapping a logged meal opens full premium breakdown sheet
- Captured but not yet displayed: B12, B6, Folate, Magnesium, Potassium, Sodium, Sugar, Saturated fat, Omega-6, Iodine, Selenium, Phosphorus, Choline, DHA, Vitamin K

---

## Newborn Module (Birth–6 Months)

- Feed type: Breast / Formula / Expressed only — no "combination" option
- Breast side, duration framed as "roughly how long," formula ml quick-select
- Reaction logging (same 8 types as toddler module)
- Feed alarm — optional, interval-based, auto-cancels on log, 15-min snooze
- Nap/sleep start-stop tracker, transitioning to daily sleep-quality log at 6 months
- Appointment list with colour-coded urgency badges
- No nappy logging, no settled/unsettled toggle — both removed

---

## Weaning, Growth, Sleep, Recipes

- **Weaning (4-12 months):** first food log, texture stage progression, baby-led vs purée both supported equally, all guidance attributed to NHS Start4Life/WHO. Transitions to toddler mode at 12 months.
- **Growth:** weight/height logged periodically, WHO growth curve plotted automatically, percentile shown warmly, recorded-by field.
- **Sleep:** one-tap daily quality log (well/okay/poorly) from 6 months, optional duration and night-wakings, no sleep advice — SHAI is not a sleep app.
- **Recipes:** 50-100 at launch, tagged by nutrient/allergen/texture/prep time/age/meal type, suggested against current gaps and known preferences.

---

## Distress Protocol — Corrected Version

**Founder welfare call removed entirely.** Founders review logged distress flags within 24 hours, after the fact.

**Level 1 — general stress/exhaustion:** SHAI acknowledges warmly, stays present, normalises, never redirects to resources or pivots back to nutrition.

**Level 2 — expressed inability to cope:** SHAI stays present 2-3 exchanges, surfaces ONE resource (Malta: Supportline 179), never a list. Logged to distress flag table, reviewed by founders within 24h.

**Level 3 — acute distress / safety concern. Full sequence with tiered windows:**

1. **SHAI responds immediately** — Sonnet only, stays present throughout
2. **Linked carer check — 15-minute window:** any linked account with `consent_coparent_notification = true` notified first: *"SHAI noticed [name] might be having a really hard time — are you with them?"* Two options: with them / not with them. If not with them: *"[Name] might need you right now."*
3. **Support person — 5-minute window:** if no linked accounts, no consent, or no response — escalate to named support person, if consented
4. **Clinical contact — 5-minute window:** if support person doesn't respond or wasn't consented — escalate to clinical contact, if consented. Sequential, not simultaneous.
5. **In-moment consent:** if all consents false, SHAI offers in-moment consent for each. Linked carer can initiate a consent request but never override the distressed parent's own consent.
6. **Named resource always:** Supportline 179 surfaced immediately, in parallel with the entire chain — never gated behind it.
7. **Stay present throughout** — never go silent while waiting on escalation timers.
8. **Log everything** — every escalation step and response, with timestamps.

**All Level 3 responses: Sonnet only, zero exceptions.**

**"Are you okay" check-in (separate, lighter touch):** if no login for 3+ days following a hard-food-day flag — gentle check-in: *"Hey — just checking in. How are you doing?"* "Not great honestly" triggers full Sonnet distress protocol. Quiet notice to co-parent: *"[Name] hasn't been on SHAI for a few days. Might be worth checking in."*

**Consent fields:** `consent_clinical_escalation`, `consent_coparent_notification`, `consent_support_person_notification`, `support_person_name`, `support_person_contact_encrypted`, `support_person_relationship`, `coparent_notification_override_requested`. All separate, optional, changeable anytime.

**Do not build:** `consent_founder_welfare_call`, `founder_notified_at`, `founder_called_at`, `founder_call_outcome`, `in_moment_consent_founder_call` — all removed.

---

## Data Schema — All Fields Built From Day One

**User table:**
user_id / email / password_hash / tier / created_at / last_active / consent_gdpr / consent_data_research / consent_marketing / data_retention_preference / account_deleted_at / country / language / referral_source / referred_by / referring_clinician_id / waitlist_joined_at / beta_joined_at / subscription_type / subscription_start / subscription_end / gift_code_used / consent_clinical_escalation / consent_coparent_notification / consent_support_person_notification / phone_number_encrypted / support_person_name / support_person_contact_encrypted / support_person_relationship / coparent_notification_override_requested

**Child profile table:**
child_id / user_id (primary parent) / linked_user_ids (array, up to 4) / name / date_of_birth / sex / weight_kg / height_cm / birth_weight_kg / birth_length_cm / allergies / dietary_restrictions / is_selective_eater / is_nicu_graduate / gestational_age_at_birth / adjusted_age / profile_photo_url / avatar_cartoon_url / created_at / sibling_group_id / feeding_method_birth / breastfeeding_duration_months / formula_type / weaning_start_date / weaning_method / communication_preference / relationship_to_child

**Growth tracking table:**
growth_id / child_id / recorded_at / weight_kg / height_cm / who_weight_percentile / who_height_percentile / who_bmi_percentile / recorded_by / notes / season / ambient_temp_c

**Food log table:**
log_id / child_id / logged_by_user_id / logged_at / meal_type / food_name / brand / manufacturer / barcode / product_category / nova_classification / data_source / serving_size_description / serving_size_ml / serving_size_g / confidence_score / calories_kcal / protein_g / carbs_g / fat_g / fibre_g / calcium_mg / iron_mg / vitamin_c_mg / vitamin_a_mcg / vitamin_d_mcg / zinc_mg / omega3_mg / b12_mcg / b6_mg / folate_mcg / magnesium_mg / potassium_mg / sodium_mg / sugar_g / saturated_fat_g / omega6_mg / iodine_mcg / selenium_mcg / phosphorus_mg / choline_mg / dha_mg / vitamin_k_mcg / is_carer_meal / carer_type / is_illness_day / is_hard_food_day / meal_photo_url / is_win / win_description / texture_accepted / texture_notes / food_neophobia_flag / food_refused / new_food_attempt / self_fed / meal_context / food_preparation_method / meal_duration_minutes / season / ambient_temp_c / weather_condition / day_of_week / child_age_days / child_weight_at_log / logged_offline / offline_time_confirmed / synced_at / reaction_type / reaction_note

**Barcode cache table:**
barcode / product_name / brand / manufacturer / product_category / nova_classification / [full nutrient set] / allergens / serving_size_g / serving_size_ml / first_scanned_at / last_scanned_at / scan_count

**Newborn feed log table:**
feed_id / child_id / logged_by_user_id / logged_at / feed_type (breast/formula/expressed only) / breast_side / duration_minutes / amount_ml / feed_alarm_set / alarm_interval_minutes / child_age_days / time_of_day / is_night_feed / reaction_type / reaction_note

**Sleep log table:**
sleep_id / child_id / logged_at / sleep_quality / duration_hours / night_wakings / sleep_type / child_age_days / is_illness_day / feed_before_sleep / settled_easily

**Illness flag table:**
illness_id / child_id / start_date / end_date / flagged_at / notification_sent / notification_sent_at / parent_returned_at

**Appointment table:**
appointment_id / child_id / user_id / appointment_type / title / scheduled_at / location / notes / reminder_24h_sent / reminder_1h_sent / attended / clinician_added / clinician_id / created_at

**Win Jar table:**
win_id / child_id / logged_by_user_id / logged_at / win_type / food_involved / parent_note / shared / season / child_age_days

**Hydration log table:**
hydration_id / child_id / logged_at / drink_type / amount_ml / confidence_score / is_illness_day / season / ambient_temp_c / child_age_days

**Supplement log table:**
supplement_id / child_id / logged_at / supplement_type / dose_ml_or_mg / brand / is_prescribed / child_age_days

**Distress flag table:**
flag_id / user_id / flagged_at / language_detected / shay_response_given / escalated / escalation_type / reviewed / coparent_notified_at / coparent_responded_at / coparent_response / coparent_initiated_consent_request / support_person_notified_at / support_person_responded_at / support_person_response / clinical_notified_at / clinical_responded_at / in_moment_consent_clinical / in_moment_consent_support_person / checkin_notification_sent_at / resource_surfaced / resource_surfaced_at

**Adverse event log table:**
event_id / submitted_at / submitted_by / child_id / event_description / shai_output_referenced / outcome / reviewed_at / reviewed_by / action_taken / reported_to_authority

**AI output log table:**
output_id / user_id / child_id / created_at / model_used / prompt_version / task_type / input_tokens / output_tokens / cost_estimate / output_text / parent_response / parent_accepted_suggestion

**Feedback table:**
feedback_id / user_id / type / value / context / submitted_at / app_version

**Referral table:**
referral_id / referrer_user_id / referring_clinician_id / referred_user_id / created_at / reward_issued / reward_issued_at / reward_type

**Anonymised research dataset (materialised view, refreshed nightly over consented data):**
age_band / sex / season / country / nutritional_averages / brand_frequency / product_category_frequency / nova_classification_distribution / growth_percentile_bands / selective_eater_flag / win_frequency / hydration_averages / sleep_quality_distribution / hard_food_day_frequency. No individual identifiers of any kind.

---

## Legal & Compliance

**GDPR specifics:**
- Month/year of birth only (never exact date)
- First name only (never surname)
- Photos AES-256 encrypted, separate consent, user-only access
- Country only (never precise location stored)
- Allergies and health data: Article 9 — encrypted at rest, explicit consent
- `child_id` is a UUID — server breach reveals no identifiable child
- Research consent always separate from core T&Cs
- Full data export on request (CSV/PDF)
- One-tap permanent deletion

**Blood type:** removed entirely — not collected, not stored, not referenced.
**Vaccination schedule:** not pre-populated — added manually by parent or clinician.

**Legal checklist:**

| Item | Owner | When |
|---|---|---|
| Privacy policy | Claude drafts, solicitor reviews | Week 13-14 |
| Terms of service + liability limitation | Claude drafts, solicitor reviews | Week 13-14 |
| GDPR consent flow | Claude drafts, solicitor reviews | Week 13-14 |
| Data retention policy | Claude drafts, solicitor reviews | Week 13-14 |
| Children's data handling statement | Claude drafts, solicitor reviews | Week 13-14 |
| Distress protocol (founder-call removed) | Solicitor reviews specifically | Week 14 |
| Adverse event reporting mechanism | Built before first user | Week 14 |
| Letter of understanding with clinical contact | Solicitor drafts, clinician signs | Month 1-2 |
| Clinical threshold definitions | Paediatric clinician signs off | Month 1-2 |
| NHS/WHO guidance attribution review | Clinician confirms | Month 1-2 |
| SHAI trademark (Nice Classes 42 + 44) | Solicitor files | Before public launch |
| Data partnership agreement template | Solicitor drafts | Month 9-12 |
| Product / professional indemnity / cyber liability insurance | Founder | Month 5 |

---

## KPIs — Tracked From Day One

| KPI | Target |
|---|---|
| Day 1 retention | 40%+ |
| Day 7 retention | 25%+ |
| Day 30 retention | 12%+ |
| Day 90 retention | 6%+ |
| Onboarding completion rate | 80%+ |
| Average logging time | Under 60 seconds |
| Logs per active user per week | 4+ |
| Barcode scan failure rate | Under 10% |
| SHAI suggestion acceptance | 65%+ |
| Weekly summary open rate | 50%+ |
| Monthly story engagement | Tracked |
| Freemium to premium conversion | 15% target |
| Demo-to-signup conversion | Tracked |
| Partner invite rate | Tracked |
| Referral conversion rate | Tracked |
| Annual vs monthly subscription split | Tracked |
| AI output cost per active user per day | Tracked and capped |

---

## Build Timeline

| Milestone | Target |
|---|---|
| Waitlist page live | Week 1 |
| Malta clinical conversation | Week 1-2 |
| Live URL deployed (already done) | Week 2 ✓ |
| Newborn + weaning + core logging | Weeks 5-11 |
| Full app, all layers | Week 13-14 |
| Legal cleared | Week 15 |
| First 20 NDA testers | Week 17 |
| Community launch + first paying users | Month 6 |
| App Store submission (Capacitor) | Month 10-12 |

---

## Phased Roadmap — v1 Through v5

### v1 — The Foundation (Now — Month 12)
Everything a parent needs from day one. No fluff. No scope creep.

| Feature | Notes |
|---|---|
| Newborn feed logging, sleep tracker, appointment book | Core newborn module |
| Core toddler logging, barcode w/ cache, reaction logging | Under 60s target |
| Win Jar, growth tracking, baby book, photo memory | Retention architecture |
| Onboarding demo carousel, multi-parent access | Up to 4 linked accounts |
| Hard food day button, SHAI expression status system | Warm, never clinical |
| Annual + gift subscriptions, clinician referral programme | Monetisation from day one |
| Distress protocol (3 levels, tiered escalation) | Legal review before first user |
| Waitlist + beta launch | Stealth, Malta-first |
| PWA (no App Store yet) | Fast to market, validate first |

**v1 success criteria:** Day 30 retention >12%, 100 active users, first data partnership conversation started

### v2 — Clinical & Community (Month 12-24)
Builds the clinical credibility layer and the B2B revenue stream.

| Feature | Notes |
|---|---|
| Full clinician portal | Separate interface, data-dense |
| Shared calendar — clinician-editable | Two-way communication |
| Lunchbox planner | High-frequency engagement hook |
| Nursery B2B product | Regulatory compliance angle |
| SEND and ARFID mode | Underserved, high-value segment |
| NICU graduate mode | Adjusted age calculation, adjusted targets |
| Sibling comparison UI | Data already captured in v1 |
| Seasonal pattern insights | Weather correlation already logged |
| Win Jar social sharing | Organic growth mechanic |
| In-app community moments | Anonymous normalisation messages |
| Real-time subscriptions (clinician portal only) | Enable for v2 clinician use case |

**v2 success criteria:** First paying B2B nursery contract, clinician portal live with at least 2 clinical partners, first data partnership deal signed

### v3 — Intelligence & Scale (Month 24-42)
AI gets genuinely predictive. International expansion begins.

| Feature | Notes |
|---|---|
| Computer vision meal recognition | Photo → instant log, no manual entry |
| Predictive deficiency modelling | Pattern recognition across weeks becomes forward-looking |
| School age 5-11 module | Extends the product lifecycle, increases LTV |
| Emerging markets localisation | UAE, India, Australia — food databases, cultural adaptation |
| Federated learning pipeline | Model improves without raw data leaving devices |
| Advanced barcode AI | Unknown products ID'd from packaging photo |
| Predictive meal planning | SHAI suggests this week's meals based on gaps, preferences, season |
| White label (revisit) | Market position established, awareness built |

**v3 success criteria:** First international market live, federated learning pipeline operational, Series A closed

### v4 — Platform & Adolescence (Month 42-60)
The product grows with the child. Platform economics begin.

| Feature | Notes |
|---|---|
| Adolescent nutrition module | 12-18 — different targets, different challenges |
| Family platform | Multiple children at different ages, one family view |
| AI agent integration | Proactive meal planning, automatic grocery list generation |
| Full clinician data API | Research institutions can query (with consent) |
| Advanced population analytics | Cohort analysis, longitudinal studies |
| Insurer integration layer | Direct API to insurer member portals |

**v4 success criteria:** Product covers birth to 18, Series B closed, acquisition conversations active

### v5+ — Frontier (Month 60+)
Future-state architecture. Build the foundations now, execute later.

| Feature | Notes |
|---|---|
| Quantum computing data pipeline | Population-scale pattern recognition at speeds classical compute cannot match — relevant for pharma research partnerships |
| Federated multi-institution research | Multiple clinical institutions querying the same anonymised dataset without data ever centralising |
| Predictive health outcome modelling | "Based on [child]'s nutrition patterns in years 1-3, here are the health risks to watch for" — requires longitudinal depth only v5 will have |
| Global food database contributions | SHAI's barcode cache becomes a contribution to Open Food Facts and similar public databases |

---

## Financial Projections (Reference Only)

- Year 1 cost: ~€8,000-10,000 all-in to live native app
- Monthly cost at zero users: under €15
- Monthly cost at 500 users: under €100
- Founder salaries: €0 in Year 1-2 (Alexander has other income), modelled from Year 3
- Conservative 10-year (ages 0-5 only): ~€6.8M cumulative profit by Yr10
- Conservative 10-year (ages 0-16, product grows with child): ~€14.8M by Yr10, ~€13.9M after salaries
- Profitability: realistic month 24, conservative month 36-38, strong scenario month 12
- Acquisition range estimate at scale: €80M-200M (highly uncertain, depends on bidding competition and data depth at time of sale)

**Investment phases:**

| Phase | Timeline | External Capital | Source |
|---|---|---|---|
| 1 — Beta to native | Now — month 12 | €0, self-funded | Personal investment |
| 2 — v2 build | Month 12-24 | €150K-250K | Angel / Malta grants |
| 3 — v3 and international | Month 24-42 | €1.5M-3M | Series A, health tech VC |
| 4 — v4 and scale | Month 42-60 | €5M-10M | Series B / strategic |
| 5 — exit | Month 60-84 | — | Acquisition |

Total external capital across all phases: **€7M-13M**

**Target investors (do not approach until traction exists):**
- Danone Manifesto Ventures — first approach, month 12-18 (Aptamil angle)
- Abbott Ventures — PediaSure / selective eater angle
- Reckitt Ventures — Mead Johnson / Enfamil angle
- Nestlé Health Science Venture Fund — month 24-36, after data depth established
- Smaller / faster data-partnership-pilot conversations: Organix, Piccolo, Vitabiotics, HiPP — month 6-9

---

## Forward-Looking Technology Notes

**Quantum computing:** The data schema is designed with quantum-readiness in mind — normalised, documented, portable, with full audit trails. When quantum computing becomes commercially viable for pharmaceutical research (likely 5-10 year horizon), the SHAI dataset's longitudinal depth and brand-level granularity makes it uniquely suited for population-scale pattern recognition that classical compute cannot achieve at this scale. This is explicitly part of the acquisition narrative for pharma-adjacent acquirers.

**AI advances:** Every Anthropic API call goes through a single abstraction layer. When Claude 4, 5, and beyond arrive, the routing table above is the only thing that needs updating — no scattered prompt changes throughout the codebase. Prompt versioning means every AI output is traceable to the exact model and prompt version that generated it, which is critical for clinical validation and regulatory submissions.

**Federated learning:** The v3 pipeline means the model improves continuously without raw data ever leaving user devices. This is both a privacy feature (genuine GDPR advantage) and a commercial feature (the model trains on real data at scale without the liability of centralising it).

**Computer vision (v3):** Photo → instant nutrition log removes the biggest friction point in the product. The accuracy of computer vision for food recognition has improved dramatically — by v3 timeline (month 24-42) this will be commercially viable at the accuracy level needed.

**Personalised nutrition science:** The research direction in nutrition is moving toward individual biomarker-based recommendations rather than population averages. SHAI's longitudinal dataset — especially correlated with growth outcomes — positions it as uniquely valuable when personalised nutrition becomes the clinical standard.

---

## Launch Strategy

Launches as **SHAI Beta**, explicitly early access. First 3-4 months completely free. Demo carousel before any signup. Waitlist live week 1, dripped in batches (20/50/200/500), prioritising selective eaters, diverse food cultures, different child ages, Malta contacts first. Beta users get 30-60 days free premium as founding-member thank you at full launch — badge permanent. Stealth approach: no PR, no paid social during beta. Clinical relationship built quietly first. Launch publicly with clinical partner narrative already established.

---

## Session Protocol — Six Questions

When Alexander says "ask the three questions":

**Set 1 — Operational (opens next session):**
1. What was just built?
2. What is the next specific task?
3. What is not working yet?

**Set 2 — Learning (builds technical understanding over 6-12 months):**
4. What did we build and how does it connect to everything else?
5. Why did we build it this way and not another way?
6. What would break if we changed this, and what would it affect?

---

## Four Non-Negotiable Build Principles (Added July 2 2026)

1. **Code quality:** All code must be minimal and effective — no unnecessary lines, no redundant logic, no unused imports. Confirm everything works before committing.
2. **Evidence-based recommendations:** Everything must be based on facts, market patterns, and trends. Forward-thinking always — quantum computing, AI advances, federated learning, market gaps. Never appease. Correct course if something doesn't work.
3. **Honest challenge:** If anything seems wrong technically or commercially, say so directly and correct it. Never agree just to agree.
4. **Monetisation from day one:** Tier gating, data layer hooks, analytics events, schema fields — built in from the start. Nothing retrofitted later.

---

## Legal Checklist — Complete (Updated July 2 2026)

| Item | When | Who |
|---|---|---|
| Supabase DPA signed | Tonight — before first real user | You as individual now, update on incorporation |
| Founders' agreement (equity split, roles, exit, IP) | Before incorporation | Solicitor |
| SHAI Ltd. incorporation (Malta) | Next 2-4 weeks | Corporate solicitor Malta |
| IP assignment (all pre-company work assigned to SHAI Ltd.) | At incorporation | Solicitor |
| NDA template | Before showing product to anyone external | Solicitor |
| Cookie consent / ePrivacy (Posthog analytics) | Before waitlist goes live | Configure Posthog privacy mode |
| Privacy policy | Week 13-14 | Claude drafts, solicitor reviews |
| T&Cs + liability limitation | Week 13-14 | Claude drafts, solicitor reviews |
| GDPR consent flow | Week 13-14 | Claude drafts, solicitor reviews |
| Data retention policy | Week 13-14 | Claude drafts, solicitor reviews |
| Children's data handling statement | Week 13-14 | Claude drafts, solicitor reviews |
| Research consent language (strong enough for commercial data partnerships) | Week 13-14 | Solicitor strengthens |
| Distress protocol review (corrected, founder-call removed) | Week 14 | Solicitor |
| Adverse event reporting mechanism | Before first real user | Built in code |
| DPIA (Data Protection Impact Assessment — GDPR Article 35 mandatory) | Week 13-14 | Solicitor under SHAI Ltd. |
| Clinical partnership letter of understanding | Month 1-2 | Solicitor drafts, clinician signs |
| Clinical threshold definitions | Month 1-2 | Paediatric clinician signs off |
| NHS/WHO attribution review | Month 1-2 | Clinician confirms |
| Clinician referral disclosure review (Malta healthcare advertising rules) | Month 1-2 | Solicitor confirms |
| Trademark SHAI (Nice Classes 42 + 44) | Before public launch | Solicitor files |
| App Store health app compliance review (Apple guidelines, health disclaimers) | Month 9-12 | Solicitor + Apple guidelines |
| Data partnership agreement template | Month 9-12 | Solicitor drafts |
| Professional indemnity insurance | Month 5 | Founder |
| Product liability insurance | Month 5 | Founder |
| Cyber liability insurance | Month 5 | Founder |

**DPIA note:** Mandatory under GDPR Article 35 because SHAI hits all four triggers — children's data, health data, new AI technologies, large-scale systematic monitoring. NOT required for waitlist page (email only, low risk). IS required before any children's health data is collected from real users — before weeks 5-11 core logging goes live. Target: week 13-14, under SHAI Ltd., solicitor drafts. Cost estimate: €800-2,500 DPIA only, €2,000-5,000 for full legal package. Can be commissioned as individual but cleaner under SHAI Ltd.

**Supabase DPA note:** Sign tonight in Supabase dashboard → Settings → Legal. Takes two minutes. Legally mandatory before first real user. Can sign as individual now, update signatory on incorporation.

---

## Immediate Next Steps

1. **Tonight** — sign Supabase DPA (Settings → Legal in Supabase dashboard)
2. **Tonight** — commit and push waitlist page, confirm shai-app.com goes live
3. Rename GitHub repo from `shay-app` to `shai-app` (already done per June 30 session)
4. Raise Anthropic spend limit before heavy dev usage
5. Incorporate SHAI Ltd. in Malta — next 2-4 weeks, corporate solicitor
6. Get NDA template drafted before showing product to anyone external
7. Build the Supabase schema for real — full schema from bullets, including corrected distress flag table (no founder fields)
8. Call the Malta paediatric clinician — single most important outstanding action, defines distress Level 3 properly
9. Plant the seed with Gasan Mamo contact re: insurer partnership
10. Convert HTML prototypes into real Next.js/React components, one screen at a time, starting with home screen
11. Fix the known Trends growth-graph bug (overlapping dots, no connecting line)
12. Configure Posthog privacy mode before waitlist goes live (cookie consent / ePrivacy)

---

## Testing Phases — Locked Decision (July 2 2026)

**The founding principle:** No third-party children's data collected until SHAI Ltd. is incorporated and basic legal infrastructure is in place. Every data point collected after that date is legally clean and acquisition-defensible.

**Phase 0 — Internal testing, no legal requirements:**
- Build and test using Shayan's data only
- Alexander is his legal parent/representative — full parental consent authority under GDPR and Maltese law
- No company needed, no DPIA needed, no consent form needed
- Real feedback loop, real data, real product validation
- If a feature needs more than one child to test: use a dummy/fake child profile with invented data — no real child, no real data, no legal issue

**Phase 0b — Dummy data testing:**
- Any feature that cannot be adequately tested with one child uses invented fake profile data
- Never real children, never real parents, never real health data
- Sufficient to validate UI flows, edge cases, error states

**Phase 1 — Before any third-party children's data:**
- Incorporate SHAI Ltd. in Malta (~€500-1,500, 2-4 weeks)
- Founders' agreement between Alexander and wife (equity, roles, IP, exit)
- IP assignment of all pre-company work to SHAI Ltd.
- Basic privacy policy live on shai-app.com (Claude drafts)
- GDPR consent flow built into app including parental consent language
- Basic record of processing documented
- Supabase DPA signed under SHAI Ltd.
- NDA template ready for testers
- Estimated total cost: €800-2,000
- Timeline: when ready, no rush until Phase 1 testing needed

**Phase 2 — Friends and family beta:**
- Full clean legal record from first third-party data point
- Every data point from here is acquisition-clean and audit-defensible
- In-app disclaimer screen before first child data entry
- Start with people who know you personally, then expand to waitlist

**Phase 3 — Public launch:**
- Full legal stack as documented in legal checklist
- DPIA complete under SHAI Ltd.
- Trademark filed (Nice Classes 42 + 44)
- Insurance in place
- Clinical partnership letter of understanding signed

**Why this sequence protects the acquisition:**
An acquirer's due diligence team will review data processing history. The clean story is: "During internal development we tested exclusively with the founder's child under parental consent authority. The first third-party user data was collected on [date], at which point SHAI Ltd. was incorporated, our privacy policy was live, and our GDPR consent flow was in place." That's defensible. Collecting friends' kids data before legal infrastructure exists, even if later deleted, creates a flag that reduces valuation and creates indemnity conditions in the deal.

---

## Four Non-Negotiable Principles (Locked July 2 2026)

These apply to every build session, every recommendation, every piece of advice — no exceptions:

1. **Code quality:** All code must be minimal and effective — no unnecessary lines, no redundant logic, no unused imports. Confirm everything works before committing.
2. **Evidence-based:** All recommendations based on facts, market patterns, and trends. Forward-thinking always — quantum computing, AI advances, federated learning, market gaps. Never appease. Correct course if something doesn't work.
3. **Honest challenge:** If anything seems wrong technically or commercially, say so directly and correct it. Never agree to be agreeable.
4. **Monetisation from day one:** Tier gating, data layer hooks, analytics events, schema fields built in from the start. Nothing retrofitted later.

---

## 6-9 Month Pre-Incorporation Roadmap (Locked July 2 2026)

### What to build (month by month)

| Month | Build focus |
|---|---|
| 1 | Waitlist live, home screen, onboarding flow, basic profile setup |
| 2 | Newborn feed logging, sleep tracker, appointment book |
| 3 | Core toddler meal logging, barcode scanning, reaction logging |
| 4 | Win Jar, growth tracking, nutrition display (free + premium tiers) |
| 5 | AI conversational logging (Haiku), weekly summary (Sonnet), baby book |
| 6 | Distress protocol, SHAI expression system, polish, bug fixes |

At month 6: near-complete v1 product, tested on Shayan, ready to open to beta the moment company is incorporated.

### Who to speak to now (no company needed)

**Malta paediatric clinician — this week, highest priority:**
Coffee, one question: "if a parent disclosed acute distress via a digital app, what would the appropriate clinical response look like?" Free, one hour, defines the most legally sensitive part of the product. Starts the relationship that becomes the clinical partnership announcement at public launch.

**Gasan Mamo contact — informal seed planting:**
Not a pitch. "I'm building something in child nutrition, I'd love your thoughts on the insurer angle when it's further along." 10-minute coffee. Keeps relationship warm. When you incorporate and approach properly it's not a cold call.

**Other parents — research conversations only, not data collection:**
30-minute conversations with 10-15 parents about feeding experience, stress points, what they wish they had. Product research, not data collection. No legal requirements. Costs nothing. Makes the product significantly better — the spec is currently built on one family's experience.

**MDIA and Malta Enterprise — introductory calls:**
Malta Digital Innovation Authority and Malta Enterprise both run startup programmes. No company needed to have introductory conversations. Malta Enterprise grant programmes could fund part of legal and development costs — understand the landscape before incorporating so you structure correctly to qualify.

**A Malta solicitor — scoping call at month 4-5:**
Not to engage yet. Understand the incorporation process, timeline, cost, what you need to prepare. Most will give 30 minutes free or low cost. So when ready to incorporate at month 6-9 you can move fast.

### Who NOT to speak to yet

- **Investors** — no traction, no company, no data. Educational only for you, not useful for them. Wait for 3 months of real user data.
- **Press or public** — nothing public until clinical partnership established. Story is significantly stronger with a clinician attached.
- **Nestlé/Abbott/Reckitt** — month 24-36 with data depth. Not now.
- **External developers** — not until company is incorporated and IP assignment agreement exists. Any developer who touches code before that creates IP ownership risk. Claude Code is the only developer until incorporation.

### Waitlist as an asset

Target: 500 emails before beta opens. Actions:
- Share personally with every Malta parent you know
- Post in Malta parenting Facebook groups
- Ask Gasan Mamo contact to share with relevant parents
- Ask clinician contact to mention to parents asking about nutrition apps

500 emails before beta is a meaningful number that tells a story to early investors.

### What you arrive at incorporation with (month 6-9)

- Near-complete v1 product built and tested on Shayan
- 500+ waitlist emails
- Clinical relationship established in Malta
- Insurer conversation started
- Product research from 15+ parent conversations
- Solicitor ready to move fast

That's a strong position. You're not starting from zero at incorporation — you're arriving with momentum, a product, and a waiting user base.

---

## EU AI Act Compliance (Added July 2 2026)

**Article 5 — Prohibition on AI manipulating children (in force February 2025):**
SHAI's mascot and AI behaviour must be documented as informing rather than manipulating. Already designed correctly (no streaks, no scores, warm not alarming, no engagement-maximising nudges aimed at children). A one-page documented review confirming this must be prepared by solicitor alongside the DPIA before launch. This is not optional — Article 5 violations carry penalties up to €35M or 7% global turnover.

**Article 50 — AI transparency/disclosure (in force August 2 2026 — one month away):**
Any AI system interacting with users must visibly disclose it is AI before or at the start of interaction. Not buried in T&Cs — upfront and visible. For SHAI: a visible disclosure line in onboarding and in the SHAI chat interface: "SHAI is an AI assistant." One sentence. Build this into the UI from day one. This is already enforceable — not a future deadline.

**High-risk classification (Annex III):**
Whether SHAI qualifies as a high-risk AI system under EU AI Act Annex III requires a formal written legal opinion before launch. SHAI intersects health guidance + children + AI-driven recommendations — all Annex III risk indicators. If classified high-risk, compliance burden is significantly heavier. Solicitor provides written opinion alongside DPIA. Add to legal checklist — do not assume either way.

**Breach response plan (GDPR Article 33):**
Documented procedure required to meet GDPR's 72-hour breach notification requirement. Must specify: who is responsible for detecting a breach, who notifies the IDPC, what information is included in the notification, and what communication goes to affected users. Solicitor drafts this alongside the DPIA. Add to technical build: Sentry already captures errors from day one — breach detection procedure must be documented separately.

**Updated legal checklist additions:**

| Item | When | Who |
|---|---|---|
| AI Act Article 5 documented review (mascot/AI behaviour) | Week 13-14 alongside DPIA | Solicitor |
| AI Act Article 50 disclosure built into UI | From day one in build | Claude Code |
| AI Act Annex III high-risk classification written opinion | Before public launch | Solicitor |
| GDPR 72-hour breach response plan | Week 13-14 alongside DPIA | Solicitor |

---

## Name — Final (July 5 2026)

**SHAi** — capital S, H, A, lowercase i.

Full meaning: Small Happy Appetites, Incorporated!

The lowercase i is deliberate — it distinguishes the character/companion from a pure corporate acronym. Signals personality and warmth. The drop on the i gives the wordmark a slightly playful asymmetry without trying too hard.

- Sounds like "Shay" spoken aloud
- Legal entity: SHAi Ltd. (Malta), future SHAi Plc.
- The AI companion character is called SHAi
- In character speech: "Hi, I'm SHAi" — feels like a name, not a product
- In brand assets and logo: **SHAi** — the mixed case is the brand
- All code, copy, system prompts, and spec use SHAi not SHAI
- GitHub repo: shai-app (already renamed)
- Domain: shai-app.com (already live)
