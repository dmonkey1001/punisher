# Punisher — Home Workout App

**Design Document — v0.1 (draft)**
Author: Claude (with Derek)
Date: 2026-06-14
Status: Draft for review

---

## 1. Overview

Punisher is a self-hosted web app for two people (Derek and Tai) to **generate and track hypertrophy-focused
strength workouts** at home. The app builds each session based on:

1. **Available equipment** (a well-equipped power-rack home gym).
2. **Each user's recorded progress** (weights, reps, effort).
3. **Daily readiness feedback** (soreness + fatigue check-ins) so volume/intensity adapt to how the body is recovering.

It runs as a single Docker container on a home server (managed via Portainer), is used primarily **from a phone at the
rack**, and serves only two trusted profiles on the local network.

### Design principles

- **Mobile-first, glanceable, one-handed.** Big tap targets, minimal typing, fast logging between sets.
- **Prescribe, then confirm.** The app proposes each set's target; the user confirms or adjusts what they actually did.
- **Autoregulated, not rigid.** RIR/RPE + soreness/fatigue drive progression instead of a fixed linear plan.
- **Returning-lifter aware.** Both users know the movements but are detrained; the program ramps in gently.
- **Boringly reliable.** Local-first, single container, single SQLite file you can back up by copying one file.

---

## 2. Users

| | Derek | Tai |
|---|---|---|
| Age | 46 M | 52 F |
| Background | Experienced lifter, ~years off | Experienced lifter, ~years off |
| Knows form | Yes | Yes |
| Status | Detrained / returning | Detrained / returning |

**Implications for the engine:**
- No need to teach movements, but **start conservative and ramp** (reintroduction block) to avoid excessive DOMS and
  injury after time off.
- Age 46/52 → prioritize **joint-friendly loading**, thorough warm-ups, autoregulated volume, and adequate recovery.
  Soreness/fatigue feedback matters more here than for a 25-year-old.
- Each profile is fully independent: separate equipment increments comfort, separate progress, separate programs.

**Auth:** Tap a profile (Derek / Tai) on launch. No password. Trusted home network only.

---

## 3. Equipment Model

The home gym (shared by both users):

| Equipment | Notes / use |
|---|---|
| Power rack (full cage) | J-hooks for bench/press/squat, spotter/safety arms, dip handles, pull-up handles |
| Olympic barbell (45 lb) + plates | Primary loading tool for compound lifts |
| Hex / trap-bar | Deadlifts, shrugs, carries — joint-friendly pulling |
| Olympic EZ curl bar | Curls, skull crushers, accessory pressing |
| Cables — high **and** low, **plate-loaded** | Loaded with the **same Olympic plates** as the bar — no separate weight stack. Big driver of hypertrophy variety: rows, pulldowns, pushdowns, flyes, face pulls, etc. Effective resistance depends on the pulley ratio (see plate math). |
| Adjustable bench | **Flat + incline only** (no decline) |
| Dumbbells | A **2.5 lb** pair and a **15 lb** pair only — usable for laterals, rear delts, light accessories, finishers; **not** a full DB range |

**Plate inventory (shared by bar + cables):** 2× 2.5 lb, 2× 5 lb, 4× 10 lb, 4× 35 lb (= 195 lb of plates). With the
45 lb bar, max balanced barbell load is **240 lb**. Smallest balanced jump is **+5 lb** (2.5 lb/side).

> **⚠️ Loading gap to be aware of:** the jump from a pair of 10s to a pair of 35s is large, so mid-range barbell loads
> have coarse steps. Buying **a pair (or two) of 25s and/or 45s** would fill the gap and extend the top end as you
> progress. The engine will work fine with what you have, but I'll flag when progression is blocked by missing plates.

### Equipment is data, not hardcoded

