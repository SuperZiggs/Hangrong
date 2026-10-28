# Cuộc đua giành khách Implementation Plan

> Supersession — 2026-10-28: the user explicitly removed the legacy quiz. This historical plan's quiz-preservation and quiz-regression instructions no longer govern the product; use [arcade-only-test-matrix.md](../arcade-only-test-matrix.md) for the active removal/hosting contract. Historical arcade implementation reports and evidence remain unchanged.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Xây game hành động nhiều người trên laptop, có tranh đơn/cản đường, ván khoảng 10 phút và bộ hình ảnh, animation, UI, FX, âm thanh hoàn chỉnh theo Game Studio.

**Architecture:** Giữ ứng dụng React/Vinext hiện có cho sảnh, trang người chơi, MC và HUD; Phaser chỉ vẽ thế giới và chuyển thao tác thành input. Mô phỏng TypeScript độc lập chạy trên một Cloudflare Durable Object cho mỗi phòng, đồng bộ WebSocket; triển khai service realtime riêng vì cấu hình Sites hiện tại chưa khai báo namespace Durable Objects. Kiểm chứng realtime trước khi sản xuất toàn bộ asset, giữ nguyên đường chơi và dữ liệu game câu hỏi.

**Tech Stack:** TypeScript 5.9.3, React 19.2.6, Vinext/Vite hiện có; đề xuất pin Phaser `4.2.1` sau smoke tương thích; Cloudflare Workers + Durable Objects + WebSocket; Vitest/Playwright/Wrangler có sẵn; image_gen tích hợp + script sprite của Game Studio; SVG/CSS cho đồ họa UI đơn giản. Không thêm framework physics, state store hoặc thư viện âm thanh nếu engine và nền tảng đã đáp ứng.

**Spec:** `E:/MLN122/docs/superpowers/specs/2026-10-27-cuoc-dua-gianh-khach-design.md`.

**Art Spec:** `E:/MLN122/docs/superpowers/specs/2026-10-27-cuoc-dua-gianh-khach-art-direction.md`.

**Asset Catalogue:** `E:/MLN122/docs/superpowers/plans/2026-10-27-cuoc-dua-gianh-khach-assets.json` — 47 nhóm bắt buộc, trạng thái hiện tại đều là planned.

## Global Constraints

- Người dùng yêu cầu lập kế hoạch và dùng Game Studio; lượt này chưa xây game, chưa sinh bộ asset cuối và chưa triển khai website.
- Mỗi thiết bị điều khiển một nhân vật, có thể đại diện cá nhân hoặc nhóm; tối thiểu 3 người tham gia, không giới hạn sản phẩm cố định sáu nhóm; kiểm chứng khoảng 26 người đang thực sự thao tác.
- WASD/mũi tên di chuyển, E tương tác, Space lướt; đi chéo không nhanh hơn; giữ phím không spam lướt/tương tác. Mất focus dừng input.
- Người chơi cản nhau, lướt xô nhẹ, giữ nguyên hàng khi va chạm, không máu/chết/loại giữa ván.
- Một người mang tối đa một đơn; một đơn chỉ có một chủ; giao hợp lệ trả tiền đúng một lần.
- Thông số khởi đầu: 20 xu; đơn thường 10; phí P 2 rồi 4 xu; tối đa một phí P trên một đơn, cố định theo lúc đi qua; phí trừ khi giao, không yêu cầu số dư để tiếp tục chơi.
- Khuyến mãi 8 xu/3 đơn công khai/20 giây, hồi 45 giây; kênh riêng 40 xu/đơn 8 xu/tối đa một đơn chờ/sinh không nhanh hơn mỗi 20 giây; lối chung 12 xu × số người đã chốt, góp nấc 5 hoặc phần còn thiếu. Đây là số khởi đầu để cân chỉnh, không được báo là đã cân bằng.
- Lướt khởi đầu 0,2 giây, hồi 4 giây, miễn lực đẩy tiếp 1 giây; nhân vật vẫn có thân va chạm khi miễn đẩy.
- Timeline: 0–60 giây chạy thử; 60–180 chặng 1; 180–360 chặng 2; 360–540 chặng 3; 540–600 kết quả/chốt. Reset toàn bộ kết quả thử tại giây 60; giữ tiến độ giữa các chặng; báo trước sự kiện 10 giây.
- Không nhận người mới giữa trận; reconnect giữ danh tính và tiến độ đã xác nhận. Hết input thì dừng; mất kết nối khoảng 3 giây thì thân không còn chắn người khác.
- Server quyết định vị trí, va chạm, đơn, xu, phí và thời hạn. Client không tự sửa thành tích; đồng xu cùng hạng.
- Game mô phỏng hư cấu; MC chốt cả lợi ích nền tảng lẫn rủi ro lệ thuộc. Không biến thành câu hỏi trắc nghiệm và không suy từ luật chơi ra kết luận pháp lý về doanh nghiệp thật.
- Giữ nguyên `.openai/hosting.json` project_id, API/room/data game câu hỏi. Chế độ mới dưới `/arcade`; không sửa hệ thống điểm 90 của chế độ cũ thành xu.
- Mọi file triển khai bên dưới tính từ `E:/MLN122/web-game`; tài liệu kế hoạch/thiết kế hiện lưu ở `E:/MLN122/docs/superpowers/`. Repo Git thực tế nằm trong `web-game`, không ở `E:/MLN122`.

