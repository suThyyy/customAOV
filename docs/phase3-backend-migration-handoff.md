# Phase 3 release handoff

## Release state

**SOURCE IMPLEMENTED · LOCAL TESTED · SQL NOT YET APPLIED.** LIVE DATABASE VERIFIED remains pending. Baseline was dev at 26604dcb395261799394771ae25fb97470c7dd12. The supplied todo.md was the only untracked file at discovery. All release files are new. Historical migrations, Vanilla JS and the separate Platform repository retain their baseline source.

HUY-15 discovery and the HUY-19/20 descriptions and discussions were reviewed. The applied HUY-11 Replace erased team for every selected player. Next discarded the previous round snapshot. The existing RLS helper already admits only host and active account members, the account join takes an invite token, and the existing room subscription observes transactional version changes. Those findings determine the compatibility contract.

## PO execution checklist

1. Confirm project identity, database owner privileges and a quiet maintenance window. Pause clients for all five files. Intermediate commits expose only part of the new lifecycle.
2. Confirm a recoverable backup or PITR restore point in Supabase for this project. Record UTC time, restore target, retention, and who can perform recovery. Retain a schema export and test restoration in an isolated project before approving production.
3. Confirm HUY-9/10/11 including the pgcrypto, random-mode and kick-replace increments were applied. In SQL Editor run **db/verification/phase3_preflight.sql**. Expect all 15 expected_presence flags true. Each existing replacement must have baseline_contract_ok true, newly introduced signatures must be vacant, and all prerequisite signatures must resolve, four publication rows, zero over-capacity rooms and two true increment checks. Resolve unexpected results before proceeding. Use actual object definitions when Dashboard history labels differ.
4. Run each complete file below in its own SQL Editor execution as the migration owner. Record filename, outcome and timestamp before continuing. All five files contain BEGIN/COMMIT and target UTF-8. The scripts deliberately detect prior application via existing objects.
5. Run **db/verification/phase3_postflight.sql**. Run as the reviewed owner. Expect passes=true for all 15 frontend signatures. The check requires owner equality, SECURITY DEFINER, the explicit search path, authenticated EXECUTE and denied anon EXECUTE. Five new tables must have RLS true and client_write false. All eight internal signatures must show private_contract_ok=true. Expect 129 hero rows and zero malformed series. Retain results with the release record.
6. Review role grants and RLS using separate host, member, stranger and anonymous sessions in an approved test environment. Exercise invite-only discovery, concurrent join at 49, stale swap/replace, BO clinch/correction, private subscriptions and reconnect. Confirm PostgREST sees the new signatures and a rooms update refreshes the game/score for both clients. Run the separate Platform adapter and HUY-18/21 acceptance work after PO approval.
7. Mark LIVE DATABASE VERIFIED only upon collecting deployed evidence. Reopen clients only after verification and compatibility review.

| Order | File under db/migrations | Transaction and dependency |
|---|---|---|
| 1 | 20261119_01_room_queue.sql | HUY-11 room guard, queue indexes and current slots. Capacity trigger and atomic replace/swap. |
| 2 | 20261119_02_room_configuration.sql | Existing invite generator and rooms. Adds wizard configuration and public discovery. |
| 3 | 20261119_03_series.sql | Configured rooms and HUY-11 Start/End. Creates roster, games, revisions, score and guarded lifecycle. |
| 4 | 20261119_04_game_assignments.sql | Series tables, host guard and room version. Seeds reviewed hero names and installs assignment RPC. |
| 5 | 20261119_05_queue_lifecycle.sql | Prior four files and HUY-10/11 queue methods. Serializes membership changes, versions queue writes, adds guarded play-style and allocation-mode edits and requests PostgREST schema reload. |

If an execution fails, stop clients and save the first SQLSTATE and error. In an aborted editor transaction issue ROLLBACK. Check the signature rows grouped by migration in the first postflight query separately to identify the last committed file. With a contiguous installed prefix, verify its objects and resume at the first missing file after addressing the cause. Missing prerequisites, manually edited objects or a noncontiguous prefix require schema comparison and a reviewed forward correction. Never replay an applied migration, delete series/history, reset tables, or rerun the historical baseline. If client rollout fails, suspend configured-room creation and keep legacy rooms operating after verifying their contracts. Prefer a reviewed additive fix. Database restore requires separate PO authorization and assessment of writes since backup.

## Local evidence and issue mapping

