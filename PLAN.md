# Spin Wars — Design & Tech Plan

A Beyblade-inspired, two-player local game where each player swipes a rip cord
to launch a spinning top into a shared circular arena. Spinners collide under
realistic 2D physics, losing angular velocity over time and through impacts,
until one is knocked out of the ring, stops spinning, or bursts apart.

Target platforms: **iOS, Android, and Web** from a single codebase. **Web
first** — the game ships as a mobile-browser-playable build before we wrap
it as native iOS/Android apps with Capacitor.

### Project decisions (locked)
- **Orientation**: landscape, locked.
- **Burst mechanic**: included in v1.
- **Monetisation**: none — completely free, no ads, no IAP.
- **Art direction**: metallic-realistic (PBR-feeling 2D top-down sprites with
  brushed metal, scratches, sparks, and rim lighting).
- **Audience**: under 13 — COPPA-compliant. No behavioural analytics, no
  third-party ad SDKs, no account creation, no chat.
- **Online play**: not required.

---

## 1. Game Design

### 1.1 Core fantasy
Two kids hunched over a table, thumbs on opposite ends of a phone, ripping
their launchers at the same time. The phone is the arena.

### 1.2 Match flow
1. **Mode select** — Local 2P (same device), Solo vs AI, Online (later phase).
2. **Spinner select** — Each player picks a spinner from their side of the
   screen. Each spinner has a class (Attack / Defense / Stamina / Balance)
   and stats (mass, friction, max RPM, perimeter shape).
3. **Launch screen** — Phone is held horizontally (landscape). Each player's
   half shows a launcher with a rip cord. A 3-2-1 countdown plays.
4. **Rip** — On "GO", both players swipe across their half of the screen.
   Swipe length × speed determines launch RPM and entry velocity. Angle of
   swipe determines entry trajectory into the arena.
5. **Battle** — Spinners enter the circular arena and interact under physics
   until a win condition is met. Camera is fixed top-down on the full arena.
6. **Result** — Winner animation, XP, unlocks. Rematch button.

### 1.3 Win conditions
- **Ring-out** — Spinner crosses outside the arena boundary.
- **Spin-out** — Angular velocity falls below a threshold (top tips over).
- **Burst** — Sustained high-impact damage breaks the spinner into parts.
  Each spinner has a hidden `integrity` value that drops on hits scaled by
  impact impulse; at zero, the spinner explodes into 2–3 fragments with a
  burst SFX and the round ends.

### 1.4 Spinner stats
| Stat        | Effect                                                |
|-------------|-------------------------------------------------------|
| Mass        | Momentum on impact, resistance to being pushed.       |
| Friction    | How fast RPM decays from contact with the arena.      |
| Max RPM     | Cap on launch energy.                                 |
| Perimeter   | Smooth ring (defense), toothed (attack), heavy rim    |
|             | (stamina). Shape drives collision response.           |
| Recoil      | How much energy bounces back to the attacker.         |
| Integrity   | Hidden HP for the burst mechanic.                     |

### 1.5 Controls
- **Rip cord**: a single swipe per player on their half of the screen.
  - Swipe distance + speed → launch RPM (mapped with a soft cap).
  - Swipe direction → entry vector into the arena.
  - Haptic "tick" on rip release.
- **Aim assist** (optional): a brief pre-launch arrow that follows the
  finger before release.

### 1.6 Feel & juice
- Subtle screen shake on heavy impacts (scaled by impulse).
- Spark particles at contact points; bigger sparks for big hits.
- Arena rim flashes where a spinner is about to ring out.
- Distinct sounds for metal-on-metal hit, grind, ring-out, spin-out.
- Slow-mo on the final game-winning hit.

### 1.7 Modes (phased)
- **Phase 1**: Local 2P, same device. Solo vs AI.
- **Phase 2**: Single-device tournament bracket; cosmetic unlocks (all free).

---

## 2. Tech Selection

### 2.1 Recommended stack

