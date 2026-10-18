# GAME APPLICATION - DEPARTMENT OF SOFTWARE ENGINEERING

**MIRHAZAR KHAN** · SHADOWFORM cooperative heist · 2–4 spirits

**Published build 17** · Source **0996a019**

This folder contains the multiplayer update dated **7 October 2026**, including the prebuilt game, room server and editable source. Start here to avoid launching an older static copy.

## Play together on the same Wi-Fi or LAN

1. Extract the entire ZIP folder.
2. The host installs [Node.js](https://nodejs.org/en/download), version **22.13 or newer**. Teammates only need a recent browser.
3. On Windows, the host double-clicks **Start-Game.bat**. On macOS/Linux, open a terminal in this folder and run `node tools/serve.cjs`.
4. Keep the server window open. It prints a local URL for the host and a Wi-Fi/LAN URL for teammates. Everyone opens the **same host's URL**. If Windows asks about network access, allow the server on your private network.
5. Choose a name and color. The host selects **Create room**; teammates enter its six-character code and select **Join**.
6. Everyone selects **Ready**. The host selects **Launch heist**. Each player's living title-screen field flows into the game.

Do not start a separate server on every computer: those servers would have separate rooms. Do not double-click `index.html`; browser GPU assets and room requests need the included server. A generic static server can show solo mode but cannot host multiplayer rooms.

A school Wi-Fi network may isolate devices from one another. Use a shared LAN or hotspot if the host's printed LAN URL cannot open. This launcher serves the game to the local network; it does not set up Internet port forwarding.

## Hosted play

Open [the hosted game](https://spirit-ink-arena.mirhazarkhanchandio.chatgpt.site). Friends use that same URL, then the room code. The website retains its current private access settings. A copied room invite does not bypass website access; use the LAN launcher for classmates who cannot open the hosted page.

Select **Start solo** without joining a room to play the original solo infiltration.

## Controls

| Input | Action |
| --- | --- |
| WASD / arrows | Smooth camera-relative movement |
| Mouse / drag | Look; click the scene to capture the mouse |
| Shift | Fast, brighter movement with speed blur |
| Hold C | Low vapor through gaps and beneath laser bars |
| E | Context-sensitive object or wall mimicry; E releases |
| Q | Attach/release a wall; W/S climb, A/D slide |
| Hold Space, then release | Aim a straight phase dash; release to travel up to 36 metres |
| Hold F | Link a relay or restore a nearby captured teammate |
| G | Cast a colored echo lure: 20 cohesion, 12-second recharge |
| V | Mark a route for everyone |
| X | Charcoal scan and shared red sentinel marks; two simultaneous scans slow the world |
| R | Consume a nearby sentinel; one player owns each consumption |
| P / Escape | Local menu; patrols and resource timers keep running |

In multiplayer, aiming a dash does not pause the shared world. Capture locks your movement until another spirit restores you. Two separate spirits must hold the lobby relays and the raised security relays. Download the key and bring every connected player to rooftop extraction. See **MULTIPLAYER.md** for timings and strategies.

## Smooth play

Keep particle quality on **Auto** first. Choose **4K** or **8K** for a lighter field without changing the mission. Each teammate also has a distance-based GPU particle budget. The game sends emitter motion and gameplay state rather than thousands of particle coordinates. Real-device frame rates and network latency depend on hardware and connection quality.

The host should keep the game tab visible. The room can hand patrol simulation to another visible player if the host goes away. Refreshing the same tab attempts to restore its session and location; leaving a room clears that session. Rooms expire after six hours, and a disconnected slot is retained for about 45 seconds.

## Source and rebuilding

The prebuilt game runs without `npm install`. To edit it, run `npm ci`, edit `src/` or `app/`, then run `npm run build` and restart the server. `app/` and `dist/client/` should carry the same multiplayer bundle. Automated checks are described in `README.md`.

The original Spirit simulation is credited to **Edan Kwan** under its MIT license. Keep **LICENSE.md** with redistributed copies.