Equipment is stored as records so we can add/edit later without code changes. Each piece carries:
- `type` (barbell, trapbar, ezbar, cable, bench, rack-attachment, dumbbell, bodyweight)
- **Loadable increments** — the engine must only ever prescribe weights the user can actually make:
  - **Barbell / EZ bar / trap bar:** bar weight + the shared plate inventory → compute the set of achievable balanced
    total loads. Smallest jump is **+5 lb** (one 2.5 lb plate per side). (Optional later: microplates / magnets for
    smaller jumps — config toggle.)
  - **Cables (plate-loaded):** same plate inventory, but effective resistance = plate load × **pulley ratio**
    (1:1, 2:1, etc. — *to confirm*). The engine stores the ratio per pulley and reports the felt resistance, while still
    telling you which raw plates to hang.
  - **Dumbbells:** only **2.5 lb** and **15 lb** pairs exist → DB exercises are fixed-load (pick the appropriate pair);
    progression on DB movements is via reps, then by graduating to a barbell/cable variant when 15 lb is outgrown.
- `attachments` for the rack (dip handles, pull-up handles, safety arms) gate bodyweight movements (dips, pull-ups).

> **Plate math is a first-class feature.** When the engine wants "+5 lb," it snaps to the nearest *achievable* load and
> tells the user exactly which plates to put on. This avoids the classic "add 2.5 lb" prescription you physically can't make.

---

## 4. The Adaptive Training Engine (core)

This is the heart of the app. Goal: **maximize hypertrophy** while respecting recovery, equipment, and a variable schedule.

### 4.1 Program structure

- **Mesocycle:** a ~4–6 week block. Volume ramps up week to week, then a **deload** week, then repeat with adjusted
  starting points. (Classic accumulation → deload hypertrophy structure.)
- **Reintroduction block first:** because both users are detrained, mesocycle #1 is a shorter (~2–3 week) on-ramp at
  reduced volume and higher RIR (more reps in reserve = lower effort) to rebuild work capacity and limit DOMS.
- **Flexible frequency:** the user does **not** commit to fixed days. The app maintains a rotation of session
  *templates* and serves the next one whenever the user starts a workout. It adapts to whatever cadence actually happens.

### 4.2 Split selection ("let the app decide")

The app chooses the split from how often the user actually trains (inferred over time), defaulting to:
- **~2–3 sessions/week → Upper / Lower** (or full-body if very infrequent).
- **~4 sessions/week → Upper / Lower ×2.**
- **~5–6 sessions/week → Push / Pull / Legs.**

Because frequency is variable, the engine tracks **per-muscle-group recovery and days-since-trained** rather than a rigid
calendar, and picks the session that best balances what's recovered and what's under-stimulated. (See 4.5.)

### 4.3 Exercise selection

For each session the engine fills movement *slots* (e.g., "horizontal press," "vertical pull," "hip hinge," "quad," 
"lateral delt," "biceps," "triceps") from an **exercise library** filtered by available equipment.

- Each exercise is tagged with primary/secondary **muscle groups**, **equipment required**, movement pattern, and a
  **fatigue cost** (compound barbell lifts cost more systemic fatigue than cable isolation).
- Selection favors variety across sessions (rotates exercises) to spread stimulus and reduce staleness, while keeping
  the big compounds as anchors.
- The light-DB / strong-cable inventory means the engine leans on **cables and barbell** for most work and uses the
  15 lb DBs for laterals, rear delts, and finishers.

### 4.4 Volume, intensity & progression (hypertrophy)

**Volume — managed with landmarks per muscle group:**
- Track weekly **sets per muscle group** against MEV → MAV → MRV (minimum effective, adaptive max, max recoverable).
- Start each mesocycle near MEV and add ~1–2 sets/muscle/week toward MRV, then deload.

**Intensity & reps:**
- Hypertrophy rep ranges (roughly 6–15, sometimes up to 20 for isolation), most sets taken close to failure
  (low RIR) but not consistently to failure.

**Progression — double progression + autoregulation:**
1. Each exercise has a target rep range and a target RIR for the set.
2. **Within the range:** keep weight, add reps next time.
3. **Top of the range hit at/under target RIR:** bump weight to the next *achievable* load (plate-math aware) and drop
   back to the bottom of the range.
4. **Effort too high (RIR lower than target / grinding):** hold or reduce load.
5. All driven by the logged **RIR/RPE** the user enters per set.

### 4.5 Readiness: soreness & fatigue check-ins

