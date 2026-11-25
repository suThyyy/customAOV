/* Runs entirely in a fresh in-memory PostgreSQL instance. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { PGlite } = require('@electric-sql/pglite');
const { pgcrypto } = require('@electric-sql/pglite/contrib/pgcrypto');
async function setup(db) {
 await db.exec(`create role anon; create role authenticated; create schema auth; create schema extensions;
 create extension pgcrypto with schema extensions; create publication supabase_realtime;
 create table auth.users(id uuid primary key);
 create function auth.uid() returns uuid language sql as $$select current_setting('test.uid')::uuid$$;

 create function auth.jwt() returns jsonb language sql as $$select jsonb_build_object('is_anonymous',current_setting('test.anonymous',true)='true')$$;
 grant usage on schema auth to authenticated;
 insert into auth.users values ('00000000-0000-0000-0000-000000000001');
 set test.uid='00000000-0000-0000-0000-000000000001';
 create function auth.role() returns text language sql as $$select 'authenticated'::text$$;`);
 const dir='db/migrations/';
 const filenames=fs.readdirSync(dir);
 for(const part of ['huy9_open','huy9_create','huy10_account','huy10_room','huy11_room','huy11_kick','huy11_random','20261119_01','20261119_02','20261119_03','20261119_04','20261119_05']) {
  if(part==='20261119_01') {
   const result=await db.exec(fs.readFileSync('db/verification/phase3_preflight.sql','utf8'));
   assert.ok(result[0].rows.every(r=>r.expected_presence && r.baseline_contract_ok!==false));
  }
  await db.exec(fs.readFileSync(dir+filenames.find(f=>f.includes(part)),'utf8'));
 }
}
module.exports={setup};
async function run() {
 const db = new PGlite({extensions:{pgcrypto}});
 const rows = async (sql, args=[]) => (await db.query(sql,args)).rows;
 const one = async (sql,args) => (await rows(sql,args))[0];
 await setup(db);
 const audit=await db.exec(fs.readFileSync('db/verification/phase3_postflight.sql','utf8'));
 assert.equal(audit[0].rows.length,15);
 assert.ok(audit[0].rows.every(row=>row.passes),JSON.stringify(audit[0].rows));
 assert.ok(audit[2].rows.every(row=>row.private_contract_ok));
 await db.exec("insert into auth.users values ('00000000-0000-0000-0000-000000000002')");
 await db.exec('set role anon');
 await assert.rejects(rows('select * from discover_series_rooms()'),/permission denied/);
 await db.exec("set role authenticated;set test.anonymous='true'");
 await assert.rejects(rows("select * from create_series_room('Guest',3,'public','fun','random')"),/registered authenticated/);
 await db.exec("set test.anonymous='false'");
 await assert.rejects(rows("insert into series_games default values"),/permission denied/);
 await db.exec('set role authenticated');
 for(const invalidMode of [null,'mixed']) {
  await assert.rejects(one("select create_series_room('Invalid',3,'private','fun',$1)",[invalidMode]),/Configuration required|check constraint/);
 }
 for(const bo of [3,5,7]) {
  const mode={3:'random',5:'tier',7:'rank'}[bo];
  const visibility=bo===7?'public':'private';
  const room=await one("select * from create_series_room('Test',$1,$2,'fun',$3)",[bo,visibility,mode]);
  const rpc=async(call,...args)=>one('select * from '+call,[room.id,...args]);
  const version=async()=>(await one('select version from rooms where id=$1',[room.id])).version;
  const idle=await rpc("set_room_play_style($1,$2,'tryhard')",await version());
  assert.equal(idle.current_round_state,'idle');
  await rpc("set_room_play_style($1,$2,'fun')",idle.version);
  for(let i=0;i<50;i++) await rpc('host_add_player_to_room($1,$2)','Guest '+i);
  await assert.rejects(rpc('host_add_player_to_room($1,$2)','Overflow'),/QUEUE_FULL/);
  await rpc('prepare_next_open_room_round($1)');
  const players=()=>rows('select * from room_current_players where room_id=$1 order by slot',[room.id]);
  const roster=(await players()).map((p,i)=>({...p,team:i<5?'a':'b',skill_mode:'random'}));
  await assert.rejects(rpc('save_open_room_lineup($1,$2,$3)',await version(),JSON.stringify(roster.slice(1))),/Exactly ten/);
  await assert.rejects(rpc('save_open_room_lineup($1,$2,$3)',await version(),JSON.stringify(roster.map(p=>({...p,team:'a'})))),/5v5/);
  await assert.rejects(rpc('start_series_game($1,$2)',await version()),/allocation mode/);
  await rpc('save_open_room_lineup($1,$2,$3)',await version(),JSON.stringify(roster));
  if(mode!=='random') await assert.rejects(rpc('start_series_game($1,$2)',await version()),/allocation mode/);
  const skills=p=>({...p,skill_mode:mode,skill_value:mode==='random'?null:'1',skill_score:mode==='random'?null:1});
  await rpc('save_open_room_lineup($1,$2,$3)',await version(),JSON.stringify(roster.map(skills)));
  const setStyle=(v,s)=>rpc('set_room_play_style($1,$2,$3)',v,s);
  const initialVersion=await version();
  const styled=await setStyle(initialVersion,'tryhard');
  assert.equal(Number(styled.version),Number(initialVersion)+1);
  assert.equal(styled.play_style,'tryhard');
  assert.equal(styled.allocation_mode,mode);
  await assert.rejects(setStyle(initialVersion,'fun'),error=>error.code==='40001');
  for(const invalid of [null,'competitive']) await assert.rejects(setStyle(styled.version,invalid),/Invalid play style/);
  const old=await version();
  await db.exec("set test.uid='00000000-0000-0000-0000-000000000002'");
  assert.equal((await rows('select * from rooms where id=$1',[room.id])).length,0);
  assert.equal((await rows('select * from discover_series_rooms() where room_id=$1',[room.id])).length,Number(visibility==='public'));
  await assert.rejects(setStyle(old,'fun'),/host required/);
  await assert.rejects(rpc('replace_open_room_player($1,$2,$3)',old,roster[2].member_id),/Host only/);
  await db.exec("set test.uid='00000000-0000-0000-0000-000000000001'");
  await assert.rejects(rpc('host_requeue_room_member($1,$2)',roster[0].member_id),/already in the active Queue/);
  await rpc('replace_open_room_player($1,$2,$3)',old,roster[1].member_id);
  await assert.rejects(rpc('replace_open_room_player($1,$2,$3)',old,roster[2].member_id),/refresh/);
  await rpc('host_requeue_room_member($1,$2)',roster[1].member_id);
  const tail=await one('select member_id from room_queue_entries where room_id=$1 order by queue_seq desc limit 1',[room.id]);
  assert.equal(tail.member_id,roster[1].member_id);
  const beforeKick=await players();
  const waiting=await one("select member_id from room_queue_entries where room_id=$1 and status='waiting' order by queue_seq limit 1",[room.id]);
  await rpc('host_kick_room_member($1,$2)',beforeKick[4].member_id);
  const current=await players();
  assert.deepEqual(current.map(p=>p.member_id),beforeKick.map((p,i)=>i===4?waiting.member_id:p.member_id));
  if(mode!=='random') {
   await assert.rejects(rpc('start_series_game($1,$2)',await version()),/allocation mode/);
   await rpc('save_open_room_lineup($1,$2,$3)',await version(),JSON.stringify(current.map(skills)));
  }
  assert.deepEqual(current.map(p=>p.team),roster.map(p=>p.team));
  await rpc('swap_open_room_players($1,$2,$3,$4)',await version(),current[0].member_id,current[5].member_id);
  let swapped=await players();
  assert.equal(swapped[0].member_id,current[5].member_id);
  assert.equal(swapped[0].team,'a');
  await rpc('swap_open_room_players($1,$2,$3,$4)',await version(),current[1].member_id,current[2].member_id);
  swapped=await players();
  assert.equal(swapped[1].member_id,current[2].member_id);
  assert.equal(swapped[1].team,'a');
  await assert.rejects(rpc('start_open_room_round($1)'),/Series lifecycle/);
  let series,firstMatch;
  for(let i=1;i<=Math.floor(bo/2)+1;i++) {
   const g=await rpc('start_series_game($1,$2)',await version());
   assert.equal(g.game_no,i);
   const readRoster=()=>rows('select member_id,slot,team from series_players where series_id=$1 order by slot',[g.series_id]);
   const locked=swapped.map(({member_id,slot,team})=>({member_id,slot,team}));
   assert.deepEqual(await readRoster(),locked);
   await assert.rejects(setStyle(await version(),'fun'),/active series/);
   if(i===1) {
    await assert.rejects(rpc('prepare_next_open_room_round($1)'),/ended/);
    await assert.rejects(rpc('save_open_room_lineup($1,$2,$3)',await version(),'[]'),/not preparing/);
    await assert.rejects(rpc('replace_open_room_player($1,$2,$3)',await version(),current[0].member_id),/not preparing/);
    await assert.rejects(rpc('close_open_room($1)'),/active series/);
    await rpc('host_kick_room_member($1,$2)',current[0].member_id);
    assert.deepEqual(await readRoster(),locked);
   }
   await assert.rejects(rpc('end_open_room_round($1)'),/Series lifecycle/);
   await assert.rejects(rpc('swap_open_room_players($1,$2,$3,$4)',await version(),current[0].member_id,current[5].member_id),/not preparing/);
   const partial=[{member_id:current[2].member_id,hero:'Heino',lane:'mid',team:'b'}];
   await rpc("assign_series_game($1,$2,$3,'manual',$4)",await version(),g.id,JSON.stringify(partial));
   await assert.rejects(rpc("report_series_result($1,$2,$3,'partial','a',true)",await version(),g.id),/Complete assignments/);
   partial.push({...partial[0],member_id:current[3].member_id});
   await assert.rejects(rpc("assign_series_game($1,$2,$3,'manual',$4)",await version(),g.id,JSON.stringify(partial)),/duplicate assignment/);
   const opposing=[{member_id:current[2].member_id,hero:'Heino',lane:'mid'},{member_id:current[7].member_id,hero:'Heino',lane:'mid'}];
   await rpc("assign_series_game($1,$2,$3,'manual',$4)",await version(),g.id,JSON.stringify(opposing));
   const assigned=await rpc("assign_series_game($1,$2,$3,'automatic')",await version(),g.id);
   assert.equal(assigned.assignments.length,10);
   const persisted=await one('select assignments from series_games where id=$1',[g.id]);
   assert.deepEqual(persisted.assignments,assigned.assignments);
   for(const side of ['a','b']) {
    const members=await rows('select member_id from series_players where series_id=$1 and team=$2',[g.series_id,side]);
    const team=assigned.assignments.filter(a=>members.some(m=>m.member_id===a.member_id));
    assert.equal(new Set(team.map(a=>a.hero)).size,5);
    assert.equal(new Set(team.map(a=>a.lane)).size,5);
   }
   await assert.rejects(rpc("assign_series_game($1,$2,$3,'automatic')",await version(),g.id),/Already generated/);
   const match=bo+'-'+i;
   if(i===1) firstMatch=match;
   await assert.rejects(rpc("report_series_result($1,$2,$3,$4,'a',false)",await version(),g.id,match),/Confirmed match/);
   if(i>1) await assert.rejects(rpc("report_series_result($1,$2,$3,$4,'a',true)",await version(),g.id,firstMatch),/duplicate/);
   series=await rpc("report_series_result($1,$2,$3,$4,'a',true)",await version(),g.id,match);
   assert.equal(series.blue_wins,i);
   assert.deepEqual(await readRoster(),locked);
   assert.deepEqual((await one('select assignments from series_games where id=$1',[g.id])).assignments,assigned.assignments);
   if(i===1) {
    await db.exec("set test.uid='00000000-0000-0000-0000-000000000002'");
    const history=()=>rows('select * from read_public_game_results($1)',[room.id]);
    const summary=await history();
    assert.equal(summary.length,Number(visibility==='public'));
    if(summary.length) {
     assert.equal(summary[0].match_id,match);
     assert.equal(summary[0].verification,'UNVERIFIED');
     assert.equal(summary[0].provenance,'HOST_REPORTED');
    }
    const revisions=()=>rows('select * from game_result_revisions where game_id=$1',[g.id]);
    assert.equal((await revisions()).length,0);
    await db.exec("set test.anonymous='true'");
    assert.equal((await history()).length,0);
    await db.exec("set test.anonymous='false'");
    await one("select join_open_room($1,'Viewer')",[room.invite_code]);
    assert.equal((await revisions()).length,1);
    await db.exec("set test.anonymous='true'");
    assert.equal((await revisions()).length,0);
    await db.exec("set test.anonymous='false'");
    await rpc('leave_open_room($1)');
    assert.equal((await revisions()).length,0);
    const rejoined=await one("select * from join_open_room($1,'Viewer')",[room.invite_code]);
    await db.exec("set test.uid='00000000-0000-0000-0000-000000000001'");
    await rpc('host_kick_room_member($1,$2)',rejoined.id);
    await db.exec("set test.uid='00000000-0000-0000-0000-000000000002'");
    assert.equal((await history()).length,0);
    assert.equal((await revisions()).length,0);
    await db.exec("set test.uid='00000000-0000-0000-0000-000000000001'");
   }
   await assert.rejects(rpc("report_series_result($1,$2,$3,$4,'a',true)",await version(),g.id,match),/Unexpected game state/);
   await assert.rejects(rpc("assign_series_game($1,$2,$3,'manual',$4)",await version(),g.id,'[]'),/no rows/);
   if(series.complete) {
    await assert.rejects(rpc('start_series_game($1,$2)',await version()),/not preparing/);
    const currentVersion=await version();
    await db.exec("set test.uid='00000000-0000-0000-0000-000000000002'");
    await assert.rejects(rpc("report_series_result($1,$2,$3,$4,'b',true,true)",currentVersion,g.id,match),/host required/);
    assert.equal((await rows('select * from series_games where id=$1',[g.id])).length,0);
    await db.exec("set test.uid='00000000-0000-0000-0000-000000000001'");
    const corrected=await rpc("report_series_result($1,$2,$3,$4,'b',true,true)",await version(),g.id,match);
    assert.equal(corrected.complete,false);
    assert.equal((await rows('select * from game_result_revisions where game_id=$1',[g.id])).length,2);
   }
  }
  assert.equal(series.complete,true);
  const deciding=await rpc('start_series_game($1,$2)',await version());
  assert.equal(deciding.game_no,Math.floor(bo/2)+2);
  const correctedGame=await one('select id,match_id from series_games where series_id=$1 and winner=\'b\'',[deciding.series_id]);
  await assert.rejects(rpc("report_series_result($1,$2,$3,$4,'a',true,true)",await version(),correctedGame.id,correctedGame.match_id),/invalidate later games/);
  const revisions=await rows('select winner from game_result_revisions where game_id=$1 order by id',[correctedGame.id]);
  assert.deepEqual(revisions.map(row=>row.winner),['a','b']);
  await rpc("report_series_result($1,$2,$3,$4,'a',true)",await version(),deciding.id,bo+'-final');
  assert.equal((await setStyle(await version(),'fun')).play_style,'fun');
  await rpc('close_open_room($1)');
  await assert.rejects(setStyle(await version(),'tryhard'),/host required/);
 }
 const legacy=await one('select * from create_open_room()');
 assert.equal(legacy.best_of,null);
 for(let i=0;i<10;i++) await one("select host_add_player_to_room($1,$2)",[legacy.id,'Legacy '+i]);
 const prepared=await one('select * from prepare_next_open_room_round($1)',[legacy.id]);
 const snap=(await one('select read_open_room_state($1) data',[legacy.id])).data;
 assert.deepEqual(Object.keys(snap).sort(),['currentPlayers','members','queue','room']);
 const lineup=snap.currentPlayers.map((p,i)=>({...p,team:i<5?'a':'b',skill_mode:'random'}));
 await one('select save_open_room_lineup($1,$2,$3)',[legacy.id,prepared.version,JSON.stringify(lineup)]);
 await one('select start_open_room_round($1)',[legacy.id]);
 const ended=await one('select * from end_open_room_round($1)',[legacy.id]);
 assert.equal(ended.current_round_state,'ended');
 assert.equal((await rows('select * from room_series where room_id=$1',[legacy.id])).length,0);
 await db.close();
 console.log('Phase 3 PostgreSQL scenarios passed (BO3, BO5, BO7)');
}
if(require.main===module) run().catch(error=>{ console.error(error.message,error.where);process.exitCode=1; });
