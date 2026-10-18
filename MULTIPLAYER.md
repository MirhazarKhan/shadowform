# SHADOWFORM · No one left behind

**GAME APPLICATION - DEPARTMENT OF SOFTWARE ENGINEERING**  
**MIRHAZAR KHAN**

Two to four spirits steal a shared data key from an illustrated industrial facility. Every player remains a fluid GPU particle field, with a different hue: crimson, cyan, violet or amber. Team labels and the crew panel identify players as well as color.

## The cooperative loop

Observe the same sentinels and security sweeps. Split to reach different relays, distract a patrol with an echo, then hold the link together. Regroup to stabilize cohesion and restore anyone who is captured. Carry one shared key to the roof and leave together.

| Stage | Crew objective | Timing |
| --- | --- | --- |
| Lobby | Two different spirits hold F at relays A and B near opposite sides of the shutter | 2.5 seconds together |
| Security gallery | Two different spirits hold F at the raised relays on the west and east galleries | 2.5 seconds together |
| Data vault | One spirit holds F at the vault terminal while the others cover the approach | 3 seconds |
| Rooftop | Every connected spirit stands on extraction in vapor form with facility alert below 50% | 1.8 seconds together |

Relay progress fades when the link breaks. A solid disguise cannot operate a terminal. Low vapor and elevated routes still bypass hazards, but the shared key requires completing both paired relay stages.

## Ways to help each other

**Resonance.** Within nine metres of a teammate across clear space, vapor recovers cohesion faster. A linked disguise drains cohesion 30% more slowly. Harsh security lighting still destabilizes it. A thin colored connection and the crew status show the link.

**Echo lure — G.** Aim at visible terrain and cast an echo within 36 metres. It costs 20 cohesion, lasts eight seconds, and recharges for twelve seconds. Nearby sentinels investigate its sound. Cast from cover to clear a teammate's route; an already recognized target remains a sentinel's priority.

**Shared scan — X.** Your charcoal scan highlights sentinels red and leaves nearby sentinel marks visible to the crew for six seconds. Two live spirits scanning together slow the shared world to 65% speed. One scan supplies intel while the world stays live. Each player's scan charge still drains.

**Route mark — V.** Mark the aimed terrain within 44 metres for six seconds. Everyone sees a colored cue. Use it to suggest cover or a relay approach.

**Restore — hold F.** Capture traps one spirit instead of immediately ending the heist. Another vapor spirit must stand within about 3.2 metres across clear space and hold F for 1.8 seconds. Restore progress appears in the crew meter. The restored spirit recovers at least 55 cohesion. If every connected spirit is captured, the host can retry the heist.

**Consume — R.** The first valid player claims the sentinel during the existing venom-style sequence. The crew sees the consuming field and collapsing core. Other spirits can lure nearby patrols away while that player is occupied. A sentinel is removed once from the shared world; simultaneous consumption attempts cannot duplicate the kill.

**Phase dash.** Hold Space to aim the existing straight direction line, then release for swift particle transit. The normal curl remains alive, with stronger blur and red lightning. Individual aiming stays live in co-op; two coordinated scans supply team time dilation.

## Room behavior

Create/join by six-character code, choose Ready, then the host launches. A color already in use is assigned another available color. A late arrival can enter a running heist from the lobby and help the crew reach extraction. The room holds at most four spirits.

Pause is local. Your spirit remains in the world. Patrols, cohesion drain, scan charge and committed abilities continue while the menu is open. Keep the tab visible when possible. If the elected host disconnects or hides the tab, an available peer takes over from the last shared snapshot. Progress, captures, consumed sentinels and patrol positions survive that handoff.

Refreshing the same tab attempts to restore its short-lived session and saved location in vapor form. The room retains a disconnected slot for about 45 seconds and expires after six hours. Explicitly leaving clears the session; joining again creates a new spirit. Extraction waits for currently connected players, so an offline player does not hold the crew forever.

## Network and rendering

Each device simulates its own particles. Direct WebRTC links carry compact emitter/stance snapshots at up to 30 updates per second and reliable gameplay actions. Same-origin HTTP signaling and room snapshots provide a fallback when direct connections fail. Only the elected host writes the patrol world; epochs and snapshot ticks reject stale hosts and old updates. Server event IDs prevent repeated actions during retries.

The hosted room service runs on a Worker with D1. The downloadable server runs the same API and generated schema on local SQLite, using Node.js 22.13 or newer. Multiplayer needs this room service; a static-only mirror cannot create rooms. Website sharing remains separate from room membership.

Local rendering keeps the original Spirit curl/faceted appearance with WebGPU compute when available and WebGL GPU texture simulation otherwise. Teammates run independent WebGL GPU fields using those same Spirit shaders and a shared immutable morph atlas. Counts fall from 8K near a teammate to 4K, 2K or 1K at longer distances, capped by the player's particle setting. Disguises remain opaque objects with a smoky core. Motion, wall contact, low vapor, straight transport and consume shells travel as a few uniforms, never as full particle buffers.

The current build is a cooperative prototype with trusted players and one three-hub mission. It does not include accounts, competitive matchmaking, dedicated anti-cheat, voice chat or a TURN relay. Automated tests cover room consistency, rules and independent production bundles; native software GPU checks cover particle correctness. Real browser/device visuals, frame rates and cross-network latency need hands-on playtesting.