## Review Focus

1. Phím giữ/đi chéo/mất focus/FPS khác nhau: tốc độ và số lượt E/Space vẫn đúng; pin ở Task 1 và 6.
2. Hai người nhận/giao/góp cùng lúc hoặc retry sau mất phản hồi: chỉ một kết quả hợp lệ, không nhân xu/thu dư; pin ở Task 3–4.
3. Cản người ở cổng/điểm giao, dash sát tường và ngắt kết nối để chắn đường: có đường thoát, không xuyên tường/teleport/khóa người vĩnh viễn; pin ở Task 1–2 và 8.
4. Đổi chặng/pause/đổi tab/replay khi input và event đang chờ: một timeline chung, không tính lệnh ván cũ, không hồi tố phí; pin ở Task 2, 4 và 8.
5. Sprite đúng DOM nhưng canvas sai anchor/alpha/độ sâu, HUD tiếng Việt bị che ở 125%, hoặc 26 client làm giật: cần ảnh trong engine và số đo thực, không chỉ DOM assertion; pin ở Task 5–8.

## 1. Bằng chứng hiện tại và quyết định hạ tầng

Đã đọc trực tiếp `package.json`, `vite.config.ts`, `worker/index.ts`, `hooks/useRoom.ts`, `lib/polling.ts`, `server/room-store.ts`, `server/capabilities.ts`, các API room, cấu hình test và hosting.

- Dự án dùng React/Vinext, Worker và D1; chưa có Phaser. Cây `public` hiện chỉ có favicon, chưa có bộ game art.
- `useRoom` poll HTTP; `pollDelay` là 1.000 ms khi chơi và 3.000 ms trong sảnh/tab ẩn. Nhịp đó không phù hợp xác nhận va chạm thời gian thực.
- D1 lưu JSON trạng thái bằng version CAS; không đưa tọa độ 20 lần/giây qua đường ghi D1 này.
- Có thể tham khảo cách tạo capability 32 byte, khôi phục phiên, tên hiển thị và các bài test cũ. `server/capabilities.ts` hiện gắn với kiểu Room/Actor của quiz, nên không import nguyên engine/auth đó vào mô phỏng mới.
- `.openai/hosting.json` hiện khai báo D1 và project_id, không có binding Durable Objects. Không tự thêm field hosting không được hỗ trợ rồi cho rằng triển khai sẽ hoạt động.

Quyết định đề xuất: service realtime riêng trong `realtime/`, dùng Wrangler đã cài; mỗi mã phòng ánh xạ đến một Durable Object. HTTP của site proxy đến service theo URL cấu hình, WebSocket của trình duyệt kết nối trực tiếp tới URL WSS đã allowlist. Service tự giữ metadata, capability hash, roster và kết quả của chế độ mới; D1 quiz không phải nguồn thẩm quyền thứ hai.

Khả năng WebSocket/DO là có tài liệu chính thức, nhưng quyền tạo/deploy service mới từ môi trường/tài khoản hiện tại chưa được kiểm chứng. **Gate đầu tiên** phải ghi rõ kết quả local, đường staging WSS có thể dùng và quyền/binding còn thiếu. Nếu không có đường hosting realtime khả thi, vẫn bàn giao bản thử local và báo lựa chọn cần quyết định; không âm thầm chuyển về polling, ép xuống sáu người hoặc gọi bản frontend-only là multiplayer hoàn chỉnh.

Trong trận chạy timer mô phỏng; không hứa hibernation trong lúc timer còn hoạt động. Dừng timer ở sảnh/pause/kết quả và persist trạng thái cần thiết trước khi có thể ngủ. Khi thức dậy từ một trạng thái active chưa hoàn tất do sự cố, báo trận gián đoạn, không tự cấp kết quả giả.

## 2. Cấu trúc file dự kiến

| Vùng | File/chức năng |
| --- | --- |
| Mô phỏng thuần TS | `shared/arcade/types.ts`, `config.ts`, `maps.ts`, `motion.ts`, `orders.ts`, `economy.ts`, `clock.ts`, `world.ts` |
| Giao thức | `shared/arcade/protocol.ts`, `snapshot.ts`; schema tách input/snapshot khỏi state riêng |
| Service realtime | `realtime/worker.ts`, `room.ts`, `auth.ts`, `protocol.ts`, `wrangler.jsonc`; một DO/phòng |
| Adapter site | `server/arcade/proxy.ts`; `app/api/arcade/rooms/route.ts`, `app/api/arcade/rooms/[code]/[operation]/route.ts` |
| Trang mới | `app/arcade/layout.tsx`, `page.tsx`, `play/[code]/page.tsx`, `host/[code]/page.tsx` |
| Client realtime | `game/arcade/client.ts`, `input.ts`, `prediction.ts`, `bridge.ts` |
| Phaser | `game/arcade/phaser/create-game.ts`, `BootScene.ts`, `CityScene.ts`, `ActorView.ts`, `FxView.ts`, `camera.ts` |
| DOM UI | `components/arcade/ArcadeShell.tsx`, `Lobby.tsx`, `Hud.tsx`, `HostView.tsx`, `Results.tsx`, `StatusOverlay.tsx`, `arcade.css` |
| Asset runtime | `game/arcade/assets/manifest.ts`, `animations.ts`; `public/arcade/assets/{characters,environment,ui,fx,screens,audio,fonts}` |
| Asset nguồn | `assets/arcade/{seeds,raw,frames,previews,prompts}`; `provenance.json`, `licenses/` |
| Công cụ dự án | `scripts/run-arcade-realtime.mjs`, `normalize-arcade-sprites.py`, `pack-arcade-atlas.mjs`, `verify-arcade-assets.mjs`, `arcade-load.mjs` |
| Kiểm tra | `tests/unit/arcade/*.test.ts`, `tests/api/arcade-*.spec.ts`, `tests/e2e/arcade-*.spec.ts`, `tests/support/arcade.ts` |

