# Platform Role Foundation — source handoff

## Release finalization — 2026-11-25

Current PO-confirmed release facts supersede the historical blocked/pending notes
below: Migration 01 and Migration 02 are applied; one approved Super Admin;
the separate six-helper service_role EXECUTE revocation is applied; 17 organizer
RPCs guarded; Production postflight 8/8 PASS; hosted role acceptance PASS;
last inventory 28 CLOSED Rooms / 0 OPEN. These are PO-reported facts. This release
task did not run Production SQL or independently reproduce hosted acceptance.
No new hosted logs, account identities or screenshots are claimed.

Fresh local release verification: 115 backend static tests, 165 PostgreSQL
role/security checks, BO3/BO5/BO7 scenarios and both native queue concurrency
scenarios passed. Native tests required execution outside the Windows sandbox.

Production exports docs/export.md and docs/migration02_production_source.json
are private operator-provided test inputs, deliberately excluded from the release
commit. The role regression and source comparator require those local inputs;
a fresh clone must obtain reviewed copies through the operator, not GitHub.
Temporary test dependencies are also excluded. The helper ACL SQL is retained
as a separately approved action with a safe ROLLBACK default, not part of either
migration and not an instruction to rerun the already completed action.

Frontend Git integration is blocked: role navigation and route changes are mixed
with unfinished Community routes and role tests depend on that navigation. The
feat/community-tournament-ui working tree is preserved for reviewed separation.
HUY-27 cannot be closed on source integration evidence yet; HUY-29 stays Todo.

Updated 2026-11-25. PO-confirmed Production state: **Migration 01 applied**, one approved Super Admin, **28 CLOSED Rooms and 0 OPEN Rooms**. **Migration 02 is NOT applied**. These are PO observations, not new hosted verification by this agent. No Production writes were performed during this release gate.

## Final Migration 02 release gate

### Exact Production source reconciliation completed

`docs/migration02_production_source.json` now validates all 17 unique signatures,
server MD5 values, UTF-8 round trips and byte lengths. The existing comparator
reports **CRLF/LF difference only for all 17** against docs/export.md; there are no
other source changes. Earlier Markdown-derived fingerprints were therefore not
exact Production fingerprints. Migration 02 and migration02_release_gate.sql now
use the supplied exact hashes and reviewed outer-BEGIN character offsets. The
declaration prefixes are ASCII, so the measured offsets agree with PostgreSQL
character indexing despite the added CR characters. No source normalization is
performed during migration; the guard insertion preserves all original bytes.

Focused validation: comparator passed; **165 PostgreSQL role/security checks
passed** using the exact exported definitions (including byte/hash assertions),
guard placement, unchanged metadata/ACLs and BO behavior. The release-gate query
matches all 17 installed exact bodies locally. `git diff --check` passed.
The existing test runner exercises the ACL proposal only inside disposable
PGlite; no standalone or Production helper correction was executed.

Source compatibility blocker is resolved for this export. **Activation remains
NO-GO** until the separately approved six-helper service_role ACL remediation and
external workflow review are complete, then a fresh Production read-only release
gate passes. No Production SQL, historical migration edits, commit or push occurred.
The blocker narrative below is retained as historical context; its missing-source
statements and Markdown-based test evidence are superseded by this section.

### Confirmed blockers superseding the earlier gate assessment

PO reports all 17 Production source hashes differ and all six internal helpers
grant service_role EXECUTE; anon/authenticated do not. **NO-GO.** Migration 02
has intentionally NOT been changed to accept unverified hashes or normalized SQL.
The provided Markdown reconstructs line breaks from `<br>`; exact original CR/LF,
escaping and source bytes cannot be inferred from it. No actual hash values or
new exact source bytes were supplied with the mismatch report. A serialization
explanation is plausible but unproven; real body changes remain possible.

PO next runs `db/verification/migration02_exact_source_export.sql` read-only and
returns its single JSON cell as JSON. It includes lossless UTF-8 base64 source,
server MD5, byte length, full definition and security metadata. Run
`node tests/compare-production-room-source.mjs <exact-export.json>` locally.
It verifies transport integrity and identifies exact versus CRLF/LF differences;
other differences require source review, including literals. Never broadly strip
whitespace or replace expected hashes solely to obtain PASS. After exact-source
review, recompute guard offsets against those bytes, update Migration 02 and the
release gate together, load the exact bodies into regression fixtures and rerun.