Before a session (and optionally a quick daily check), the user answers a fast, tappable check-in:
- **Per-muscle-group soreness** (e.g., none / mild / moderate / very sore) — quick body-map or chips.
- **Overall fatigue / energy / sleep** (1–5).

The engine uses this to adjust the *upcoming* session:
- **Sore muscle group** → de-prioritize or reduce volume for it; the rotation picks a session emphasizing recovered groups.
- **High systemic fatigue** → trim total sets, raise target RIR (back off effort), or suggest a lighter/technique day.
- **Consistently low soreness + low effort** → green-light faster volume/load progression.
- Persistent excessive soreness on a movement → swap to a gentler variation.

This is what makes the program "adjust to the pace you progress" rather than marching a fixed plan.

### 4.6 Warm-ups, rest, safety

- Auto-generated **warm-up ramp** sets for the first heavy compound of a session (important at 46/52 and when returning).
- **Rest timer** between sets (longer for compounds, shorter for isolation), with a gentle audio/vibration cue.
- Because of the full cage + spotter arms, heavier barbell work is safe to prescribe solo.

---

## 5. Workout Flow (UX)

Phone-first, designed for use mid-set with one hand.

1. **Launch → tap profile** (Derek / Tai).
2. **Today screen:** "Start workout" with the proposed session name + quick readiness check-in (soreness/fatigue chips).
3. **Active workout:** one exercise at a time.
   - Shows target: sets × rep range @ target weight (with **"load: 45 + 25/side"** plate hint) and target RIR.
   - For each set: pre-filled target reps/weight → user taps **✓ Done** (accept) or adjusts reps/weight, then picks
     **RIR/RPE** from a quick chip row.
   - **Rest timer** starts automatically; "next set" surfaces when rest is done.
   - Easy actions: add a set, skip, swap exercise (offers equipment-valid alternatives), substitute weight.
4. **Finish:** session summary (volume, PRs, total load), saved to history.
5. **History & progress:** per-exercise charts (top set, est. 1RM, volume), per-muscle weekly volume vs landmarks, and
   bodyweight/measurement trends.

Add **PWA install** so it lives on the home screen like a native app and works smoothly on the gym Wi-Fi.

---

## 6. Data Model (initial sketch)

SQLite, one row-per-fact, designed so the engine can reconstruct progress and recovery state.

- **users** — id, name, created_at, settings (units lb/kg, microplates available, etc.)
- **equipment** — id, type, label, attrs (bar weight, attachments)
- **plates** / **cable_stacks** — inventory + increments used for plate math
- **exercises** — id, name, movement_pattern, primary_muscles[], secondary_muscles[], equipment_required[],
  rep_range_default, fatigue_cost, notes
- **muscle_groups** — id, name, MEV/MAV/MRV defaults (per user override allowed)
- **programs / mesocycles** — user_id, start_date, week, phase (reintro/accumulation/deload), split_type
- **session_templates** — planned slot list for a session type (Upper/Lower/Push/…)
- **workouts** — id, user_id, date, template, readiness snapshot (fatigue, sleep), notes
- **soreness_logs** — user_id, date, muscle_group, level
- **workout_exercises** — workout_id, exercise_id, order, target (sets/reps/weight/RIR)
- **sets** — workout_exercise_id, set_no, target_reps/weight, actual_reps/weight, rir, completed_at
- **bodyweight_logs** — user_id, date, weight
- **measurements** — user_id, date, site (waist/arm/chest/…), value

History is append-only; the engine derives "current working weight," recovery, and volume by querying these.

---

## 7. Tech Stack & Architecture

Chosen for a single cohesive container, great mobile/PWA support, and low maintenance. (Swappable — flag if you have a
preference.)

- **App:** SvelteKit + TypeScript — one project for both server routes (API) and the mobile-first UI.
- **Styling:** Tailwind CSS — fast to build the big-tap-target UI.
- **DB:** SQLite via Drizzle ORM (`better-sqlite3`). Entire database is one file on a mounted volume.
- **PWA:** installable, offline-tolerant for logging on weak Wi-Fi.
- **Charts:** a lightweight charting lib for progress/volume/bodyweight.
- **Training engine:** plain TypeScript module (pure functions: given history + readiness + equipment → next session).
  Kept framework-agnostic and **unit-tested** since it's the core logic.