Các module có trách nhiệm thật trong bản đầu, không tạo framework/plugin system tổng quát. Giữ game rules ngoài Phaser và component React.

## 3. Hợp đồng liên kết các task

```ts
type PlayerId = string;
type Direction = 'N' | 'E' | 'S' | 'W';
type MatchPhase = 'lobby' | 'practice' | 'stage1' | 'stage2' | 'stage3' | 'results' | 'interrupted';
type MoveAxis = -1 | 0 | 1;
type InputFrame = {
  runId: string; seq: number; moveX: MoveAxis; moveY: MoveAxis;
  interactPressed: boolean; dashPressed: boolean; abandonHeld: boolean;
};
type MatchOptions = { seed: string; initialCoins: number; roster: Participant[] };
type StepResult = { events: GameEvent[]; phaseChanged: boolean };
type PublicSnapshot = {
  runId: string; tick: number; elapsedMs: number; phase: MatchPhase; paused: boolean;
  players: PublicPlayer[]; orders: PublicOrder[]; gateFee: number;
  sharedRoute: { cost: number; contributed: number; open: boolean };
  lastInputSeq: Record<PlayerId, number>;
};
```

Định nghĩa `Participant`, `GameEvent`, `PublicPlayer`, `PublicOrder`, `World`, `Actor` trong `types.ts` ở Task 1; các task sau import đúng những tên đó. `World` là state mô phỏng không chứa token; metadata capability thuộc `realtime/room.ts`. Snapshot không chứa token hash, receipt nội bộ hoặc đơn riêng của người khác. MC thấy đơn công khai và thống kê phù hợp, không cần quyền điều khiển nhân vật.

Các interface chính:

- `createWorld(options: MatchOptions): World`.
- `advanceMotion(world: World, inputs: ReadonlyMap<PlayerId, InputFrame>, dtMs: number): GameEvent[]`.
- `stepWorld(world: World, inputs: ReadonlyMap<PlayerId, InputFrame>, dtMs: number): StepResult`.
- `projectSnapshot(world: World, actor: Actor): PublicSnapshot`.
- `generateMap(playerCount: number, seed: string): ArenaMap`.
- `connectArcade(options: ConnectionOptions): ArcadeConnection`; connection có `sendInput`, `subscribe`, `disconnect`.
- `createArcadeGame(parent: HTMLElement, bridge: ArcadeBridge): Promise<() => void>`; hàm trả về dispose.

Không tin thời gian/delta/số xu do client gửi. Khởi đầu simulation 20 Hz, snapshot 10 Hz, input tối đa 20 Hz, render mục tiêu 60 FPS; các nhịp này là cấu hình có đo kiểm. Input quá 250 ms không được làm nhân vật tiếp tục tự chạy. Bộ input có seq và runId; chỉ xử lý E/Space theo cạnh nhấn.

## Task 1: Chứng minh điều khiển, va chạm và đường realtime khả thi

**Files:** Create `shared/arcade/{types,config,maps,motion,world,protocol,snapshot}.ts`, `realtime/{worker,room,auth,protocol}.ts`, `realtime/wrangler.jsonc`, `scripts/run-arcade-realtime.mjs`, `scripts/arcade-load.mjs`, `tests/unit/arcade/motion.test.ts`, `tests/api/arcade-probe.spec.ts`, `docs/arcade/realtime-feasibility.md`. Debug probe local trong `public/arcade/probe.html`, không đưa vào bản phát hành.

**Interfaces:** Produces các kiểu trong mục 3, `createWorld`, `generateMap`, `advanceMotion`, `projectSnapshot` và service local. `world.ts` khởi tạo state; chưa tự triển khai luật tiền/đơn. Probe dùng hình debug và cùng mô phỏng thực, không được giả snapshot để qua gate.

