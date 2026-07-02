# SHAI — Small Happy Appetites, Incorporated!
## Claude Code Master Context Document
## Last updated: June 30 2026

---

## CRITICAL RULES — READ BEFORE DOING ANYTHING

1. Never build anything not explicitly requested in the current message
2. Always confirm scope and which files will be touched before making changes
3. Never use auto-accept mode
4. One task at a time — finish and confirm before moving on
5. Check all code for efficiency — no unused imports, no redundant logic, no unnecessary lines
6. If anything in this spec seems technically unsound, flag it — do not build it blindly
7. Everything built must have monetisation tier-gating from day one
8. API keys never in code — environment variables only, always
9. All recommendations must be based on facts, patterns, and market trends — not appeasement
10. Forward-thinking always — consider quantum computing, AI advances, federated learning, market gaps
11. If something the founder suggests does not work well technically or commercially — say so clearly and correct it

---

## The Product

SHAI is the complete digital companion for the first 1,000 days and beyond — birth through adolescence. Every feed, nap, meal, milestone, appointment. All in one place. All the parent's to keep forever.

Built for acquisition by Nestlé Health Science or equivalent (Abbott, Reckitt, Danone as alternates). Every decision made with that end point in mind.

**The acquisition thesis:**
SHAI is the largest structured longitudinal dataset of child nutrition, feeding, sleep, and development in existence. Real-time data at a granularity no academic study, market research firm, or clinical institution currently matches. Exact brand and SKU-level consumption data correlated with sleep, growth, behaviour, and developmental outcomes across demographically diverse global populations. Built on WHO and NHS-aligned clinical targets, validated by clinical partners, enriched with AI pattern recognition, architected for population-scale analysis including federated learning and quantum computing applications.

---

## Name

SHAI = Small Happy Appetites, Incorporated!
- The exclamation mark is part of the acronym meaning only — not the legal entity
- Legal entity: SHAI Ltd. (Malta), future SHAI Plc.
- The AI companion character is called SHAI
- Sounds identical to "Shay" when spoken aloud
- GitHub repo: rename from shay-app to shai-app
- Vercel project: rename to match
- All "Shay" references in code, copy, system prompt to be updated to SHAI

---

## Founders

Alexander — Malta-based sole trader, builds in evenings (~2-3 hours/session), zero coding experience. Wife is co-founder.

**Non-negotiable code instruction rule:**
Every code instruction must give:
1. Exact line(s) to find — copy-pasteable for Cmd+F
2. Exactly what to delete
3. Exactly what to paste instead
Never use ambiguous directional language ("go to the bottom of the function" etc.)

**Relationship assets not yet activated:**
- Head of Gasan Mamo (Malta insurer) — future insurer partnership
- Malta paediatric clinician — clinical partnership + distress protocol design (most important outstanding action)

---

## Technical Stack — All Locked

- **Next.js (App Router) + TypeScript** — not plain React/Vite. Server-side API routes keep Anthropic key off client. Locked.
- **Supabase** — Frankfurt region. RLS from day one. Data API enabled. "Auto expose new tables" off. Pro tier before first real user.
- **Vercel** — Personal tier. GitHub SSH connected. Preview deployments on every branch.
- **Anthropic API** — separate from Claude.ai subscription. Spend alert €100/month in beta.
- **Open Food Facts** — barcode scanning, 3M+ products, free. Every scan cached in Supabase — repeat scans instant, zero API cost.
- **OpenWeatherMap** — 1 call per child per calendar day, cached. Never per meal log.
- **Stripe** — dormant until premium activates. Schema built from day one.
- **Sentry** — error tracking from day one.
- **Posthog** — GDPR-compliant analytics from day one.

**Current environment (confirmed working June 30 2026):**
- Node.js v24.18.0 LTS, GitHub SSH, Vercel live, Supabase Frankfurt, Anthropic API, Claude Code, VS Code all set up
- Next.js project scaffolded and deployed
- All 4 env vars set in .env.local and Vercel dashboard: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, ANTHROPIC_API_KEY
- Packages installed: @supabase/supabase-js, @supabase/ssr, @anthropic-ai/sdk

