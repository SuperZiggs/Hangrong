# Frozen acceptance requirements — Cuộc đua giành khách

Approved by user on 27 October 2026: implement the laptop action game and complete asset set. This packet contains observable requirements/contracts, not implementation algorithms. Independent test author reads this packet and current code only; do not read the implementation plan or future product code before defining tests.

## Experience and rules

- A device represents one solo player or one group, same rules. Minimum start3; support at least26 in the same room, no six-player ceiling. Host creates, people join with name and code, host starts/pauses/resumes/replays, recovery transfers player control. Duplicate names remain distinct identities.
- WASD/arrows move; diagonal equals straight speed. E interacts, Space dashes. Held key only produces one interaction/dash edge; blur/hidden/modal/typing stops local game input. Frame rate does not change simulation distance.
- Solid player bodies obstruct others; dash pushes briefly, never tunnels walls. Initial dash duration200ms, cooldown4000ms, push protection1000ms. Protected players retain solid bodies. Contact never drops an order or removes coins. No death/elimination.
- One carried order per player; common unclaimed orders contested; exactly one owner and one settlement. Only server authorizes pickup/delivery, and only within interaction distance. Private orders cannot be picked by others or exposed to others' player views.
- 20 starting coins, common payout10, P gate fee2 initially and4 later. Charge at most once/order, lock fee on gate crossing, settle on delivery; zero-balance players can keep playing. Abandon requires holding E1000ms at own shop, no payout and no simultaneous upgrade purchase.
- Promotion costs8, emits3 public orders across20s, cooldown45s. Private channel costs40 once, payout8, at most one own order waiting, interval>=20s. Shared route costs12×frozen roster count, donate5 or remaining amount; never overspend/double-charge/overfund. Others benefit when path opens. Buying/spending affects final coins, no automatic refunds.
- Timing measured from host start: practice[0,60000), stage1[60000,180000), stage2[180000,360000), stage3[360000,540000), results>=540000; explanatory minute ends600000 but scoreboard remains. Reset all practice progress at60000. Preserve progress between stages; fee change applies prospectively to new gate crossings. At540000 stop scoring. Announce changes10000ms ahead. Pause freezes all timers, motion, effects, spawning and cooldowns, then resumes without burst catch-up.
- Highest remaining coins wins; equal coins share rank. Side stats never modify ranking. No quiz questions needed to play. Fictional economy is not evidence about a real company.
- Reconnect retains identity, acknowledged order and coins; no teleport-to-home/auto-delivery. Input expiry250ms stops movement; disconnect around3000ms removes blocking body. Old/recovered-away tokens and stale runId/seq cannot control a player. No new entrant after start; replay resets match but retains roster. Room expiry24h.
- Keep original quiz routes/data and security boundaries unchanged. New paths under /arcade and /api/arcade. Player tokens never enter URL, QR or public snapshots.

## Observable HTTP and WebSocket contract

Site API prefix `/api/arcade/rooms`; realtime service equivalent prefix `/rooms`. Test helpers may select an origin via ARCADE_SERVICE_URL/ACCEPTANCE_BASE_URL. Errors JSON `{error:{code,message}}`, meaningful4xx and no stack/token leaks.

- POST create `{requestId,hostToken}` -> `{code,hostPath,joinPath,expiresAtMs}`. Code eight uppercase base32 characters. Same request/capability retries return same room; same request with different capability rejected.
- POST `/:code/join` `{requestId,name,playerToken}` -> `{code,playerId,playPath}`. Capability is random32 bytes base64url. Saved capability retry restores same entrant. Names trimmed2–30 chars; duplicate display names allowed.
- GET `/:code/bootstrap`, Bearer optional -> `{role:'public'|'host'|'player',wsUrl,snapshot,you?:{playerId,name}}`. Snapshot `runId,tick,elapsedMs,phase,paused,players,orders,gateFee,sharedRoute,lastInputSeq`; includes a renderable map. Public/player views must not reveal capability hashes or other players' private orders. Host sees roster and game overview but doesn't impersonate players.
- POST `/:code/host`, Bearer host token: `{requestId,runId?,action:'start'|'pause'|'resume'|'replay'|'rename'|'remove'|'issue-recovery',payload?}`. Player-target payload `{playerId,name?}`. Host controls idempotent, role checked every command; issue-recovery returns `{recoveryCode}`.
- POST `/:code/recover` `{recoveryCode,newPlayerToken}` -> `{code,playerId,playPath}`; code single-use with retry recovery response lost supported for same replacement capability.
- GET `/:code/export`, Bearer host token -> result CSV only after results.
- WS `/rooms/:code/socket`: first message within5s `{type:'auth',token?}`; origin validated. Server `{type:'snapshot',snapshot}` or `{type:'error',error:{code,message}}`. Input `{type:'input',input:{runId,seq,moveX:-1|0|1,moveY:-1|0|1,interactPressed,dashPressed,abandonHeld}}`. Positions, coins or fake elapsed are not trusted input. Optional heartbeat `{type:'ping',id}` -> `{type:'pong',id}` for measurements. Frame/input size/frequency bounded without breaking26 players sharing one classroom IP.