- [ ] Viết RED: `diagonal_speed_equals_straight`, `dash_cooldown_4000`, `dash_duration_200`, `push_immunity_1000`, `dash_never_tunnels_wall`, `three_players_can_escape_gate`; assert tổng quãng đường cùng dt, một dash trước 4.000 ms, miễn lực đẩy 1.000 ms, không vượt collider.
- [ ] Chạy `npx vitest run tests/unit/arcade/motion.test.ts`; xác nhận fail vì hành vi chưa có, không lấy lỗi setup làm RED hợp lệ.
- [ ] Implement mô phỏng cố định 50 ms, chuyển động chuẩn hóa, thân tròn bằng nhau, lực đẩy có giới hạn, substep/swept movement chống xuyên tường khi dash. Bản đồ khởi đầu có hai tuyến và vùng nhận/giao đủ lối vào; kích thước theo band 3–6, 7–14, 15–26. Không thêm physics engine nếu module nhỏ đáp ứng.
- [ ] Implement room actor local: namespace DO riêng, WebSocket, token capability thật, input seq, snapshot, input lease; wrapper dùng Wrangler hiện có. Chạy `node scripts/run-arcade-realtime.mjs --port 5191`, sau đó `npx playwright test --project=api tests/api/arcade-probe.spec.ts`. Kỳ vọng 3 rồi 26 socket thực di chuyển/xô và thấy cùng state; probe nằm trên origin local được allowlist.
- [ ] Chạy `node scripts/arcade-load.mjs --url ws://127.0.0.1:5191 --clients 26 --seconds 120`; ghi số mẫu, tick cost, p95 round-trip, correction và dung lượng. Gate local đề xuất: p95 tick processing <25 ms tại tick 50 ms, p95 application RTT <150 ms trên cùng máy; đây không phải chứng nhận Wi-Fi lớp. Kiểm tra quyền deploy service/WSS staging và ghi bằng chứng, không tạo/deploy tài nguyên mới khi lượt chỉ đang lập kế hoạch.
- [ ] Chỉ tiếp tục sản xuất toàn bộ asset sau khi gate mô phỏng realtime đạt; nếu lỗi, sửa nguyên nhân hoặc báo thay đổi kiến trúc cần quyết định. Giữ snapshot/ảnh debug và commit phần Task 1 khi thực thi trong checkout hợp lệ.

## Task 2: Sảnh, capability, MC và phục hồi kết nối

**Files:** Modify `realtime/{worker,room,auth,protocol}.ts`, `shared/arcade/{types,protocol,snapshot}.ts`; Create `server/arcade/proxy.ts`, hai API route mới ở mục 2, `tests/api/arcade-rooms.spec.ts`, `tests/api/arcade-recovery.spec.ts`, `tests/support/arcade.ts`.

**Interfaces:** Consumes World/Actor/Protocol ở Task 1. Produces create/join/bootstrap/host/recover/export HTTP của chế độ mới; direct WebSocket `/rooms/:code/socket`. Public API site ở `/api/arcade/rooms` và `/api/arcade/rooms/:code/:operation`.

- [ ] RED: hai người không start được, ba người start được; 26 tên/thiết bị và tên trùng vẫn là người khác; create/join retry không nhân roster; token khác không giành phiên. Kiểm tra host-only, tách phòng, từ chối join muộn, recover thu hồi socket cũ và replay từ chối input runId cũ.
- [ ] Chạy `npx playwright test --project=api tests/api/arcade-rooms.spec.ts tests/api/arcade-recovery.spec.ts`; dùng Worker local thật, không mock API.
- [ ] Implement code phòng riêng tám ký tự base32 (`A-Z2-7`), namespace `arcade:` để không lẫn code quiz. Create idempotent: derive tối đa năm candidate từ hash requestId + attempt, DO atomically trả lại room nếu cùng create request/capability. Cùng requestId nhưng capability khác phải lỗi 409, không tạo candidate mới; chỉ thử candidate tiếp khi bị chiếm bởi requestId khác. Token 32 byte base64url, chỉ lưu hash; metadata hết hạn 24 giờ. Storage client dùng prefix `cdgk:` riêng.
- [ ] WebSocket AUTH là message đầu trong 5 giây, không đặt token trên URL; kiểm tra Origin theo allowlist, giới hạn kích thước message/input và tốc độ trước/sau auth. Reconnect ngừng body sau 3 giây, phục hồi vị trí hợp lệ gần vị trí cũ; không đưa về đích hay trả tiền hộ. Khi recover đổi thiết bị, đóng và thu hồi quyền socket cũ.
- [ ] Host start/pause/resume/replay, đổi tên/loại trong sảnh, cấp mã phục hồi và export kết quả; public/projector không có quyền điều khiển. Dừng timer và persist state trước hibernation ở pause/lobby/results; restart bất thường trong active chuyển interrupted. Không hoàn tất ván bằng dữ liệu thiếu.
- [ ] GREEN các API trên, thêm concurrent recover + response-lost retry và cross-room token tests. Kiểm tra snapshot không rò capability/hash. Commit Task 2.

## Task 3: Nhận đơn, giao hàng, phí tuyến và bản đồ chơi được

**Files:** Create `shared/arcade/orders.ts`; Modify `maps.ts`, `world.ts`, `types.ts`; Create `tests/unit/arcade/orders.test.ts`, `tests/unit/arcade/maps.test.ts`, `tests/api/arcade-races.spec.ts`.

**Interfaces:** Produces `applyInteraction(world: World, playerId: PlayerId): GameEvent[]`, `spawnOrders(world: World, dtMs: number): void`, `abandonOrder(world: World, playerId: PlayerId): GameEvent[]`. Consumes collider/map/player data Task 1, actor validation Task 2; only server invokes mutations.