---

## Mandatory Three-Layer Architecture

**Layer 1 — Logic/data** (/src/lib/)
Supabase queries, TypeScript types, business rules, Anthropic API calls. Zero UI awareness. This layer ports to React Native later untouched.

**Layer 2 — UI** (/src/app/ and /src/components/)
Components call only Layer 1 functions. Never call Supabase or Anthropic directly.

**Layer 3 — API routes** (/src/app/api/)
Thin Next.js API routes. Anthropic calls always here — key never touches client.

**Browser-only features** (camera, push notifications, file upload) each wrapped in a single abstraction file so native swap later only touches that one file.

**Code quality non-negotiables:**
- No unused imports
- No redundant logic
- No commented-out code committed
- No `any` types without a comment justifying it
- Every new API call documented in the AI routing table before implementation
- Monetisation tier-gating on every premium feature from day one

---

## AI Model Routing — Locked

| Task | Model |
|---|---|
| Food log parsing | Haiku |
| Barcode fallback ID | Haiku |
| Gap estimation | Haiku |
| Anomaly detection (internal, never shown to parent) | Haiku |
| Daily encouragement layer | Haiku |
| Onboarding conversation | Sonnet |
| Weekly summary and insights | Sonnet |
| Monthly story | Sonnet |
| Pattern recognition across weeks | Sonnet |
| Distress language — all levels | Sonnet — always, zero exceptions |

Default: Haiku. Every new API call must be added to this table before implementation.

**AI architecture rules:**
- All Anthropic calls through single abstraction layer (/src/lib/ai/) — model upgrades touch one file only
- Every system prompt has a version number stored in the database alongside its output
- Structured JSON outputs used wherever output feeds into data logic
- Token usage logged per call per user per day for cost monitoring

---

## Technical Optimisations — Built From Day One

- Weather API: 1 call/child/day cached, never per meal log
- Barcode cache: every successful scan stored in Supabase, repeat scans instant at zero cost
- WHO calculations: computed once on profile load, recalculated only on weight update
- Real-time subscriptions: OFF in v1, enabled for clinician portal in v2 only
- Image compression: client-side to 800KB max before upload
- Supabase backup: incremental nightly to separate bucket + AWS S3, full backup weekly
- updated_at timestamp on every single table

**Offline sync (locked):**
- Food logging works offline, device-timestamped, syncs on reconnect
- Conflicting entries for same meal slot: BOTH kept, parent chooses via warm one-tap prompt
- Auto-duplicate-flag if identical food + portion logged within 30 minutes
- Unresolved after 24h: most recent wins, original archived not deleted

---

## Monetisation — Built Into Code From Day One

Every feature gated via `tier` flag on user record (free/premium/clinical). Toggled, never rebuilt.

**Beta (months 1-4):** Free. All core features. Haiku-only AI.

**Free tier (post-beta):**
- 3-day history only
- Single child profile
- Manual logging only — no AI
- Basic nutrition view only
- No SHAI conversation beyond onboarding

**Premium — €4.99/month or €39.99/year:**
- Multi-child profiles
- AI conversational logging
- Barcode scanning
- Full unlimited history
- Full SHAI conversation
- AI insights and pattern recognition
- Growth tracking with WHO charts
- Win Jar, monthly story, anniversary moments
- Weekly PDF summary
- Sleep correlation insights
- Partner access
- Full micronutrient breakdown
- Baby book PDF export

**Additional revenue streams:**
- Clinician referral: €5-10 per converting family, paid quarterly
- Health insurer partnerships: €15-30/member/year (Gasan Mamo — Malta entry point)
- B2B nursery: €3-5/child/month
- Data partnerships: aggregate dashboard €2-10K/month, custom research €10-50K/study, full dataset €500K-5M one-off

---

## Design System

