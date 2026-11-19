# Phase 3 backend contract

## Calling conventions

Use a permanent Supabase Auth account. The host is rooms.host_user_id. Room identifiers, member identifiers and game identifiers are distinct UUIDs. Read read_open_room_state(p_room_id) after each successful mutation and on reconnect. Its JSON keys remain room, members, queue and currentPlayers. Treat room.version (bigint) as opaque. A single call may advance it multiple times. Never derive the next version locally.

All privileged mutations run in a database transaction. Host operations lock the room before changing its queue, lineup or games. On stale input refresh and ask the host to review the updated state. Series RPCs use SQLSTATE 40001, HUY-11 preparing RPCs use P0001 with “Room changed; refresh and retry”. Ordinary business rejections use P0001, strict missing identifiers P0002, constraints 23514, duplicate keys 23505 and denied SQL privileges 42501. Display the returned error. Retry only after reconciling authoritative state.

## Configuration and discovery

Migration 02 creates configured rooms. room_name is trimmed (1–80 characters), best_of is 3, 5 or 7, visibility is public or private, play_style is fun or tryhard, allocation_mode is random, tier or rank. Name, format and visibility are immutable after creation. Play style has no effect on scoring or selection. The legacy zero-argument create_open_room still creates a private invitation-only round room with best_of NULL.

| RPC and inputs | Caller and allowed state | Response and invariants |
|---|---|---|
| create_series_room(p_name text,p_best_of integer,p_visibility text,p_style text,p_mode text) | Permanent account | Full rooms row including id and invite_code. Starts open/idle. |
| discover_series_rooms() | Permanent account | Array of room_id, room_name, best_of, play_style, allocation_mode and invite_code for open public rooms. Anonymous sessions see no rows. |
| set_room_play_style(p_room_id uuid,p_version bigint,p_style text) | Permanent configured-room host, open and idle/preparing/ended | Accepts fun/tryhard, returns the rooms row and increments version once. Active series, including intervals between games, block edits. Migration 05. |
| set_room_allocation_mode(p_room_id uuid,p_version bigint,p_mode text) | Configured open room host, idle/ended or preparing before any team is saved | Updated rooms row. Future allocation uses new mode. Migration 05. |

Use join_open_room(p_invite_code text,p_display_name text) for either visibility. Discovery releases the join code only for public rooms. Private access requires the shared high-entropy code. Room UUID alone grants no read or join rights. Active members and host can read the full room snapshot including its shareable invite code. The existing RLS policies protect direct reads. Room list discovery uses a narrow definer function.

## Queue and allocation

All active waiting and selected registrations count toward 50 across both account and host-added identities. A host counts only when queued. The unique partial index permits one active entry per member. Each host-added nickname creates a separate member identity. Capacity checks serialize on the room, including joins and both requeue paths. A failed insert rolls back the membership change. queue_seq orders FIFO and may have gaps.

| Operation | Inputs and return | Eligibility and effects |
|---|---|---|
| join_open_room | invite code and display name → room_members | Open room. Active account join is idempotent. A left account rejoins at the tail. Kicked accounts cannot rejoin. |
| host_add_player_to_room | p_room_id uuid,p_display_name text → room_members | Open room host adds a nickname-only guest at tail. |
| leave_open_room | p_room_id uuid → void | Active account marks membership left and removes its active queue entry. Locked series history retains identity. |
| continue_open_room_queue | p_room_id uuid → room_queue_entries | Active account outside the queue, open room. New tail entry. |
| host_requeue_room_member | p_room_id uuid,p_member_id uuid → room_queue_entries | Open room host, active nickname-only member outside queue. Waiting and selected entries cannot be repositioned. |
| host_kick_room_member | p_room_id uuid,p_member_id uuid → void | Open room host, excluding self. In configured PREPARE, selected kick requires a FIFO replacement. During series play kick affects room membership/access only. |
| prepare_next_open_room_round | p_room_id uuid → rooms | Host, idle or ended. Takes the first ten eligible entries for Game 1 of a new series. |
| save_open_room_lineup | p_room_id uuid,p_version bigint,p_players jsonb → rooms | Host, preparing. Existing random/tier/rank ten-player 5v5 payload. Use existing Randomizer logic and the configured mode. |
| replace_open_room_player | p_room_id uuid,p_version bigint,p_member_id uuid → rooms | Host, preparing. Keeps slot/team, preserves random mode and clears player-specific Tier/Rank inputs, promotes first eligible waiting entry, removes old registration. One call. |
| swap_open_room_players | p_room_id uuid,p_version bigint,p_first uuid,p_second uuid → rooms | Host, preparing, allocated 5v5. Players trade slots. Opposing players trade teams. Same-team players trade order. Skill metadata travels with the player. |

Migration 01 implements capacity, replace and swap. Migration 05 serializes leave/continue, preserves kick eligibility and updates room.version for queue changes. Legacy HUY-9/10/11 signatures are preserved. A selected account that leaves before START requires host replacement to restore eligibility.

## Series and results

Migration 03 creates room_series (one incomplete series per room, unique room/round), series_players (immutable member ID, name, slot and team), series_games (unique series/game number, timestamps, assignments and current result), and game_result_revisions (chronological reporter, timestamp, match ID, winner, HOST_REPORTED and UNVERIFIED). Team a is Blue and b is Red. Every game references its series roster. Result history joins through game → series → room. Read these tables through authenticated SELECT under room membership RLS. Sort games by game_no and revisions by id.