- [ ] RED: `one_order_one_owner`, `one_carried_order`, `duplicate_delivery_pays_once`, `gate_fee_once_per_order`, `fee_locked_at_gate_crossing`, `zero_coins_can_deliver`, `abandon_needs_shop_and_hold`, `all_spawns_reach_pickup_and_delivery`.
- [ ] Run `npx vitest run tests/unit/arcade/orders.test.ts tests/unit/arcade/maps.test.ts`; confirm RED.
- [ ] Implement common order pickup/dropoff, E context priority, carrying state, one-time settlement and receipt. Phí gate dự kiến ghi trên đơn khi đi qua, chỉ trừ khi giao; đổi phí sau đó không sửa đơn đã qua. Bỏ đơn cần giữ E 1 giây tại cửa hàng; cùng tình huống này không kích hoạt mua nâng cấp. Nhận/giao chỉ hợp lệ trong vùng tương tác.
- [ ] Sinh đơn theo seed + cụm cân bằng; khởi đầu số đơn công khai chờ mục tiêu bằng số người, trần 2× số người, không quá một đơn riêng chờ mỗi chủ. Điều chỉnh vị trí/bề rộng từ collision map, không lấy collider từ mái sprite. Tốc độ sinh và route length phải đo lại khi chơi thử, không tuyên bố cân bằng do công thức.
- [ ] GREEN unit; `npx playwright test --project=api tests/api/arcade-races.spec.ts` cho nhận/giao cùng lúc bằng nhiều socket, retry, input giả vị trí và gửi lại message. Chỉ server cấp owner/xu; commit Task 3.

## Task 4: Timeline 600 giây, kinh tế, nâng cấp và kết quả

**Files:** Create `shared/arcade/{clock,economy}.ts`, `tests/unit/arcade/clock.test.ts`, `tests/unit/arcade/economy.test.ts`; Modify `world.ts`, `types.ts`, `realtime/room.ts`; Create `tests/api/arcade-lifecycle.spec.ts`.

**Interfaces:** Produces `stepWorld(world, inputs, dtMs): StepResult`, `contributeSharedRoute(world, playerId): GameEvent[]`, `buyUpgrade(world, playerId, kind: 'promotion' | 'private-channel'): GameEvent[]`; uses Task 3 interactions/orders and Task 1 movement. `projectSnapshot` Task 1 extended with fees/progress/summaries, giữ đúng tên trường mục 3.

- [ ] RED bằng clock giả chỉ trong unit: reset ở 60.000 ms; chặng ở 180.000/360.000; khóa tiền ở 540.000; kết quả giữ sau 600.000; báo trước 10.000 ms. Assert pause không dịch chuyển/sinh đơn/hồi dash/đổi chặng. Không tạo endpoint đổi giờ production để chạy test nhanh.
- [ ] RED economy: promotion trừ 8 một lần, thêm đúng 3 đơn công khai trong cửa sổ 20 giây, hồi 45 giây; private trừ 40 một lần, đơn 8 và không sinh nhanh hơn 20 giây; tổng góp không vượt 12×roster, bước cuối chỉ thu phần còn thiếu, người không đủ xu nhận lỗi. Đồng xu cùng hạng, không nhân điểm vì kích cỡ nhóm.
- [ ] Run `npx vitest run tests/unit/arcade/clock.test.ts tests/unit/arcade/economy.test.ts`; confirm RED.
- [ ] Implement world composition, time-based events and three distinct station pads for promotion/private/shared contribution. Hướng dẫn E ghi rõ giá trước khi mua. Clock chạy trên server; actor catch-up giới hạn để không tạo impulse khổng lồ. Nếu runtime lag vượt khả năng catch-up, pause với lý do hiển thị thay vì âm thầm cho nhân vật nhảy xuyên đường.
- [ ] GREEN unit; lifecycle API kiểm tra start/pause/replay đang có đơn/input chờ, giữ trạng thái đã xác nhận và không chấp nhận thao tác ván cũ. Chốt bảng coin và thống kê phụ; commit Task 4.

## Task 5: Sản xuất trọn bộ asset và pipeline kiểm chứng

**Files:** Create `assets/arcade/` và `public/arcade/assets/` theo catalogue; `game/arcade/assets/{manifest,animations}.ts`; ba script normalize/pack/verify ở mục 2; `tests/unit/arcade/assets.test.ts`; `docs/arcade/asset-qa.md`.

**Interfaces:** Produces `assetManifest: Record<AssetKey, AssetSpec>`, `characterAnimations: AnimationSpec[]`, atlas frame names `courier/{direction}/{animation}/{01..NN}` và các key đúng catalogue. Các task client chỉ dùng key, không dùng đường dẫn ảnh hard-code.