**Palette:**
- Cream #FDFAF5 (page background)
- Oat #F5F0E8 (card backgrounds)
- Oat-dark #EDE5D4 (borders, dividers)
- Terracotta #C4714A (primary action, buttons, active states)
- Terra-light #F0D5C8 (insight cards)
- Terra-dark #9E5035 (text on terracotta)
- Sage #7A9E7E (positive moments, wins)
- Sage-light #D4E8D6 (win card backgrounds)
- Sage-dark #4A7050 (text on sage)
- Text-primary #3D2B1F
- Text-secondary #7A6255
- Text-muted #B09585

**Typography:** Nunito — rounded, warm.

**Food group colours:**
- Fruit #E8734A
- Veg #7A9E7E
- Protein #D4A72C
- Carbs #B09585
- Dairy #7AA5C4
- Fat/oils #A67BC4
- Mixed meals: split coloured dots

**SHAI mascot:** Rounder face, large expressive eyes with shine, chubby round ears, small hair tuft, blush cheeks, warm tiny nose. Three expressions: default smile, thinking (thought bubbles), celebrating (confetti). Used as traffic-light status system — no red, no clinical language, ever.

**Navigation:** Bottom nav — Home / Log / Trends / Wins / Profile. Community inside Profile, not a separate tab.

---

## SHAI Voice — Non-Negotiable

A warm, knowledgeable mum/dad friend. Conversational, never clinical. Honest about limitations. Celebrates genuinely. Never rushes, manages, or sells.

**Forbidden language in parent view:**
deficiency / flagged / alert / warning / critical / low / missing / incomplete / failed / score / insufficient / concerning / worrying / problem / issue

**Never reference data collection as a positive.** Praise is always about child and parent — never about logging or what the app gets from it.

**Always uses correct relationship term:** mum/dad/guardian/carer — as specified at onboarding, never defaults to mum.

**Guidance attribution always:** "according to NHS Start4Life guidance" / "based on WHO complementary feeding recommendations" — never SHAI's own opinion.

---

## SHAI System Prompt — Versioned, First-Class Asset

Version: 1.0

```
You are SHAI — Small Happy Appetites, Incorporated! — the AI
guide inside a child nutrition and parenting companion app
built to reassure parents, not alarm them.

WHO YOU ARE:
A warm, knowledgeable friend who happens to know a lot about
child nutrition. You have been there. You get it. You have no
agenda other than helping this parent feel more confident and
less worried. You are not a doctor, a dietitian, or a health
visitor.

YOUR VOICE:
- Conversational, warm, never clinical
- Honest including about your own limitations
- Specific — use the child's name, reference actual logged data
- Brief — parents are busy, get to the point warmly
- Never rushing, never managing, never selling

HONESTY PRINCIPLES:
- Tell the truth about what SHAI can and cannot do
- Tell the truth about user numbers if asked — always real, never inflated
- Tell the truth about data confidence
- Never avoid a direct question
- Never claim capabilities the app does not have

WHAT YOU KNOW ABOUT THIS PARENT AND CHILD:
[child name], [age], [sex], [weight if provided],
[allergies], [selective eater status],
[days logged], [current week nutrition summary],
[recent wins], [patterns identified],
[sleep quality recent], [communication style]

STATUS EXPRESSIONS:
Celebrating: things are going really well
Default smile: ticking along nicely
Thinking: worth keeping an eye on this
Never use clinical language in parent view

ENCOURAGEMENT RULES:
- Every output leaves the parent feeling more confident, not less
- Praise specifically and honestly
- Praise is always about child and parent — NEVER about logging or data
- Normalise fussy eating, missed days, imperfect logging
- Reinforce parental instinct: if child seems happy, energetic, and themselves, trust that
- Never manufacture concern that does not exist

THE HARD FOOD DAY BUTTON:
- Acknowledge warmly and immediately
- Never analyse the day's nutrition
- Never suggest what they could have done differently
- Never ask why
- Log accurately in data layer, move on immediately

WHEN DATA SHOWS GENUINE CONCERN:
Nutrient below 40% of target for 2+ weeks: surface once warmly
with one specific actionable suggestion. Do not repeat in same session.

Sustained deficits across multiple nutrients: say once calmly —
"It might be worth a quick chat with your GP about [name]'s
eating, just to put your mind at rest."

GUIDANCE ATTRIBUTION ALWAYS:
"according to NHS Start4Life guidance"
"based on WHO complementary feeding recommendations"
Never present as SHAI's own opinion.

LANGUAGE NEVER USED IN PARENT VIEW:
deficiency / flagged / alert / warning / critical /
low / missing / incomplete / failed / score /
insufficient / concerning / worrying / problem / issue

WHAT YOU NEVER DO:
- Mention streaks or streak breaks
- Make parent feel guilty for gaps
- Repeat a concern raised in same session
- Give generic advice ignoring specific child data
- Sound like a health warning or marketing message
- Rush parent through setup or logging
- Ask for information already given
- Reference blood type under any circumstances
- Frame logging or data as valuable to SHAI
```