| RPC | State and host input | Return and effects |
|---|---|---|
| start_series_game(p_room_id uuid,p_version bigint) | Configured open room host. First game requires preparing, ten active selected participants for the current round and saved 5v5. Every saved mode must match the room. After a Tier/Rank replacement, enter the incoming player’s skill and save the retained teams before START. Later games require previous game ended and series incomplete. | series_games row. First START snapshots the roster. Next START creates the next numbered game from that roster. The room remains active between games. |
| report_series_result(p_room_id uuid,p_version bigint,p_game_id uuid,p_match_id text,p_winner text,p_confirm boolean,p_correct boolean default false) | Configured open room host, matching game, confirmed nonempty trimmed ID (max 128), winner a/b. First report requires started game. Correction requires ended game. | Updated room_series including blue_wins, red_wins, complete. Appends revision, derives loser and recomputes score. Current match IDs unique within source aov. A repeated END fails. |

An untouched game can end with no assignments. A nonempty draft must be complete. Completion at best_of/2 rounded down plus one win ends the room round and releases selected queue entries. A correction that creates a clinch before an existing later game rolls back. Reopening a finished series requires its round still be current and ended. Reopening preserves the original roster regardless of subsequent queue registrations. A closed room is read-only. There is no provider verification or player-stat update.

Legacy start_open_room_round and end_open_room_round remain available for unconfigured rooms. Configured rooms require the new lifecycle and cannot close mid-series. Do not expose configured rooms in an old host UI that only knows the legacy Start/End controls.

## History visibility and roster lock

Host and active account members can read full history through the four related tables. Private invite holders redeem the code through join_open_room before reading. Leaving or being kicked revokes member access. The baseline huy9_can_access_room checks the host UUID or active membership. The Phase 3 parent policy also excludes anonymous JWTs; the other three policies follow the parent through RLS.

Migration 03 adds read_public_game_results(p_room_id uuid). A permanent authenticated discovery viewer can read ended results of an open public room, except when kicked from that room. It returns rows ordered by series and game with series_id, game_no, match_id, winner, ended_at, provenance and verification. Private, closed, unknown or ineligible requests return an empty set. The anon database role has no EXECUTE grant. Refresh the query to see corrections. Detailed rosters, drafts, reporter IDs and revisions remain member-only.

| Entry paths | Effect during an active series |
|---|---|
| Prepare, save lineup, Replace and Swap | Existing room-state guards reject the mutation. |
| Legacy Start and End, close | Configured-room wrappers and the close trigger reject lifecycle bypasses. |
| Join, add, leave, continue and host requeue | Change room membership or queue registrations. These functions never write series_players. |
| Kick | During PREPARE the wrapper promotes one FIFO replacement. The legacy implementation then looks up the outgoing member by ID, finds no current slot and completes the kick. During active play it skips the preparing branch entirely. |
| Series START, result and correction | Game 1 inserts the roster once. Every later game references the same series. Corrections recompute score under the room lock. |
| Hero/lane edits | Only game assignments, mode and the generation flag change. Input team fields are discarded. |

## Hero and lane assignment

Migration 04 installs series_hero_catalog using the repository’s HEROES_DATA names as stable identifiers. Maintain the catalog through reviewed SQL. Use authenticated SELECT for the picker. Lanes are top, jungle, mid, adc and support.

assign_series_game(p_room_id uuid,p_version bigint,p_game_id uuid,p_mode text,p_players jsonb default null) returns the updated series_games row. Only the open room host may edit a started, unended game. Automatic generation persists ten randomized hero/lane rows, with five distinct heroes and lanes per team. auto_generated permanently records generation for that game. Reconnect reads the rows. Manual edits replace the whole draft, using an array of {member_id,hero,lane}. Null or absent hero/lane is permitted while editing. An empty draft clears assignments. The server resolves team from the immutable series roster. Same-team duplicates, duplicate member IDs and unknown identifiers fail. Opposing teams may use the same hero.

## Platform integration examples

Each line illustrates an independent call with the current room version. Read the room and history again after successful writes. Subscribe to the existing rooms UPDATE publication filtered by room ID; each series/assignment/result transaction advances that row, so no history-table publication is required. Keep the existing membership, queue and current-player subscriptions. Discovery is a pull query.

```js
await supabase.rpc('create_series_room', {p_name:'Friday', p_best_of:5, p_visibility:'private', p_style:'fun', p_mode:'random'});
await supabase.rpc('discover_series_rooms');
const room = {p_room_id:roomId};
const edit = {...room, p_version:version};
await supabase.rpc('read_public_game_results', room);
await supabase.rpc('set_room_play_style', {...edit,p_style:'tryhard'});
await supabase.rpc('set_room_allocation_mode', {...edit,p_mode:'tier'});
await supabase.rpc('leave_open_room', room);
await supabase.rpc('continue_open_room_queue', room);
await supabase.rpc('host_kick_room_member', {...room,p_member_id:memberId});
await supabase.rpc('replace_open_room_player', {...edit,p_member_id:memberId});
await supabase.rpc('swap_open_room_players', {...edit,p_first:firstId,p_second:secondId});
await supabase.rpc('start_series_game', edit);
await supabase.rpc('assign_series_game', {...edit,p_game_id:gameId,p_mode:'automatic'});
await supabase.rpc('assign_series_game', {...edit,p_game_id:gameId,p_mode:'manual',p_players:draft});
await supabase.rpc('report_series_result', {...edit,p_game_id:gameId,p_match_id:matchId,p_winner:'a',p_confirm:true,p_correct:false});
```

Replace the Platform two-call repair with one replace RPC. Use atomic swap for either slot operation. Route by best_of, prepare and balance only before Game 1, and use start_series_game for each subsequent game. Read the returned series score after END. Submit corrections via the same result RPC with p_correct true. Reconnect using persisted game and roster rows.