`db/verification/migration02_helper_acl_proposal.sql` is a separate six-function
REVOKE EXECUTE FROM service_role proposal, with effective privilege assertions
and ROLLBACK by default. It changes no public RPC ACLs. The available backend
repository contains no direct service workflow invoking these helpers; callers
in deployed SQL run through postgres-owned SECURITY DEFINER functions and retain
owner execution after revocation. The previously referenced Platform source paths
are unavailable in this session. External jobs, Edge Functions and service clients
cannot be ruled out by repository search: obtain operator inventory/approval before
committing the correction. Direct helper workflows must migrate to guarded entry
points with an authorized caller, not receive an organizer bypass exception.

Focused local results: **148 role/security checks PASS**, including exact-export
byte round trips, reproduced helper service grants followed by the proposed
revocation, effective denial, and existing role/owner/BO workflows. Tests commit
the proposal only in disposable PGlite. `git diff --check` passed. These use the
old Markdown-derived bodies and do NOT establish compatibility with current
Production. Release-gate and postflight denial policies remain unchanged.

Activation remains blocked until exact source compatibility is established,
external workflow review approves the separate ACL correction, and Production
read-only gates show 17 source matches plus six helpers with no effective client
or service EXECUTE. No Production SQL was executed during this remediation.

Impacted local verification: role/security runner passed **146 checks**, including
17 release-gate fingerprint matches and six helper effective-privilege checks;
updated postflight executed successfully. `git diff --check` passed. No broader
implementation suites were rerun for this verification/documentation-only change.

**NO-GO pending read-only Production gate results.** Run
`db/verification/migration02_release_gate.sql` immediately before activation:
17/17 fingerprint matches; all six internal helpers present; all PUBLIC, anon,
authenticated and service_role helper EXECUTE checks false. Missing functions,
source drift or unexpected grants block activation. This query does not change ACLs.

The exported 17 guarded RPCs retain service_role EXECUTE for existing compatibility.
That grant does not skip the guard's authenticated JWT, approved role and ownership
checks. A service_role JWT is rejected. This is distinct from EXECUTE on internal
helpers, which have no organizer gate. Internal start/end/kick can bypass the new
role requirement if callable; internal continue bypasses the public wrapper's
locking path. series_host/huy11_lock_preparing expose internal host/lock operations
without the organizer gate even though they do not themselves perform the full
business mutation. No such client access is acceptable.

Historical source revokes PUBLIC/anon/authenticated access to these six helpers,
but does not revoke service_role. The provided Production export covers the 17
public RPCs, not helper ACLs, so actual helper exposure is not yet confirmed.
Postflight now distinguishes preserved service_role access to guarded RPCs from
forbidden access to internal helpers; no helper security expectation was relaxed.

If the gate finds a helper grant, propose a separately approved, explicit
`REVOKE EXECUTE ON FUNCTION public.<exact failing signature> FROM <grant holder>;`
for that helper only. Include PUBLIC if it is the grant source. For inherited
privileges, inspect the granting role and membership before proposing correction.
Remove service_role EXECUTE from an unguarded helper if present; do not remove
service_role grants from the guarded public RPCs. Re-run effective privilege checks.
No ACL correction has been executed or bundled into Migration 02.

Activation order: do not reapply Migration 01 or repeat the Super Admin approval.
Capture the new release gate results, obtain separate approval for any necessary
helper ACL correction, recheck the gate and existing preflight, then PO may apply
Migration 02 once and run platform_roles_postflight.sql. Require 17 guarded RPCs,
no client/internal helper access, and no stranded OPEN Rooms. Hosted behavioral
acceptance remains separate. The deployment procedure below is historical context;
its Migration 01 and initial identity-approval steps are already completed.

## Deployment order — manual PO approval required