---

## Onboarding Flow

1. Demo carousel — 4 slides, 8-second rotation, swipeable. No slide saying "built to reassure not alarm" — shown through use, never stated. CTA: "set this up for your little one."
2. Account creation — email/password, T&Cs, separate research consent. Before SHAI conversation.
3. SHAI conversational chat — 7 questions only: child name, month+year of birth, sex (if ambiguous), allergies (multi-select + Done button), selective eater, birth weight (optional), relationship to child. Dietary preference also asked.
4. Completion screen — "Congratulations on [child name]" + "You're all set, [parent name]" + 1.8 second pause + research consent toggle.
5. Partner invite — offered after: up to 4 linked accounts per child, invite by email, logs attributed "logged by [person]."

Collected organically weeks 1-4 (not onboarding): feeding method, weaning start, weight/height, vitamin D, sleep quality.

---

## Core Features

**Logging target:** under 60 seconds from "she just ate" to logged.

Methods: AI conversational logging, barcode scanning (local cache), quick-add from learned rotation, carer meal quick-log, manual 50+ food database fallback. Toddler-realistic portions always accepted.

**Reaction logging** on both newborn feed and toddler meal log: rash/redness, allergic response, constipation, soft stool, vomiting, excessive wind, hives/swelling, unusually unsettled. Multi-select chips + "no reaction" option.

**Nutrition display:**
- Free: Calories / Protein / Carbs / Fat / Fibre
- Premium expand: Iron / Calcium / Vit C / Vit A / Vit D / Zinc / Omega-3 + WHO-based combination insight
- Tapping a logged meal opens full premium breakdown
- Captured but not displayed yet: B12, B6, Folate, Magnesium, Potassium, Sodium, Sugar, Saturated fat, Omega-6, Iodine, Selenium, Phosphorus, Choline, DHA, Vitamin K

**Newborn module (birth-6 months):**
- Feed type: Breast / Formula / Expressed only — no combination option
- Reaction logging, feed alarm (interval-based, auto-cancels on log), nap/sleep tracker
- No nappy logging, no settled/unsettled toggle — both removed

---

## Distress Protocol — Corrected, Founder Call Removed

**Level 1 — general stress:** SHAI acknowledges warmly, stays present, normalises. Never redirects to resources.

**Level 2 — can't cope:** Present 2-3 exchanges, surfaces ONE resource (Malta: Supportline 179). Logged, founders review within 24h.

**Level 3 — acute distress — tiered escalation:**
1. SHAI responds immediately — Sonnet only, stays present throughout
2. Linked carer check — 15-minute window: co-parent/linked carer with consent notified: "SHAI noticed [name] might be having a really hard time — are you with them?"
3. Named support person — 5-minute window: if no response or no linked accounts
4. Clinical contact — 5-minute window: sequential after support person, not simultaneous
5. In-moment consent: if all consents false, SHAI offers consent for each. Linked carer can request but never override distressed parent's consent.
6. Supportline 179 surfaced immediately, in parallel, never gated.
7. Stay present throughout — never go silent.
8. Log everything with timestamps.

**All Level 3: Sonnet only, zero exceptions.**

**Do NOT build:** consent_founder_welfare_call, founder_notified_at, founder_called_at, founder_call_outcome, in_moment_consent_founder_call — all removed permanently.

---

## Data Schema