- [ ] Tạo validator test trước: toàn bộ 47 nhóm required có output thực và nguồn; 72 frame courier đúng 4 hướng × (2+6+2+2+6); tổng frame 305, 5 screen assets, 2 font, 16 SFX, 2 music. Test kiểm file/metadata/alpha/frame bounds, không lấy việc catalogue JSON hợp lệ làm bằng chứng file đã tạo.
- [ ] Run `npx vitest run tests/unit/arcade/assets.test.ts`; RED vì thiếu production assets. Giữ catalogue planned cho đến lúc từng nhóm qua QA.
- [ ] Tạo style/seed bằng image_gen tích hợp, đưa vào scene nhỏ để kiểm silhouette và độ lớn. Theo prompt/spec art; tất cả seed/strip tham chiếu được xem trước khi edit. Tạo mỗi strip trọn trong một request, không sinh frame rời. Lưu prompt và bản chọn; không dùng API key/CLI thay cho tool tích hợp nếu chưa có yêu cầu riêng.
- [ ] Normalize bằng script Game Studio + wrapper calibration chung giữa mọi strip; cùng scale và anchor `(48,88)` trên cell 96×96. Pack atlas có padding/extrusion 2 px, không quá 2048. Chạy contact sheet và gallery animation có overlay hàng, nhiều màu, vật che và cảnh đông người.
- [ ] Sản xuất environment, UI, 10 FX và 5 screen assets; nguồn audio/font theo art spec, ghi original archive filename sau nghe thử và SHA-256 sau lưu file. Xuất OGG+MP3 cho từng cue; mute mặc định, không dùng nhạc nền 26 laptop cùng phát. File cuối ở public, raw không đóng vào payload trận.
- [ ] Run `node scripts/verify-arcade-assets.mjs --catalog ../docs/superpowers/plans/2026-10-27-cuoc-dua-gianh-khach-assets.json` và unit assets. GREEN chỉ khi đủ required và chưa vượt budget art spec; viết báo cáo ảnh preview/in-engine ở Task 6 trước đánh dấu accepted cuối. Commit asset nguồn cần thiết, file xuất và provenance; giữ raw lớn ngoài Git nếu cần nhưng ghi đường dẫn lưu rõ.

## Task 6: Phaser client, bàn phím, prediction và camera

**Files:** Create `game/arcade/{client,input,prediction,bridge}.ts`, các file Phaser mục 2, `components/arcade/ArcadeShell.tsx`, `app/arcade/play/[code]/page.tsx`, `tests/unit/arcade/input.test.ts`, `tests/unit/arcade/prediction.test.ts`, `tests/e2e/arcade-controls.spec.ts`. Modify `package.json`, `package-lock.json` để pin Phaser sau smoke tương thích; không thay starter.

**Interfaces:** `connectArcade(options): ArcadeConnection`, `createArcadeGame(parent, bridge): Promise<dispose>`, `ArcadeBridge` gồm read snapshot/subscribe/send input, không có setter xu. Consumes protocol, map, snapshots và assetManifest của Task 1–5.

- [ ] RED input/prediction: WASD và arrow tương đương; giữ Space không gửi nhiều edge; keyup/blur/visibility reset; focus input tên hoặc modal chặn game input; seq cũ không replay; reconciliation không ghi đè xu từ client; test FPS 30/60/144 cùng ý định di chuyển.
- [ ] Run `npx vitest run tests/unit/arcade/input.test.ts tests/unit/arcade/prediction.test.ts`; confirm RED.
- [ ] Add Phaser `4.2.1` bằng workflow dependency dự án hiện có, giữ lockfile; kiểm import chỉ client bằng dynamic import trong effect. Phaser không chạy khi SSR và được dispose đúng lúc đổi trang/StrictMode. Không chép scaffold template hoặc telemetry script của template vào dự án.
- [ ] Boot preload manifest, CityScene đọc snapshot, nội suy remote và dự đoán movement local bằng math chung; kết quả dash đẩy đối thủ do server quyết định. Animation dựa phase/direction/motion, giữ collider server làm nguồn thẩm quyền. Camera follow người chơi, projector dùng camera fit riêng, công trình xếp theo chân; không che người chơi bằng mái nhà.
- [ ] Run unit và `npx playwright test --project=browser tests/e2e/arcade-controls.spec.ts`; bắt buộc screenshot canvas để kiểm đủ sprite/hàng/đường/FX. Kiểm không nhân listener/socket/canvas sau reload/đổi trang, WebGL unavailable báo lỗi rõ. Screenshot và gallery đạt mới accept cuối Task 5; commit Task 6.

## Task 7: HUD, sảnh, màn MC và trải nghiệm hình ảnh hoàn chỉnh

**Files:** Create `app/arcade/{layout,page}.tsx`, `app/arcade/host/[code]/page.tsx`, các component UI còn lại ở mục 2, `tests/e2e/arcade-ui.spec.ts`, `tests/e2e/arcade-lobby.spec.ts`; Modify riêng `components/arcade/ArcadeShell.tsx`. Không sửa CSS toàn cục của quiz để đổi phong cách game mới.

**Interfaces:** Consumes ArcadeConnection/assetManifest/PublicSnapshot. Produces DOM HUD và host controls gọi API capability Task 2; settings chỉ đổi trải nghiệm cục bộ, không sửa world.

- [ ] RED: tạo/join, min3, roster26, recover, play/replay và host-only controls; HUD hiển thị xu/đơn/thực nhận/phí/hồi Space, tooltip E đúng station; offline, paused, interrupted và results có copy riêng. Tên Việt dài hoặc tên trùng không phá layout hoặc định danh.
- [ ] Run `npx playwright test --project=browser tests/e2e/arcade-lobby.spec.ts tests/e2e/arcade-ui.spec.ts`; confirm RED theo màn chưa tồn tại.
- [ ] Implement art spec bằng CSS variables, font self-hosted, wordmark và key art đã chọn. HUD ít che đường, bảng đầy đủ mở bằng Tab, Escape menu; rời overlay không để phím mắc. Khi một người mở menu cục bộ, room vẫn chạy và avatar dừng input.
- [ ] MC thấy toàn cảnh, countdown, top gọn và tiến độ lối chung; điều khiển pause/replay rõ trạng thái. Cài đặt âm lượng/music/SFX/mute và giảm motion không làm thay đổi mô phỏng. FX hình giới hạn cường độ; âm/UI vẫn có cue đọc được khi tắt tiếng.
- [ ] GREEN functional; chụp 1366×768, 1280×720, 1920×1080, zoom125%, roster26 và trang nhỏ 390 px cho xem/sảnh. Đo HUD thường trực mục tiêu <=20% viewport, không chắn trung tâm; kiểm chuỗi “Cuộc đua giành khách — Đang kết nối lại — Phí nền tảng”. Commit Task 7.

