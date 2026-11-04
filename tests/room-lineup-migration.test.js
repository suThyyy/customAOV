// Static deployment regression checks; these do NOT execute PostgreSQL or prove RLS.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const sql=readFileSync(new URL('../db/migrations/20261103_huy11_room_lineup.sql',import.meta.url),'utf8');
const randomSql=readFileSync(new URL('../db/migrations/20261104_huy11_random_mode_lineup.sql',import.meta.url),'utf8');
const kickSql=readFileSync(new URL('../db/migrations/20261104_huy11_kick_replace_selected.sql',import.meta.url),'utf8');
const preflight=readFileSync(new URL('../db/verification/huy11_room_lineup_checks.sql',import.meta.url),'utf8');
const postflight=readFileSync(new URL('../db/verification/huy11_room_lineup_postflight.sql',import.meta.url),'utf8');
const definition=name=>{
 const match=sql.match(new RegExp('create or replace function public\\.'+name+'\\([\\s\\S]*?end; \\$\\$;','i'));
 assert.ok(match, name+' definition');return match[0];
};

test('lineup/replace share a locked, versioned Host guard and deny active rounds',()=>{
 const guard=definition('huy11_lock_preparing');
 assert.match(guard,/host_user_id=auth\.uid\(\) for update/);
 assert.match(guard,/huy9_is_anonymous_session\(\)/);
 assert.match(guard,/current_round_state <> 'preparing'/);
 assert.match(guard,/p_version is null or r\.version <> p_version/);
 for(const name of ['save_open_room_lineup','replace_open_room_player']){
  const body=definition(name);
  assert.match(body,/security definer set search_path = pg_catalog, public/i);
  assert.ok(body.indexOf('huy11_lock_preparing')<body.indexOf('update public.'),name+' guards writes');
 }
 assert.match(sql,/revoke all on function public\.huy11_lock_preparing\(uuid,bigint\) from public,anon,authenticated/);
 assert.doesNotMatch(sql,/grant execute on function public\.huy11_lock_preparing/);
 assert.match(sql,/read_open_room_state\(p_room_id uuid\)[\s\S]*?security invoker/);
});

test('prepare/start cannot strand an underfilled round or bypass persisted 5v5 teams',()=>{
 const prepare=definition('prepare_next_open_room_round'),start=definition('start_open_room_round');
 assert.ok(prepare.indexOf('if n < 10')<prepare.indexOf('delete from public.room_current_players'));
 assert.match(prepare,/order by q\.queue_seq limit 10/);
 assert.match(prepare,/get diagnostics n = row_count/);
 assert.match(prepare,/current_round_state not in \('idle','ended'\)/);
 assert.match(start,/team='a'\) <> 5/);assert.match(start,/team='b'\) <> 5/);
 assert.match(start,/m\.status <> 'active' or q\.status <> 'selected'/);
 assert.match(sql,/Open partial preparing Round exists/);
});

test('incremental migration supports Random Room lineups without fabricated skill scores',()=>{
 assert.match(randomSql,/skill_mode in \('random', 'tier', 'rank'\)/);
 assert.match(randomSql,/skill_mode' in \('tier','rank'\) and \(\s*coalesce\(length\(x->>'skill_value'\)/s);
 assert.match(randomSql,/skill_mode in \('tier','rank'\) and p\.skill_score is null/s);
 assert.match(randomSql,/grant execute on function public\.start_open_room_round\(uuid\) to authenticated/i);
});

test('incremental kick migration replaces a preparing slot from FIFO and keeps active snapshots locked',()=>{
 assert.match(kickSql,/current_round_state = 'preparing'/);
 assert.match(kickSql,/order by q\.queue_seq/);
 assert.match(kickSql,/set status = 'selected', selected_round_no/);
 assert.match(kickSql,/set member_id = next_queue\.member_id/);
 assert.match(kickSql,/delete from public\.room_current_players/);
 assert.match(kickSql,/current_round_state = 'preparing'[\s\S]*?end if;[\s\S]*?update public\.room_members/);
 assert.match(kickSql,/grant execute on function public\.host_kick_room_member\(uuid, uuid\) to authenticated/i);
});

test('replacement chooses FIFO on server and clears teams; no client override or auto-requeue',()=>{
 const replace=definition('replace_open_room_player');
 assert.match(replace,/order by q\.queue_seq limit 1 for update of q/);
 assert.match(replace,/status='removed' where id=old\.queue_entry_id/);
 assert.match(replace,/set team=null where room_id=p_room_id/);
 assert.doesNotMatch(replace,/insert into public\.room_queue_entries/);
 assert.doesNotMatch(sql,/grant (?:all|update|insert|delete) on (?:table )?public\./i);
});

test('preflight is safe before HUY-11 columns exist and postflight owns skill checks',()=>{
 assert.doesNotMatch(preflight,/skill_mode|skill_value|skill_score/);
 assert.match(preflight,/current_round_state='preparing'/);
 assert.match(preflight,/pg_publication/);
 assert.match(postflight,/skill_mode/);
 assert.match(postflight,/read_open_room_state/);
 assert.match(postflight,/pg_publication_tables/);
 assert.match(postflight,/has_function_privilege/);
});