1. Run `db/verification/platform_roles_preflight.sql` read-only in trusted SQL Editor. Privately retain function definitions, owners, ACLs, policies, column grants and trigger/constraint results. Stop on unexpected owners, overloads, policies or direct Room writes.
2. Review legacy admin/organizer UUIDs and all open Room Hosts. Exact-email lookup for thh191204@gmail.com returns Auth/Profile UUIDs, stored role, approval, proposed/effective role and active Room count. **Live identity consistency and role remain UNKNOWN.** Email is never authorization.
3. Obtain PO approval for deployment, operator identity, each privileged account and active-Host remediation. Missing Profiles require separately approved repair; assignment refuses a missing target Profile. Never promote all historical Hosts.
4. As SQL Editor database role **postgres**, apply `20261123_01_platform_roles.sql` after the existing HUY-5/8/9/10/11 and five 20261119 Phase 3 migrations. Every legacy approval starts NULL.
5. Individually approve existing Hosts using the procedure below, or finish/close their Rooms through the existing workflow before rollout. Re-run the blocked-room inventory: it must be empty **before migration 02**. No transfer/deletion or temporary bypass.
6. Apply `20261123_02_room_role_authorization.sql`. It aborts transactionally on unapproved active Hosts, missing/overloaded RPCs, unexpected owner/language or direct client table writes.
7. Run `db/verification/platform_roles_postflight.sql` read-only: 17 guarded RPCs; authenticated EXECUTE only; internal helpers denied; no stranded open Rooms. Metadata checks do not prove behavioral acceptance.
8. Assign separately approved test roles and execute HUY-28 in an approved environment: four-role UI/RPC/RLS, actual Auth/session identity, concurrent revocation and two-client lifecycle/Realtime. Production mutations need a separate test plan. Frontend deployment remains separately authorized.

Both migrations are intentionally **one-time**, not idempotent. Each uses BEGIN/COMMIT: failure rolls back that transaction. If an editor leaves an aborted transaction open, issue ROLLBACK; inspect schema/ledger before retry. Do not drop columns/tables to force reruns. Migration 01 can be committed while 02 is blocked: Room role enforcement is not active until 02 succeeds.

## Authority, Profile compatibility and assignment

Existing profiles.role remains authoritative: player → user; approved organizer → admin; approved admin → super_admin. Missing/unknown/unapproved Profile has no privileged role. Signup ignores metadata roles and defaults to player. The own-role reader accepts no target UUID. Guest is absence of a permanent authenticated session.

The protection trigger covers role and approval. Ordinary client table-wide and historical column INSERT/UPDATE grants are removed; only display_name/avatar_url/bio UPDATE is restored under existing owner-only RLS. Game-profile contracts are unchanged. Old unaudited set_profile_role always rejects and loses client/service EXECUTE.

`assign_platform_role(uuid,text,text,text)` is SECURITY INVOKER, with EXECUTE granted only to postgres and an explicit current_user=postgres check. It uses actual database-operator privileges, not JWT role impersonation or inherited definer privileges. PUBLIC/anon/authenticated/service_role cannot execute it. No frontend service key is required.

After verifying Auth UUID and obtaining approval, select SQL Editor's postgres database role and inspect `select session_user,current_user;`. Substitute verified values in this intentionally non-executable template:

```sql
begin;
select public.assign_platform_role(
  'REPLACE_WITH_VERIFIED_AUTH_UUID'::uuid,
  'admin', -- approved choice: user / admin / super_admin
  'REPLACE_WITH_OPERATOR_AND_APPROVAL_REFERENCE',
  'REPLACE_WITH_REASON_AND_ACTIVE_ROOM_DECISION'
);
-- Inspect target Profile and newest platform_role_audit row.
-- COMMIT only if UUID/role/audit match approval; otherwise ROLLBACK.
```

Assignment locks the target Profile and writes approval/role plus audit atomically. Audit includes target UUID, old/new stored role, time, reason, supplied operator reference, verified PostgreSQL session_user/current_user and optional JWT role. **The operator reference string does not prove a person's identity**; preserve the external approval record. Trusted postgres owners necessarily retain database-owner powers. Client/service grants cannot modify the audit table or sequence.

Demotion clears approval and rejects subsequent organizer RPCs. In-flight transactions holding Profile SHARE locks finish before revocation obtains its UPDATE lock. There is no grace exemption. Finish/close active Rooms before demotion, or explicitly approve an operational freeze and recovery plan. No implicit ownership transfer. Audited regrant to an approved original Host is the initial recovery mechanism.

## Exact Room write inventory

The migration guards these existing signatures without changing their business blocks:

| RPC | Preserved behavior |
| --- | --- |
| create_open_room() | Permanent identity, invite creation |
| create_series_room(text,integer,text,text,text) | Configured BO3/5/7; legacy path also guarded |
| close_open_room(uuid) | Ownership and active-Series close constraint |
| host_add_player_to_room(uuid,text) | Nickname identity, queue capacity/FIFO |
| host_kick_room_member(uuid,uuid) | Selected-player replacement/lifecycle |
| host_requeue_room_member(uuid,uuid) | Queue lifecycle |
| prepare_next_open_room_round(uuid) | Ten FIFO players and Next Series |
| save_open_room_lineup(uuid,bigint,jsonb) | Version, preparing state, persisted 5v5 |
| replace_open_room_player(uuid,bigint,uuid) | Atomic FIFO replacement |
| swap_open_room_players(uuid,bigint,uuid,uuid) | Atomic team swap |
| start_open_room_round(uuid) | Legacy roster validation; configured-room bypass denied |
| end_open_room_round(uuid) | Legacy END; configured-room bypass denied |
| start_series_game(uuid,bigint) | Fixed roster, version, Next Game |
| report_series_result(uuid,bigint,uuid,text,text,boolean,boolean) | Confirmation, corrections, BO/history |
| assign_series_game(uuid,bigint,uuid,text,jsonb) | Per-Game Hero/Lane |
| set_room_allocation_mode(uuid,bigint,text) | Configuration/version constraints |
| set_room_play_style(uuid,bigint,text) | Configuration/version constraints |

require_room_organizer checks permanent authenticated identity, approved current Profile role under SHARE lock, then Host ownership. Super Admin does not bypass ownership. Creation passes NULL Room UUID because no resource exists yet. Original OIDs, argument names/defaults, results, configuration and business bodies stay intact in place; no callable legacy alias is created. Overload drift aborts activation.

join_open_room(text,text), leave_open_room(uuid), continue_open_room_queue(uuid) remain participant-accessible with existing invitation/membership/capacity rules. Read/discovery/RLS are unchanged. huy11_lock_preparing, series_host and four phase3_internal helpers lose all client/service EXECUTE grants. Direct Room/Queue/Series/Game writes remain denied. No separate unguarded Next Series endpoint exists.

## Frontend and compatibility

Existing AuthContext owns role/loading/error/refresh/canOrganize. Supabase reads only the protected role RPC; unavailable/invalid reads fail closed. Logout/account changes suppress stale replies. Focus, interval, session and permission-denial events refresh role. Permission rejection invalidates immediately; routine background refresh preserves loaded forms until a changed/failed response arrives. Backend remains authoritative.

Organizer route/action guards cover Room/Tournament/Community creation. Room controls also require ownership; confirmation/report/configuration actions recheck privilege. Community management requires organizer role plus resource ownership/manager membership. Tournament API management retains server myRole plus authenticated capability. Top/bottom navigation hides organizer creation for Guest/User; account menu exposes organizer links and Super-Admin-only unavailable Platform Administration.

Mock selector supports Guest/User/Admin/Super Admin, using existing Mock Auth and isolated sessionStorage. Logout clears privilege; Supabase never renders the selector or adopts stored Mock roles. Community's remaining identity subselector only switches between two ADMIN ownership fixtures; it cannot elevate USER. Community/Tournament demo data stays labeled as Mock.

API compatibility: the existing API has no canonical platform-role reader. It retains authenticated organizer UI with server-owned resource authorization, without importing Mock roles; it cannot access the new Super Admin route. This does not claim Supabase RBAC is implemented in the separate Fastify backend. Unfinished Community/Tournament workflows/adapters and dynamic permissions remain separate scope.

## Local validation and evidence limits

### Migration 02 Production compatibility remediation (2026-11-25)

The supplied `docs/export.md` is now the reviewed source baseline. Migration 02
matches exact UTF-8 source MD5 fingerprints and uses reviewed character offsets
immediately after each outer BEGIN. It inserts one PERFORM statement; DECLARE,
initializers, nested blocks and the remaining source are unchanged. Fingerprints
detect deployment drift, not malicious tampering. Any mismatch aborts the whole
transaction and requires renewed source review, including whitespace drift.

All non-creation targets use the first UUID argument `p_room_id`, checked at
runtime. Both creation functions pass NULL. JWT-backed auth.uid()/auth.role()
retain caller identity under SECURITY DEFINER; current_user is not used as the
caller identity. The approved-role SHARE lock and owner check remain unchanged.
Reviewed declarations contain no business mutation initializers. Declaration
initialization precedes the first execution statement under PL/pgSQL semantics.