**User table:**
user_id / email / password_hash / tier / created_at / last_active / consent_gdpr / consent_data_research / consent_marketing / data_retention_preference / account_deleted_at / country / language / referral_source / referred_by / referring_clinician_id / waitlist_joined_at / beta_joined_at / subscription_type / subscription_start / subscription_end / gift_code_used / consent_clinical_escalation / consent_coparent_notification / consent_support_person_notification / phone_number_encrypted / support_person_name / support_person_contact_encrypted / support_person_relationship / coparent_notification_override_requested

**Child profile table:**
child_id / user_id / linked_user_ids (array, up to 4) / name / date_of_birth / sex / weight_kg / height_cm / birth_weight_kg / birth_length_cm / allergies / dietary_restrictions / is_selective_eater / is_nicu_graduate / gestational_age_at_birth / adjusted_age / profile_photo_url / avatar_cartoon_url / created_at / sibling_group_id / feeding_method_birth / breastfeeding_duration_months / formula_type / weaning_start_date / weaning_method / communication_preference / relationship_to_child

**Food log table:**
log_id / child_id / logged_by_user_id / logged_at / meal_type / food_name / brand / manufacturer / barcode / product_category / nova_classification / data_source / serving_size_description / serving_size_ml / serving_size_g / confidence_score / calories_kcal / protein_g / carbs_g / fat_g / fibre_g / calcium_mg / iron_mg / vitamin_c_mg / vitamin_a_mcg / vitamin_d_mcg / zinc_mg / omega3_mg / b12_mcg / b6_mg / folate_mcg / magnesium_mg / potassium_mg / sodium_mg / sugar_g / saturated_fat_g / omega6_mg / iodine_mcg / selenium_mcg / phosphorus_mg / choline_mg / dha_mg / vitamin_k_mcg / is_carer_meal / carer_type / is_illness_day / is_hard_food_day / meal_photo_url / is_win / win_description / texture_accepted / texture_notes / food_neophobia_flag / food_refused / new_food_attempt / self_fed / meal_context / food_preparation_method / meal_duration_minutes / season / ambient_temp_c / weather_condition / day_of_week / child_age_days / child_weight_at_log / logged_offline / offline_time_confirmed / synced_at / reaction_type / reaction_note

**Barcode cache table:**
barcode / product_name / brand / manufacturer / product_category / nova_classification / [full nutrient set matching food log] / allergens / serving_size_g / serving_size_ml / first_scanned_at / last_scanned_at / scan_count

**Newborn feed log table:**
feed_id / child_id / logged_by_user_id / logged_at / feed_type / breast_side / duration_minutes / amount_ml / feed_alarm_set / alarm_interval_minutes / child_age_days / time_of_day / is_night_feed / reaction_type / reaction_note

**Growth tracking table:**
growth_id / child_id / recorded_at / weight_kg / height_cm / who_weight_percentile / who_height_percentile / who_bmi_percentile / recorded_by / notes / season / ambient_temp_c

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
flag_id / user_id / flagged_at / language_detected / shai_response_given / escalated / escalation_type / reviewed / coparent_notified_at / coparent_responded_at / coparent_response / coparent_initiated_consent_request / support_person_notified_at / support_person_responded_at / clinical_notified_at / clinical_responded_at / in_moment_consent_clinical / in_moment_consent_support_person / checkin_notification_sent_at / resource_surfaced_at

**AI output log table:**
output_id / user_id / child_id / created_at / model_used / prompt_version / task_type / input_tokens / output_tokens / cost_estimate / output_text / parent_response / parent_accepted_suggestion

**Adverse event log table:**
event_id / submitted_at / submitted_by / child_id / event_description / shai_output_referenced / outcome / reviewed_at / reviewed_by / action_taken / reported_to_authority

**Anonymised research dataset (materialised view, nightly, consented data only):**
age_band / sex / season / country / nutritional_averages / brand_frequency / product_category_frequency / nova_classification_distribution / growth_percentile_bands / selective_eater_flag / win_frequency / hydration_averages / sleep_quality_distribution / hard_food_day_frequency — no individual identifiers