## Task 8: E2E gameplay, tải thực và một ván đủ thời lượng

**Files:** Create `tests/e2e/arcade-match.spec.ts`, `tests/api/arcade-duration.spec.ts`, `docs/arcade/playtest-report.md`; Extend `scripts/arcade-load.mjs`, tests/support và tests/e2e theo phát hiện thật.

**Interfaces:** Uses public room APIs/WebSockets, bàn phím và read-only diagnostics. Không dùng mock API hoặc endpoint sửa thời gian/xu production để chứng minh ván thật.

- [ ] Tạo acceptance matrix gắn từng yêu cầu spec với unit/API/browser/manual. E2E điều khiển ít nhất ba trình duyệt: tranh một đơn, bị chặn, đổi đường/dash, giao, nhìn cùng kết quả; nộp tại biên hạn, pause trong dash và reload lúc mang hàng. API race test kiểm góp lối chung gần đủ với nhiều người cùng lúc.
- [ ] Run toàn bộ `npx vitest run tests/unit/arcade` rồi `npx playwright test --project=api tests/api/arcade-rooms.spec.ts tests/api/arcade-recovery.spec.ts tests/api/arcade-races.spec.ts tests/api/arcade-lifecycle.spec.ts` và các `arcade-*.spec.ts` browser Task 6–8. Test chờ chạy thử có timeout riêng ít nhất 120 giây; không làm ngắn practice trên production cho test.
- [ ] Chạy 3/6/26 socket thật trong khi có ít nhất ba browser render; mô phỏng input đổi hướng, E/Space và giao dịch, không chỉ mở sảnh. Đo và ghi p50/p95 RTT, tick cost, correction, dropped snapshot, FPS và heap trend. Không gọi 26 bot là 26 laptop thực.
- [ ] Gate trình duyệt đề xuất: trên laptop tham chiếu ghi rõ CPU/GPU/độ phân giải, FPS p95 frame time <=33 ms ở mức đông; target smooth60 nhưng tối thiểu trải nghiệm30 FPS ổn định. Gate mạng staging đề xuất p95 app RTT <=200 ms, recovery sau mạng lại <=5 giây, không lệch xu/owner. Nếu không đạt phải tối ưu và đo lại, không chỉ bỏ hiệu ứng rồi giữ nguyên tuyên bố chất lượng.
- [ ] `RUN_ARCADE_DURATION=1 npx playwright test --project=api tests/api/arcade-duration.spec.ts` là cú pháp POSIX; trên PowerShell dùng `$env:RUN_ARCADE_DURATION='1'` rồi chạy lệnh test, sau đó xóa biến. Một lần chạy thật 600 giây, không fixture rút thời gian; xác nhận reset practice, sự kiện, kết quả ở 540 và phần chốt tới 600. Bài slow test cần timeout >=720.000 ms. Không dùng sleep một lần dài trong điều phối, để còn cập nhật tiến độ.
- [ ] Chơi thử người thật trên Wi-Fi lớp: ít nhất một người mới, đổi người điều khiển nếu chơi nhóm; ghi số đơn, thời gian bị cản, khả năng nhìn HUD và cảm nhận vui. Điều chỉnh chỉ các thông số có bằng chứng, giữ lại ảnh/report; commit thay đổi đã xác minh. Nếu chưa diễn tập lớp, báo đúng giới hạn đó.

## Task 9: Tích hợp staging, giữ game cũ và bàn giao vận hành

**Files:** Create `docs/arcade/classroom-runbook.md`, `docs/arcade/deployment.md`, `docs/arcade/acceptance-matrix.md`; Modify `README.md`, `cloudflare-env.d.ts`, env template không chứa secret, package scripts; giữ project identity.

**Interfaces:** `ARCADE_SERVICE_URL` cho HTTP server proxy; `ARCADE_PUBLIC_WS_URL` cho bootstrap; service dùng `ARCADE_ALLOWED_ORIGINS` và binding `ARCADE_ROOMS` trong `realtime/wrangler.jsonc`. URL lấy từ deployment thật, không hard-code localhost vào bản lớp dùng. Không thêm một binding DO không được Sites hỗ trợ vào hosting manifest.