Existing RPC and helper ACL REVOKE/GRANT statements were removed. In particular,
exported service_role EXECUTE privileges are preserved; this is not a new grant.
Any proposed removal requires separate approval. Only the newly created guard
has its default client privileges revoked. Every pg_proc field except prosrc is
compared before/after replacement, including OID, owner, defaults, argument names,
return type, SECURITY DEFINER, settings and ACLs. Unexpected change aborts.

Validation commands and actual results:

- `node --test tests/*.test.js`: 115 passed, 0 failed.
- `node tests/platform-roles.postgres.mjs C:/Users/thh19/AppData/Local/Temp/customaov-role-validation`: 144 checks passed. Loads actual exported definitions; checks guard placement, exact source restoration after removing the insertion, complete catalog metadata equality, drift rollback, denied creation, role revocation, ownership and existing BO behavior.
- `node tests/phase3-postgres.cjs`: BO3/BO5/BO7 PostgreSQL scenarios passed.
- `node tests/phase3-concurrency.cjs`: both native concurrency scenarios passed outside the sandbox after Windows OS-user lookup failed inside it.
- `git diff --check`: passed.

Test dependencies were installed only in the temporary directory above. Phase 3
runners used NODE_PATH pointing to its node_modules. Repository dependencies and
lockfiles were not changed. Native concurrency scenarios cover existing queue
operations, not a simultaneous role-revocation race.

Readiness: corrected source is ready for PO SQL review against this export.
No Production execution or hosted acceptance is claimed. PGlite uses fixture JWT
functions and substitute random bytes; native tests are disposable local servers.
Actual Supabase JWT/PostgREST behavior and concurrent role revocation still need
hosted acceptance. A changed Production body will block this migration safely.
The earlier validation counts below are historical, not this remediation's results.

- `node tests/platform-roles.postgres.mjs ../customaov-platform`: **107 checks PASS**, disposable PGlite PostgreSQL/WASM; historical migrations plus both role migrations applied. Covers 17 direct RPC gates, nonowner Super Admin, escalation/upsert/approval denial, default metadata safety, Profile edit, SQL Editor assignment/audit, invalid assignment, revocation, activation rollback, original body/OID preservation, BO3/5/7 FIFO/Replace/Swap/assignment/results.
- Auth schema/JWT functions are fixtures; only pgcrypto bytes are substituted for invite generation. Runner accepts no DB URL/network. It does not prove hosted Auth, real pgcrypto, schema drift, multi-session locking or Realtime acceptance.
- Backend static regression: **21 tests PASS** across room-lineup-migration, huy9-room-security and huy10-room-api-migration.
- Frontend: **49 files / 323 tests PASS**, typecheck/lint/build PASS; two existing AppContext warnings and dependency annotation build notices. No tests removed.
- Role browser: **72 checks PASS** at 390/768/1280/1440, direct URLs/reload/personas/ownership and zero Supabase requests. Final Auth/screenshot evidence is in frontend `docs/product/PLATFORM_ROLE_FOUNDATION.md`.
- Failures investigated: organizer test fixtures lacked authenticated identity and were corrected. configuration.test.tsx dynamic App import exceeded timeout under unrestricted workers, contaminating its next case; workers capped at four and complete run passed. Browser run during shared-package clean/build hit missing-import errors confirmed in Vite logs; browser must run after build. Earlier 2026-11-23 truncated failure remains unclassified.

## Adversarial self-review and recovery

P1 paths addressed: legacy RPC bypass, internal helper exposure, inherited column grants, JWT-based SQL-operator confusion, unapproved legacy elevation, cross-owner Super Admin writes and stale privileged actions. No remaining P0/P1 found in reviewed source. This is self-review, not an independent external audit.

Remaining operational gates: actual account inventory and operator/grant drift checks, PO role approvals, hosted concurrency/Realtime/RLS acceptance, and separate deployment approval. No hosted PASS is claimed.

Before COMMIT, failure leaves that migration's prior definitions/data intact. After a committed deployment, stop organizer writes and use captured preflight definitions/ACLs in a separately reviewed recovery transaction. Preserve audit/approval records; never drop them or reopen the unaudited setter. Prefer correcting an approved Host grant over disabling enforcement. Frontend rollback is separate; backend denials remain authoritative. No destructive automatic rollback is supplied.