| Layer            | Choice                                     | Why                                                                                         |
|------------------|--------------------------------------------|---------------------------------------------------------------------------------------------|
| Engine           | **Phaser 3** (TypeScript)                  | 2D-first, mature, free, runs natively in the browser; perfect for a top-down arena.         |
| Physics          | **Phaser Matter.js integration**           | Rigid bodies, circular constraints, restitution, friction — exactly what spinner collisions need. |
| Language         | **TypeScript**                             | Type-safe game state, refactor-friendly as content grows.                                   |
| Web build / dev  | **Vite**                                   | Fast HMR, easy TS + asset pipeline.                                                         |
| Audio            | **Howler.js** (or Phaser's built-in audio) | Sprite-based audio, mobile-friendly unlock handling.                                        |
| State / UI menus | **Plain TS + small store** (Zustand-style) | Menus are simple; avoid React unless we want richer UI later.                               |
| Assets pipeline  | **TexturePacker** + **Substance/Blender** baked to 2D | Render metallic spinners in 3D, bake to sprite sheets for that "real metal" look without a 3D runtime cost. |
| Persistence (web) | **`localStorage`** (with a thin wrapper) | Works in every mobile browser; the wrapper later swaps to Capacitor Preferences with no caller changes. |
| Analytics/crash  | **None in v1**                             | COPPA: no behavioural analytics. If we add crash reporting later it will be a self-hosted, no-PII option (e.g. self-hosted Sentry with `sendDefaultPii: false` and IP scrubbing). |
| CI/CD            | **GitHub Actions**                         | Build web to a static host. Native iOS/Android builds added in the Capacitor phase.         |
| Native wrapper (later) | **Capacitor** (by Ionic)             | Wraps the same web build as iOS + Android apps; deferred until the game is in good shape.   |

### 2.2 Why not the alternatives

- **Unity / Godot** — heavier toolchain, larger binaries, slower web export.
  Overkill for a 2D top-down game and harder to iterate on for a small team.
- **React Native** — great for UI, weak for real-time physics rendering.
- **Native per-platform** — triples build/test cost for no gameplay benefit.
- **Cocos2d / PixiJS + custom physics** — viable; Phaser+Matter is the
  fastest path to a playable prototype.

### 2.3 Physics model (Matter.js)
- Arena = a static circular boundary (composed of many small static segments
  or a circular constraint plus a "ring-out" sensor outside the rim).
- Spinner = a dynamic circular body with:
  - `mass` (from stat)
  - `frictionAir` low (so it glides)
  - `friction` moderate (slows on rim contact)
  - `restitution` ~0.6–0.9 (bouncy collisions)
- Angular velocity (`ω`) is **tracked separately** from physics rotation:
  - A custom decay each tick: `ω *= (1 - frictionStat * dt)`.
  - On collision, transfer fraction of `ω` between bodies based on relative
    velocity, mass ratio, and "attack vs defense" perimeter modifier.
  - Add an outward "kick" impulse on contact proportional to spinner's `ω`
    and the attacker's perimeter modifier — this is what makes spinners
    fly across the arena like real Beyblades instead of sticking.
- Spin-out triggers when `ω < ωMin` for `tStop` ms.
- Burst: each impact subtracts `impulse * burstFactor` from `integrity`.
  When `integrity ≤ 0`, replace the spinner body with 2–3 fragment bodies
  given outward velocities and a short lifetime; round ends.

### 2.4 Input model
- One **PointerTracker** per screen half. Each tracks an active pointer's
  positions over time and computes:
  - Swipe vector (start → release).
  - Peak speed (max |Δp| / Δt over a short window).
- Launch energy: `RPM = clamp(k1 * peakSpeed + k2 * length, 0, RPMmax)`.
- Multi-touch: the OS gives us multiple `PointerEvent`s with unique IDs;
  partition by `clientX < width/2` to assign sides.

### 2.5 Rendering
- Fixed-resolution virtual canvas (e.g. 1280×720 landscape) scaled to fit
  the device. Phaser's `Scale.FIT` handles letterboxing and notches.
- Landscape orientation locked via `@capacitor/screen-orientation` on
  native and a CSS/JS guard on web.
- Spinners rendered as a base sprite + an animated rim overlay rotating at
  visual RPM (capped so it never looks stroboscopic).
- **Metallic look**: spinners are pre-rendered from 3D models (Blender +
  Substance) into 32–64 frame rotation atlases with baked specular
  highlights, anisotropic brushed-metal streaks, and rim light. A dynamic
  "shine" sprite overlays the rim and rotates opposite to spin direction
  to sell motion. Sparks use additive blending with bloom on the WebGL
  renderer.

### 2.6 Cross-platform packaging
**Web (now):**
- `npm run build` → static web bundle (deploy to Cloudflare Pages /
  Netlify / Vercel).
- Landscape lock: `screen.orientation.lock('landscape')` where supported,
  plus a CSS "please rotate your device" overlay as a fallback.
- Haptics: `navigator.vibrate()` on supporting browsers (Android Chrome);
  no-op on iOS Safari until wrapped.
- Persistence: `localStorage` via a `Storage` interface.

**Native (later, when we add Capacitor):**
- `npx cap sync ios && npx cap open ios` → Xcode project; sign + ship.
- `npx cap sync android && npx cap open android` → Android Studio; sign +
  ship.
- Capacitor plugins added at that point:
  - `@capacitor/haptics` for rip-cord feedback (replaces the web vibrate).
  - `@capacitor/preferences` for save data (swapped in behind the
    `Storage` interface).
  - `@capacitor/screen-orientation` to lock landscape natively.
  - `@capacitor/status-bar` for immersive mode.

### 2.7 COPPA / under-13 compliance checklist
- No account creation, no login, no PII collected.
- No third-party advertising SDKs.
- No behavioural analytics or device fingerprinting.
- No chat, no UGC sharing, no social features.
- App store listings: tick "Made for Kids" (Google Play Designed for
  Families) and the App Store Kids category with the appropriate age band.
- Privacy policy page (required for stores) stating "no data collected".
- All assets/sound original or licensed for commercial child-directed use.

---

## 3. Architecture

```
spin-wars/
├── public/                  # static assets shipped with the web build
├── src/
│   ├── main.ts              # Phaser bootstrap
│   ├── config/              # game balance constants
│   ├── scenes/
│   │   ├── BootScene.ts
│   │   ├── MenuScene.ts
│   │   ├── SelectScene.ts   # spinner picker (split-screen)
│   │   ├── LaunchScene.ts   # rip-cord input
│   │   ├── BattleScene.ts   # physics arena
│   │   └── ResultScene.ts
│   ├── systems/
│   │   ├── PointerTracker.ts
│   │   ├── SpinnerPhysics.ts
│   │   ├── ImpactResolver.ts
│   │   ├── AI.ts            # solo-mode opponent
│   │   └── Audio.ts
│   ├── entities/
│   │   ├── Spinner.ts
│   │   └── Arena.ts
│   ├── data/
│   │   └── spinners.ts      # catalog + stats
│   └── ui/                  # menus, HUD, result screen
└── vite.config.ts
# (capacitor.config.ts, ios/, android/ added in the Capacitor phase)
```

### 3.1 Scene flow
`Boot → Menu → Select → Launch → Battle → Result → (Menu | Select)`

### 3.2 Determinism (for future online play)
- Fixed physics timestep (e.g. 60 Hz) inside `BattleScene.update`.
- Inputs captured per-tick. This buys us the option of lockstep netcode
  later without rewriting the loop.

---

## 4. Build Phases

> **Web first.** Phases 0–4 are pure web — playable in mobile Safari and
> Chrome. Capacitor wrapping happens in Phase 5, once the game is fun.

### Phase 0 — Skeleton (1–2 days, web)
- Vite + TS + Phaser + Matter set up.
- Empty `BattleScene` with a circular arena and one spinner you can
  flick with a touch/mouse drag.
- Landscape lock + "rotate your device" overlay.
- Dev server reachable from a phone on the LAN for real-device testing.

### Phase 1 — Core loop (1 week, web)
- Two-pointer launch input on a split screen.
- Two spinners, simple stats, collisions, ring-out, spin-out, **burst**.
- Win screen and rematch.

### Phase 2 — Game feel (1 week, web)
- Particles, screen shake, sound, `navigator.vibrate` where supported.
- Aim-assist arrow, countdown, transitions.
- 4–6 spinners with distinct stats and metallic baked-sprite visuals.

### Phase 3 — Meta (1 week, web)
- Spinner select UI with stat bars.
- Persistent unlocks and a simple progression curve via `localStorage`
  (all earned in-game, no purchases).
- Solo vs AI mode.

### Phase 4 — Web polish & deploy
- Static-host deploy (Cloudflare Pages / Netlify / Vercel).
- Mobile-browser QA (iOS Safari, Android Chrome) on several screen sizes.
- Balance pass.
- Privacy policy page hosted alongside the game.

### Phase 5 — Native wrap (Capacitor)
- Add Capacitor, generate `ios/` and `android/` projects.
- Swap the `Storage` interface implementation to `@capacitor/preferences`.
- Swap web vibrate to `@capacitor/haptics`.
- Lock landscape via `@capacitor/screen-orientation`; immersive status bar.
- Icons, splash screens, signing.
- TestFlight / Play Internal Testing builds.
- "Made for Kids" / "Designed for Families" submission.

---

## 5. Decisions Log

All initial open questions have been resolved:

| # | Question        | Decision                                              |
|---|-----------------|-------------------------------------------------------|
| 1 | Orientation     | Landscape, locked.                                    |
| 2 | Burst mechanic  | In v1.                                                |
| 3 | Monetisation    | None — completely free, no ads, no IAP.               |
| 4 | Art direction   | Metallic-realistic (3D-baked sprites).                |
| 5 | Audience        | Under 13 — COPPA-compliant (see §2.7).                |
| 6 | Online play     | Not required; online phase dropped.                   |
| 7 | Platform order  | Web first (Phases 0–4); Capacitor wrap in Phase 5.    |

Ready to start Phase 0.