- [ ] Thêm script dự án chạy local service/test/load/assets theo các command đã nêu; README ghi rõ cần hai service local và URL nào được browser dùng. Laptop khác không được trỏ tới `127.0.0.1` của máy mình; bản HTTPS chỉ dùng WSS phù hợp để tránh mixed content.
- [ ] Kiểm tra lại quyền hosting/service/account ở Gate Task 1. Khi đã được giao thực thi/phát hành, deploy service tới staging, cấu hình origin và URL, thử WSS từ trình duyệt thật; kiểm phép migrate DO và lifecycle. Không ghi credential trong Git, command line hoặc catalogue asset. Nếu môi trường không cung cấp quyền service, hoàn tất phần local và nêu chính xác phần còn cần, không công bố multiplayer đã live.
- [ ] Run `npm run typecheck`, `npm run test:unit`, `npm run test:api`, `npm run test:e2e`, `npm run build` theo hạ tầng server test hiện có; chạy bộ quiz regression riêng vì đổi dependency/build có thể ảnh hưởng game cũ. Không lặp lại full600 nếu không có thay đổi liên quan sau lần đã đạt.
- [ ] Runbook có thao tác vào phòng, bàn phím, vai trò MC, mute mặc định, pause, reconnect, interrupted, chơi lại và lời chốt một phút. Trường hợp mất Internet kéo dài: MC dừng trận, không dùng điểm chưa hoàn tất như kết quả; ghi rõ phương án lớp dùng được sau diễn tập.
- [ ] Bàn giao URL staging/production theo phạm vi được giao lúc thực thi, bản build và bằng chứng pass; mọi asset required accepted, source/provenance hiện diện, probe debug không nằm trong payload production. Giữ đường quiz hiện tại và dữ liệu cũ. Commit theo workflow repo/Sites khi thực thi; lượt lập kế hoạch hiện tại không tạo commit hay deployment ứng dụng.

## 4. Thứ tự và các mốc nghiệm thu

| Mốc | Task | Kết quả được xem trực tiếp |
| --- | --- | --- |
| A — chứng minh khả thi | 1 | Nhiều client chạy/xô trên cùng bản đồ debug, có số đo và đường hosting realtime rõ |
| B — game chơi được | 2–4 | Vào phòng, nhận/giao, cản nhau, đổi phí, nâng cấp, pause/reconnect và kết quả đúng |
| C — bộ hình ảnh nhất quán | 5 | Seed/strip/atlas, môi trường, UI, FX, audio và provenance đủ danh mục |
| D — bản đẹp có thể chơi | 6–7 | Phaser render với asset cuối, HUD tiếng Việt, laptop/MC dùng được |
| E — dùng được trong lớp | 8–9 | Ván đủ thời gian, tải26, visual QA, diễn tập và runbook |

Sau Gate A, sản xuất asset có thể tiến hành độc lập với hoàn thiện Task 2–4 nếu phương thức thực thi được chọn cho phép. Không đợi đến cuối mới kiểm sprite trên engine; Task 5 có gallery sớm và phải chốt lại cùng Task 6. Không tăng thêm chế độ/nhân vật/chiến đấu trong lúc thực thi nếu không có yêu cầu mới.

## 5. Tự rà soát kế hoạch

- Spec 1–3 → mục tiêu, phạm vi và lựa chọn công nghệ; spec4–5 → Task1/3/6; spec6 → Task3/4; spec7–8 → Task3/4/8; spec9 → Task2/7; spec10 → Task1/2/8/9; spec11–13 → Task5/7/8/9. Không có yêu cầu thiết kế còn thiếu task sở hữu.
- Review Focus có test tại đúng task; asset/frame/alpha/canvas phải có ảnh quan sát, không chỉ typecheck.
- Tên `createWorld`, `advanceMotion`, `stepWorld`, `projectSnapshot`, `generateMap`, `connectArcade`, `createArcadeGame` và các kiểu giao thức giữ nhất quán giữa task.
- Các số kinh tế/hồi kỹ năng là khởi đầu theo spec; thay đổi sau chơi thử cần ghi lý do. Ngân sách payload và ngưỡng hiệu năng là mục tiêu đề xuất, chưa được đo trong lượt lập kế hoạch.
- Chưa cài dependency, sinh asset, dựng server thử hoặc phát hành trong lượt này. Các bài test kể trên là việc phải làm khi thực thi, không phải kết quả đã đạt.

## 6. Tài liệu kỹ thuật đã đối chiếu

- [Game Studio](<C:/Users/DINH LOC/.codex/plugins/cache/openai-curated/game-studio/11c74d6b/skills/game-studio/SKILL.md>), cùng các nhánh web-game-foundations, phaser-2d-game, game-ui-frontend, sprite-pipeline và game-playtest.
- [Phaser project templates](https://docs.phaser.io/phaser/getting-started/project-templates) và [Phaser releases](https://github.com/phaserjs/phaser/releases): xác nhận đường tích hợp React/Vite và phiên bản đề xuất, không cần scaffold lại ứng dụng.
- [Cloudflare WebSockets/DO](https://developers.cloudflare.com/durable-objects/best-practices/websockets/) và [DO lifecycle](https://developers.cloudflare.com/durable-objects/concepts/durable-object-lifecycle/): room actor, snapshot và giới hạn hibernation khi còn timer. Đây là năng lực nền tảng, không chứng minh tài khoản/Sites hiện tại đã có quyền triển khai binding đó.
- Nguồn asset/font/audio và điều kiện QA ghi trong Art Spec, có link từng entry trong catalogue. Không có asset final nào được xác nhận từ việc chỉ đọc trang nguồn.