```
[ Phone PWA ] --HTTP--> [ SvelteKit server (API + SSR) ] --> [ Training engine ] 
                                                         --> [ SQLite (volume) ]
```

---

## 8. Deployment

- **Target:** Docker container deployed via **Portainer** on the home server.
- **Image:** multi-stage build (build SvelteKit → slim Node runtime).
- **Persistence:** one named volume holding `punisher.db` (and any progress photos later). Backup = copy the volume / file.
- **Config via env:** port, units default, microplate toggle, backup path.
- **Network:** LAN only; reachable at `http://<server-ip>:<port>`. No external exposure, no TLS needed initially.
- Deliverables: `Dockerfile`, `docker-compose.yml` (for easy Portainer stack import), and a short deploy README.

---

## 8a. Conditioning / Stamina

Primary goal stays **hypertrophy**, but we'll support conditioning alongside it:
- **Optional finishers** appended to a lifting session (e.g., trap-bar carries, cable circuits, sled-style
  movements) — short, tracked, and chosen to not wreck recovery for the next session.
- **Standalone conditioning sessions** the engine can offer on low-readiness or "off" days instead of heavy lifting.
- Tracked metrics: duration, rounds/intervals, work/rest, perceived effort (RPE), and optional notes. These feed the
  same fatigue model so conditioning load is accounted for when prescribing the next lifting session.
- Equipment-aware: built from what you have (trap bar, cables, bodyweight on the rack handles, etc.).

---

## 9. Extra Tracking

- **Bodyweight:** quick log + trend chart per user.
- **Body measurements:** configurable sites (waist, arms, chest, thighs, etc.) + trend charts — useful hypertrophy
  feedback beyond the scale.
- (Progress photos intentionally **out** for now per your selection; easy to add later since storage is local.)

---

## 10. Roadmap / Phasing

**Phase 1 — Foundations & logging (MVP)**
- Profiles, equipment + plate/cable inventory, exercise library, manual workout logging with sets/reps/RIR, history.
- Plate-math calculator. Bodyweight + measurements.

**Phase 2 — Generation engine**
- Split selection, exercise-slot filling, double-progression + autoregulation from RIR, warm-up ramps, rest timer.

**Phase 3 — Adaptive readiness**
- Soreness/fatigue check-ins feeding volume/intensity adjustments; mesocycle + deload management; reintroduction block.

**Phase 4 — Polish**
- PWA install, progress charts, volume-vs-landmark dashboards, exercise swaps/alternatives, data export/backup UX.

---

## 11. Resolved & Remaining Questions

**Resolved (2026-06-14):**
- ✅ Units: **lbs** throughout.
- ✅ Plates: smallest is 2.5 lb → **+5 lb** smallest barbell jump; full inventory recorded in §3. No microplates.
- ✅ Cables: **plate-loaded with the same Olympic plates** — one shared plate-math system, no separate stack.
- ✅ Bench: **flat + incline only**.
- ✅ Exercise library: I'll **seed a sensible default**, editable later.
- ✅ Goal scope: **hypertrophy + conditioning** (see §8a).

**Still open:**
1. **Cable pulley ratio** — what's the resistance ratio on your plate-loaded cables (1:1, or does it feel lighter/
   heavier than the plates you hang, e.g. 2:1)? If you're not sure, I'll default to 1:1 and add a per-pulley
   calibration setting you can tweak once you feel it. *(Non-blocking.)*
2. **Backups** — automated nightly copy of the DB file to a folder/network share, or is a manual/Portainer volume
   snapshot fine? *(Default: I'll include a simple nightly-copy option you can enable.)*

---

*Next step: I'll lock the schema, seed the default exercise + conditioning library, and start Phase 1
(profiles, equipment/plate inventory, logging, plate-math, bodyweight/measurements). The two open items above are
non-blocking — I'll use sensible defaults and you can adjust in settings.*