| Acceptance area | Source | Executed evidence | Remaining acceptance |
|---|---|---|---|
| HUY-20 target-only Replace, 5v5, FIFO, stale requests, same/cross-team swap | 01, HUY-11 guard | phase3-postgres.cjs checks slot/team effects and stale writes. phase3-concurrency.cjs races two Replace calls. | Remove Platform two-call repair after deployment. |
| HUY-20 50 waiting/selected, account vs host-added, rejoin/requeue | 01, 05, HUY-10 existing requeue | 49 guests plus two competing account joins on native PostgreSQL. Rejoin gets later sequence. In-memory checks cover queue overflow, selected requeue rejection and replacement requeue at tail. | Multi-client UI error and reconnect handling. |
| HUY-20 host isolation, locked series, existing rooms, additive release | 01–05, existing HUY-9 RLS | Wrong-account Replace, active swap denial, full legacy unit suite and browser smoke. | Deployed grants, JWTs and Realtime filtering. |
| HUY-19 BO3/5/7, game ordering, fixed teams, subsequent series | 03 | phase3-postgres.cjs runs each threshold, rejects extra game at clinch, reopens on correction, then starts a fresh series. Games reference one roster per series. | Live multi-client acceptance. |
| HUY-19 confirmed result, match uniqueness, double submission, scores, audit and verification | 03 | Duplicate ID, repeated END, score recomputation and two audit revisions exercised. Database defaults store host provenance/unverified state. | UI confirmation, reporting and correction workflow. |
| HUY-19 compatibility, provider independence | 02, 03 | Legacy create is opt-in via separate wizard RPC. Legacy Start/End rejected in configured room. Local tests run offline. | Historical production baseline comparison. |
| HUY-24 wizard, invite and discovery | 02, 05 | Configured create, private discovery exclusion, member-only reads, anonymous create denial. | Wizard and public directory integration. |
| HUY-22 arena / HUY-23 reveal | 01, 03–05 | Partial drafts, duplicate validation, cross-team duplicates, five unique lanes/heroes, persistence, one-time auto, edits after END. | UI and hosted Realtime. |

The frontend contract, signatures, read models and call examples are in **docs/phase3-backend-contract-manifest.md**. Existing snapshot keys remain unchanged. Legacy rooms receive no series or historical result backfill. The new games and revisions have restricted grants and membership-based RLS. Full history becomes inaccessible after membership ends. A permanent, non-kicked public discovery viewer may read ended game summaries while the room is open. Private history requires the host or an active member who joined by invite.

## Corrective review before application

The corrected first START validates mode equality with NULL-safe comparison and checks queue identity and round. Existing HUY-11 validation enforces ten eligible slots and five players per side. Random replacements retain random mode. Tier/Rank replacements preserve the team and require the incoming player's own skill data. Play style can change during preparation, including after allocation, and locks for the active series. It advances the published room version.

The PostgreSQL suite exercises all three allocation modes, pre-START kick with exactly one replacement, active kick with unchanged historical roster, accepted and denied style writes, public summaries, invite redemption, loss of member access, ended assignment snapshots and rollback of a correction that would invalidate a later game. Use the manifest's entry-path table during PO review. Hosted JWT delivery, schema cache and subscription behavior still require a deployed environment.

## Reproduce local verification

Run from the repository root. The test dependencies can be installed outside the checkout. The native race test creates a fresh temporary loopback-only PostgreSQL cluster on port 58439 with a random password and stops it at completion. It leaves its temporary data directory for inspection. Both database tests install Auth identity fixtures and baseline Room migrations in an isolated database.

```powershell
npm.cmd install --prefix "$env:TEMP/customaov-phase3-test" @electric-sql/pglite@0.5.16 embedded-postgres@18.6.0-beta.19 pg
$env:NODE_PATH="$env:TEMP/customaov-phase3-test/node_modules"
node --test tests/*.test.js
node tests/phase3-postgres.cjs
node tests/phase3-concurrency.cjs
node tests/room-browser-smoke.mjs
```

Observed 115/115 existing tests, three BO-format scenarios, two independent-session races and both local Chrome viewport checks passing. PGlite also executed preflight and postflight SQL against the fixture. **Hosted Auth, PostgREST, Realtime and remote write tests: NOT RUN — awaiting PO migration/approved environment.**

## Suggested Linear comments for PO review

- **HUY-20 — keep In Progress.** Backend source and local PostgreSQL coverage are ready for SQL review. Concurrent joins and stale replacements were exercised. Platform must adopt atomic swap and remove the two-call Replace workaround after deployment.
- **HUY-19 — keep In Progress.** Configured rooms support BO series, immutable rosters, numbered games, unverified host reports and append-only correction history. BO3/5/7 passed locally. PO application, Platform lifecycle integration and hosted acceptance remain open.