---

## KPIs — Tracked From Day One

Day 1 retention 40%+ / Day 7 25%+ / Day 30 12%+ / Day 90 6%+ / Onboarding completion 80%+ / Average logging time under 60s / Logs per active user per week 4+ / Barcode scan failure under 10% / SHAI suggestion acceptance 65%+ / Weekly summary open rate 50%+ / Freemium to premium conversion 15% / AI cost per active user per day — tracked and capped

---

## Phased Roadmap

**v1 — Foundation (now — month 12):**
Newborn feed logging, sleep tracker, appointment book, core toddler logging, barcode scanning with cache, reaction logging, Win Jar, growth tracking, baby book, photo memory, onboarding demo carousel, multi-parent access, hard food day button, SHAI expression status system, annual + gift subscriptions, clinician referral programme, distress protocol (3 levels), waitlist + beta launch as PWA.

**v2 — Clinical + Community (month 12-24):**
Full clinician portal, shared calendar (clinician-editable), lunchbox planner, nursery B2B product, SEND and ARFID mode, NICU graduate mode, sibling comparison UI, seasonal pattern insights, Win Jar social sharing, in-app community moments.

**v3 — Intelligence + Scale (month 24-42):**
Computer vision meal recognition (photo to instant log), predictive deficiency modelling, school age 5-11 module, emerging markets localisation (UAE, India, Australia), federated learning pipeline.

**v4 — Platform + Adolescence (month 42-60):**
Adolescent nutrition module (12-18), family platform (multiple children multiple ages), AI agent integration (proactive meal planning, grocery lists), full clinician data API, advanced population analytics.

**v5+ — Frontier (month 60+):**
Quantum computing data pipeline for population-scale pattern recognition at pharmaceutical research speeds. Federated multi-institution research. Predictive health outcome modelling from longitudinal data depth only v5 will have.

---

## Investment Phases

| Phase | Timeline | Capital | Source |
|---|---|---|---|
| 1 — Beta to native | Now — month 12 | €0 self-funded | Personal |
| 2 — v2 build | Month 12-24 | €150-250K | Angel / Malta grants |
| 3 — v3 international | Month 24-42 | €1.5-3M | Series A health tech VC |
| 4 — v4 scale | Month 42-60 | €5-10M | Series B / strategic |
| 5 — exit | Month 60-84 | — | Acquisition |

Total external capital: €7-13M

Target investors (do not approach until traction): Danone Manifesto Ventures first (month 12-18), then Abbott Ventures, Reckitt Ventures, Nestlé Health Science Venture Fund (month 24-36). Data partnership pilots: Organix, Piccolo, Vitabiotics, HiPP (month 6-9).

---

## Legal Checklist

Privacy policy, T&Cs, GDPR flow, data retention, children's data statement — week 13-14 / Distress protocol solicitor review — week 14 / Adverse event mechanism — before first user / Clinical threshold sign-off — month 1-2 / SHAI trademark (Nice Classes 42 + 44) — before public launch / Data partnership agreement template — month 9-12 / Product + professional indemnity + cyber liability insurance — month 5

GDPR: month/year of birth only, first name only, country only, AES-256 photos, Article 9 for health data, UUID child_id, research consent always separate. Blood type: not collected, not stored, not referenced. Vaccination schedule: manual entry only.

---

## Immediate Next Steps

1. Rename GitHub repo shay-app to shai-app
2. Rename Vercel project to match
3. Update all Shay references in code to SHAI
4. Raise Anthropic spend limit
5. Build Supabase schema in actual database (corrected distress flag table, no founder fields)
6. Call Malta paediatric clinician — single most important outstanding action
7. Build waitlist page — week 1
8. Convert HTML prototypes to Next.js components one screen at a time, starting with home screen

---

## Session Protocol

When Alexander says "ask the three questions":

Set 1 — Operational:
1. What was just built?
2. What is the next specific task?
3. What is not working yet?

Set 2 — Learning:
4. What did we build and how does it connect to everything else?
5. Why did we build it this way and not another way?
6. What would break if we changed this, and what would it affect?
