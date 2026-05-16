# Spin Wars — Design & Tech Plan

A Beyblade-inspired, two-player local game where each player swipes a rip cord
to launch a spinning top into a shared circular arena. Spinners collide under
realistic 2D physics, losing angular velocity over time and through impacts,
until one is knocked out of the ring, stops spinning, or is destroyed.

Target platforms: **iOS, Android, and Web** from a single codebase.

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
- **Burst** (optional, later) — Sustained high-impact damage breaks the
  spinner into parts.

### 1.4 Spinner stats
| Stat        | Effect                                                |
|-------------|-------------------------------------------------------|
| Mass        | Momentum on impact, resistance to being pushed.       |
| Friction    | How fast RPM decays from contact with the arena.      |
| Max RPM     | Cap on launch energy.                                 |
| Perimeter   | Smooth ring (defense), toothed (attack), heavy rim    |
|             | (stamina). Shape drives collision response.           |
| Recoil      | How much energy bounces back to the attacker.         |

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
- **Phase 2**: Single-device tournament bracket; cosmetic unlocks.
- **Phase 3**: Async online (reshare last opponent's launch); then realtime.

---

## 2. Tech Selection

### 2.1 Recommended stack

| Layer            | Choice                                     | Why                                                                                         |
|------------------|--------------------------------------------|---------------------------------------------------------------------------------------------|
| Engine           | **Phaser 3** (TypeScript)                  | 2D-first, mature, free, runs natively in the browser; perfect for a top-down arena.         |
| Physics          | **Phaser Matter.js integration**           | Rigid bodies, circular constraints, restitution, friction — exactly what spinner collisions need. |
| Language         | **TypeScript**                             | Type-safe game state, refactor-friendly as content grows.                                   |
| Native wrapper   | **Capacitor** (by Ionic)                   | Wraps the web build as iOS + Android apps; one codebase, minimal native glue.               |
| Web build / dev  | **Vite**                                   | Fast HMR, easy TS + asset pipeline.                                                         |
| Audio            | **Howler.js** (or Phaser's built-in audio) | Sprite-based audio, mobile-friendly unlock handling.                                        |
| State / UI menus | **Plain TS + small store** (Zustand-style) | Menus are simple; avoid React unless we want richer UI later.                               |
| Assets pipeline  | **TexturePacker** + **Aseprite**           | Sprite atlases keep mobile draw calls down.                                                 |
| Persistence      | **Capacitor Preferences** + **IndexedDB**  | Cross-platform key-value + structured storage for progression.                              |
| Analytics/crash  | **Sentry**                                 | Web + native SDKs; one project.                                                             |
| CI/CD            | **GitHub Actions** + **EAS-style scripts** | Build web to a static host; build iOS/Android via Capacitor + Xcode/Gradle in CI.           |

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
- Spinners rendered as a base sprite + an animated rim overlay rotating at
  visual RPM (capped so it never looks stroboscopic).

### 2.6 Cross-platform packaging
- `npm run build` → static web bundle (deploy to Cloudflare Pages /
  Netlify / Vercel for the web version).
- `npx cap sync ios && npx cap open ios` → Xcode project; sign + ship.
- `npx cap sync android && npx cap open android` → Android Studio; sign +
  ship.
- Capacitor plugins used:
  - `@capacitor/haptics` for rip-cord feedback.
  - `@capacitor/preferences` for save data.
  - `@capacitor/screen-orientation` to lock landscape.
  - `@capacitor/status-bar` for immersive mode.

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
├── capacitor.config.ts
├── ios/                     # generated by Capacitor
├── android/                 # generated by Capacitor
└── vite.config.ts
```

### 3.1 Scene flow
`Boot → Menu → Select → Launch → Battle → Result → (Menu | Select)`

### 3.2 Determinism (for future online play)
- Fixed physics timestep (e.g. 60 Hz) inside `BattleScene.update`.
- Inputs captured per-tick. This buys us the option of lockstep netcode
  later without rewriting the loop.

---

## 4. Build Phases

### Phase 0 — Skeleton (1–2 days)
- Vite + TS + Phaser + Matter set up.
- Empty `BattleScene` with a circular arena and one spinner you can
  flick.
- Capacitor wrappers building on iOS + Android.

### Phase 1 — Core loop (1 week)
- Two-pointer launch input on a split screen.
- Two spinners, simple stats, collisions, ring-out, spin-out.
- Win screen and rematch.

### Phase 2 — Game feel (1 week)
- Particles, screen shake, haptics, sound.
- Aim-assist arrow, countdown, transitions.
- 4–6 spinners with distinct stats and visuals.

### Phase 3 — Meta (1 week)
- Spinner select UI with stat bars.
- Persistent unlocks and a simple progression curve.
- Solo vs AI mode.

### Phase 4 — Polish & ship (ongoing)
- Web deploy.
- TestFlight / Play Internal Testing builds.
- Analytics, crash reporting, balance pass.

### Phase 5 — Online (stretch)
- Async "ghost" launches (record opponent's rip + replay).
- Realtime via WebRTC datachannels using the deterministic loop from §3.2.

---

## 5. Open Questions

1. **Orientation** — Landscape locked? (Recommended: yes, for split-screen.)
2. **Burst mechanic** — In v1 or save for v2?
3. **Monetisation** — Free + cosmetics? Paid? Ads? (Affects analytics +
   billing plugin choice.)
4. **Art direction** — Cartoon, metallic-realistic, or neon-arcade?
5. **Audience age** — If <13, COPPA / no analytics that profiles.
6. **Online play priority** — Phase 5 stretch or earlier?

Answers to these will tighten Phase 1–3 scope before we start coding.