## Unit entry points frozen for rule tests

`shared/arcade/world.ts`: `createWorld({seed,initialCoins,roster})` and `stepWorld(world, inputsMap, dtMs)`; `shared/arcade/motion.ts`: `advanceMotion(world,inputsMap,dtMs)`; `shared/arcade/snapshot.ts`: `projectSnapshot(world,actor)`; `shared/arcade/maps.ts`: `generateMap(playerCount,seed)`.

`Participant={playerId,name}`; `Actor={role:'public'|'host'|'player',playerId?}`. World exposes `players` as a playerId-keyed record with `x,y,coins,carriedOrderId,dashRemainingMs,dashCooldownMs,pushProtectionMs,connected`, plus `orders` record, `elapsedMs,phase,paused,map,sharedRoute,gateFee`. Order fields include `id,pickup:{x,y},delivery:{x,y},value,ownerId,privateOwnerId,lockedFee,settled`. Tests may set up isolated worlds at boundary states to exercise rules; no production endpoint may mutate timing, positions or coins for tests. Supplemental internal fields are implementation-owned.

Missing behavior is expected now. Dynamic imports with an explicit assertion explaining the absent feature can establish RED; do not hide import errors that indicate a broken test setup. Prefer API/E2E baselines404 over syntax/dependency failures.

Unit setup clarification27/10: inputsMap is a `Map<PlayerId,InputFrame>` containing the exact WS input fields above; World also exposes runId. `Point={x,y}`; `Rect={x,y,w,h}`. Map exposes width,height,walls:Rect[],gate:Rect,sharedBarrier:Rect,sharedRouteRect:Rect,pickups:Point[],deliveries:Point[],shops:Point[] and stations:{kind:'promotion'|'private-channel'|'contribution',ownerId?:string,x,y}[]. Every player has home:Point. createWorld resolves station ownership against its roster. Test gate fee by crossing into gate rect while carrying a prepared order. Snapshot includes leaderboard:{playerId,name,coins,rank,delivered,feesPaid,contributed,privateChannel}[]. These are observable testing contracts, not algorithms. Independent author may construct isolated world/order fixture states in unit tests.

## UI and asset outcomes

- `/arcade`: visible Vietnamese game title, create/join controls. `/arcade/play/:code`: world canvas, readable coins/order/net fee/timer, contextual E and dash feedback. `/arcade/host/:code`: roster, min3 start, overview and host controls. Results and pause/offline/reconnect/interrupted have distinct readable states. `data-testid="arcade-world"` identifies the playfield for screenshots; accessibility uses real button labels/DOM controls.
- Asset catalogue at `E:/MLN122/docs/superpowers/plans/2026-10-27-cuoc-dua-gianh-khach-assets.json`:47 required groups,305 visual frames including72 courier frames,5 screen assets,2 fonts,16 SFX,2 music loops. Final runtime files must exist with metadata/alpha/provenance; JSON catalogue alone is not a produced asset set.
- Character four directions; same scale/foot anchor(48,88) on96×96 frames; animation counts per direction idle2/run6/dash2/bump2/celebrate6. Carrying overlay remains aligned. No final emoji/rectangular placeholders for character/environment art.
- Readable Vietnamese at1366×768 and125% zoom; small viewport sane for lobby/spectating. HUD normally<=20% playfield. Audio mute default, user can enable/configure; visual state readable while muted.

## Evidence required

Traceable matrix + runnable risk-based unit/integration/targeted E2E tests before production edits. Record true RED against current code. Cover boundary, role/room isolation, races, retry, malformed input and old-quiz regression. Real26-socket activity plus browser render/load metrics and one real600s run, not fabricated success or tests that only open a lobby. Classroom Wi-Fi/human playtest cannot be claimed from automated local clients; report that separate limit honestly.

Final unit field clarification: sharedRoute={cost,contributed,open}; player.privateChannel:boolean and player.promotionCooldownMs:number may be observed, but tests should prefer coins/order outcomes. New orders start ownerId=null, privateOwnerId=null, lockedFee=null, settled=false; pickup/delivery always Point.
