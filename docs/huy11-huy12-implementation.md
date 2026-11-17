# Open Match Room implementation

## Plan and architecture

Reuse Auth/Profile session notifications from script.js (no additional auth listener).
Add an independent Room panel/controller and an adapter to the unchanged Randomizer Core.
Keep all Room state out of Phase 1 storage and Firebase.
When Room mode is active, the Room panel occupies the existing left player-list slot;
the Phase 1 player list and draw console are hidden while the existing settings panels
remain available below it. Persisted Room teams render in the existing result area.
Persist lineup and skill assignments through authorized, version-checked RPCs.
Subscribe before reading, coalesce events, refetch on reconnect and reconcile every 15 seconds.
Read Room/members/queue/snapshot atomically with a SECURITY INVOKER RPC using existing RLS.
Cancel stale responses/subscriptions on logout or account/Room switch.

## Unified Randomizer integration

Room mode now uses the existing `script.js` draw pipeline instead of a second Room result
renderer. The Room adapter internally prepares a valid ten-player snapshot when needed,
maps Room members to the existing Player Model, runs the existing balancing/reveal/audio
flow, and persists the resulting teams through the version-checked HUY-11 lineup RPC.
The Phase 1 player list is replaced only inside the Room sidebar; `state.players`,
`localStorage.lq_state`, Firebase Live Share, and Quick Randomizer history remain separate.

Host Tier/Rank edits are draft-only while the Room is waiting. They are scoped by Room and
round, cleared on account/Room/round changes, and are not presented as synchronized until
the draw persists the lineup. Result cards and slot rows support Room swap selection with
drag/drop plus keyboard activation; the server RPC remains authoritative and rejects swaps
outside the preparing state.

Settings classification for Room mode:

- Tier/Rank: supported and persisted as lineup skill data.
- Balance mode, role/lane assignment, champion pool, reveal style and sound: reused locally
  for presentation/generation where compatible, but not persisted as Room business state.
- Firebase sync, Quick Randomizer local history/player list: Phase 1 only.
- Match Result, Match History, Match ID, MMR and game-data synchronization: intentionally
  unsupported and not represented by new Room schema.

No new migration was necessary for this UI integration. Existing HUY-11 lineup/save/swap
RPCs provide the required authoritative persistence and version checks; a migration would
only be justified by a verified backend gap.

## Deployment (BE review required)

1. Back up database and save current function definitions, ACLs and publication membership using
   `db/verification/huy11_room_lineup_checks.sql`. Confirm HUY-9, both HUY-10 migrations,
   and the pgcrypto hotfix are already applied. Do not replay them.
2. Review/apply `20261103_huy11_room_lineup.sql` as the trusted database owner during a quiet window.
   It adds three nullable columns to the current snapshot, three public RPCs, an internal
   Host/lock helper, hardens Prepare/Start, and adds four Room tables to the Realtime publication.
   It neither resets data nor rewrites applied migrations. It requires supabase_realtime.
3. Run the read-only verification file again. Internal helper must not be executable by
   anon/authenticated; public RPCs by authenticated only. RLS/direct-write restrictions remain.
4. Test with two clients on staging, including ten participants (manual entries allowed).
   Prepare requires ten waiting players; Start requires a saved 5v5 lineup. This prevents
   entering a preparing state with too few players and becoming unable to proceed.
   Preflight must find no open underfilled preparing Room; the migration aborts otherwise.
   Such legacy Rooms require owner review/closure, never automatic deletion/reset.
   Old one/four-player smoke tests are no longer valid
   Start acceptance tests after this migration. Do not rerun those Production harnesses unchanged.
5. On migration error, roll back the failed transaction; do not run subsequent statements
   outside its transaction. After commit, use a reviewed forward fix; reverting Start while
   exposing new UI weakens the invariant. No automatic rollback/deletion script is supplied.

## Browser checklist

- Guest Quick Randomizer remains usable. Open Room prompts Login/Register.
- Toggle Open Room mode: the left player list is replaced without changing Phase 1 state;
  leaving Room mode restores the standalone player list and draw action.
- Create Room, copy URL (also under /customAOV/), reload Host, join Viewer from second browser.
- Add manual nicknames, join/leave/rejoin/continue, compare Selected/Waiting in both clients.
- Prepare ten players, set Tier or Rank for each, generate/save 5v5, reload and compare teams.
- Swap across teams; replace an unavailable player with earliest waiting player; regenerate teams.
- Start, verify editing/replace denied at API too, End, explicitly Continue/requeue, Next Round.
- Disconnect/reconnect, switch accounts/logout during a slow response, verify no stale names.
- Confirm kick/close dialogs; closed Room remains stored. Test keyboard and 375px/mobile layout.

## Verification limits / dependencies

Local validation on 2026-11-04: `node --test tests/*.test.js` — 113 passed, 0 failed.
JavaScript syntax and `git diff --check` passed. Chrome fake-service smoke passed with
actual viewports 1264px and 500px under `/customAOV/`. This is not a live multi-client
Supabase test or a physical mobile device test. SQL checks are static; the new migration
has not been executed on PostgreSQL in this environment.

Node tests use fake services/DOM; they do not prove RLS, SQL execution or live Realtime delivery.
`node tests/room-browser-smoke.mjs` is intended to use local Chrome and a fake API at
`/customAOV/`, checking Tier generation/save, swap, narrow/wide layout and logout. In the
latest run Chrome did not return a DOM result, so browser smoke is NOT VERIFIED; it never
contacts Supabase or Firebase. Browser profiles remain in the OS temporary directory; no
data cleanup DELETE.
HUY-9/HUY-10 concurrent Next Round and 11+ account load tests remain NOT VERIFIED.
Existing Leave/Continue RPCs need live concurrency review: they do not share the Room-first
lock ordering of Join. Existing host-only Kick does not check closed Room state. These applied
RPCs were not silently rewritten here. Existing direct-write denial smoke tests also require
review before reuse (HTTP failures alone are not proof of authorization).
Host-added players continue to use the legacy `member_kind='guest'` discriminator without Auth.
Anonymous Auth remains disabled. No Profile/game sync, results/history/statistics implementation.

Realtime setup follows Supabase Postgres Changes documentation:
https://supabase.com/docs/guides/realtime/postgres-changes
