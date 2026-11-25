// Disposable PostgreSQL/WASM only. Never accepts a database URL.
// node tests/platform-roles.postgres.mjs ../customaov-platform
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const require = createRequire(resolve(process.argv[2] ?? '../customaov-platform', 'package.json'));
const { PGlite } = require('@electric-sql/pglite');
const db = new PGlite();
let checks = 0;
const sql = name => readFileSync(new URL('../db/migrations/' + name + '.sql', import.meta.url), 'utf8');
async function denied(query, args = [], code = '42501') {
  await assert.rejects(db.query(query, args), error => { assert.equal(error.code, code, error.message); return true; }); checks++;
}
async function identity(id, role = 'authenticated', anonymous = false) {
  await db.exec('reset role');
  await db.query("select set_config('request.jwt.claims', $1, false)", [JSON.stringify({ sub: id, role, is_anonymous: anonymous })]);
  await db.exec('set role ' + role);
}
try {
  await db.exec(`create role anon; create role authenticated; create role service_role;
    create schema auth; create schema extensions;
    create publication supabase_realtime;
    create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb default '{}',is_anonymous boolean default false);
    create function auth.jwt() returns jsonb language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb$$;
    create function auth.uid() returns uuid language sql stable as $$select (auth.jwt()->>'sub')::uuid$$;
    create function auth.role() returns text language sql stable as $$select auth.jwt()->>'role'$$;
    grant usage on schema auth to anon,authenticated,service_role;
    -- Only pgcrypto random bytes are substituted: authorization/lifecycle SQL is unchanged.
    create function extensions.gen_random_bytes(n integer) returns bytea language sql volatile as $$select decode(left(repeat(replace(gen_random_uuid()::text,'-',''),n),n*2),'hex')$$;
    create function public.gen_random_bytes(n integer) returns bytea language sql volatile as $$select extensions.gen_random_bytes(n)$$;`);
  const history = ['20261102_huy5_profiles_security','20261102_huy5_game_profiles_public_read',
    '20261103_huy8_game_uid_cooldown','20261103_huy9_open_room_security',
    '20261103_huy9_anonymous_auth_compatibility','20261103_huy10_room_api_support',
    '20261103_huy10_account_only_join','20261103_huy9_create_room_pgcrypto_hotfix',
    '20261103_huy11_room_lineup','20261104_huy11_random_mode_lineup','20261104_huy11_kick_replace_selected',
    '20261119_01_room_queue','20261119_02_room_configuration','20261119_03_series',
    '20261119_04_game_assignments','20261119_05_queue_lifecycle'];
  for (const name of history) {
    try { await db.exec(sql(name).replace(/create extension if not exists pgcrypto;/gi, '')); }
    catch (e) { throw new Error(name + ': ' + e.message); }
  }
  // Supabase baseline profile SELECT grants; role migration owns UPDATE grants.
  await db.exec('grant select on public.profiles to authenticated');
  await db.exec(readFileSync(new URL('../db/verification/platform_roles_preflight.sql',import.meta.url),'utf8'));
  const ids = ['00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000003'];
  for (const id of ids) await db.query("insert into auth.users(id,email,raw_user_meta_data) values($1,'fixture@example.invalid','{\"role\":\"admin\"}')",[id]);
  await db.exec(sql('20261123_01_platform_roles'));
  // A failed activation must leave all Room RPCs unchanged and preserve data.
  await db.query("insert into public.rooms(host_user_id,invite_code) values($1,'legacy-host-fixture')",[ids[0]]);
  await assert.rejects(db.exec(sql('20261123_02_room_role_authorization')), /Activation blocked/); checks++;
  await db.exec('rollback');
  assert.equal((await db.query("select count(*)::int as n from public.rooms where invite_code='legacy-host-fixture'")).rows[0].n,1); checks++;
  // Fixture-only cleanup; no production operations exist in this runner.
  await db.exec("delete from public.rooms where invite_code='legacy-host-fixture'");
  // Preserve exact Production CRLF source bytes, not Markdown serialization.
  const rawExport=JSON.parse(readFileSync(new URL('../docs/migration02_production_source.json',import.meta.url),'utf8'));
  const exported=rawExport[0]?.exact_source_export ?? rawExport.exact_source_export ?? rawExport;
  assert.equal(exported.length,17);
  for (const row of exported) {
    await db.exec(Buffer.from(row.definition_utf8_base64,'base64').toString('utf8'));
    const installed=(await db.query('select prosrc,md5(prosrc) as digest from pg_proc where oid=to_regprocedure($1)',[row.signature])).rows[0];
    assert.equal(installed.prosrc,Buffer.from(row.source_utf8_base64,'base64').toString('utf8'));
    assert.equal(installed.digest,row.source_md5);
    assert.equal(Buffer.byteLength(installed.prosrc),row.source_bytes); checks++;
    await db.exec(`grant execute on function public.${row.signature.replace(/^public\./,'')} to service_role`);
  }
  const previousBodies=(await db.query("select oid,prosrc,to_jsonb(p)-'prosrc' as metadata from pg_proc p where pronamespace='public'::regnamespace")).rows;
  // Even harmless source drift must abort, with no partially guarded functions.
  const createDefinition=Buffer.from(exported.find(row=>row.signature.replace(/^public\./,'')==='create_open_room()').definition_utf8_base64,'base64').toString('utf8');
  await db.exec(createDefinition.replace('begin', 'begin\n -- unexpected deployment drift'));
  await assert.rejects(db.exec(sql('20261123_02_room_role_authorization')), /Production source drift/); checks++;
  await db.exec('rollback');
  assert.equal((await db.query("select to_regprocedure('public.require_room_organizer(uuid)') as f")).rows[0].f,null); checks++;
  await db.exec(createDefinition);
  // Release gate is read-only and its fingerprints must match the supplied export.
  const exactResults=await db.exec(readFileSync(new URL('../db/verification/migration02_exact_source_export.sql',import.meta.url),'utf8'));
  const exact=exactResults.flatMap(result=>result.rows ?? []).find(row=>row.exact_source_export).exact_source_export;
  assert.equal(exact.length,17);
  for(const row of exact) {
    const decoded=Buffer.from(row.source_utf8_base64,'base64').toString('utf8');
    const original=(await db.query('select prosrc,md5(prosrc) as digest from pg_proc where oid=to_regprocedure($1)',[row.signature])).rows[0];
    assert.equal(decoded,original.prosrc);
    assert.equal(row.source_md5,original.digest);
    assert.equal(Buffer.byteLength(decoded),row.source_bytes);
  } checks++;
  // Reproduce confirmed Production service ACLs, then test the separate proposal locally.
  const helperSignatures=['huy11_lock_preparing(uuid,bigint)','series_host(uuid,bigint)',
    'phase3_internal_start_open_room_round(uuid)','phase3_internal_end_open_room_round(uuid)',
    'phase3_internal_kick(uuid,uuid)','phase3_internal_continue(uuid)'];
  for(const signature of helperSignatures) await db.exec(`grant execute on function public.${signature} to service_role`);
  const proposal=readFileSync(new URL('../db/verification/migration02_helper_acl_proposal.sql',import.meta.url),'utf8');
  await db.exec(proposal.replace(/rollback;\s*$/,'commit;')); // Disposable database ONLY.
  for(const signature of helperSignatures) {
    assert.equal((await db.query("select has_function_privilege('service_role',to_regprocedure($1),'EXECUTE') as allowed",['public.'+signature])).rows[0].allowed,false);
  } checks++;
  const gateResults=await db.exec(readFileSync(new URL('../db/verification/migration02_release_gate.sql',import.meta.url),'utf8'));
  const fingerprints=gateResults.flatMap(result=>result.rows ?? []).filter(row=>'fingerprint_matches' in row);
  assert.equal(fingerprints.length,17);
  assert.ok(fingerprints.every(row=>row.fingerprint_matches)); checks++;
  const helpers=gateResults.flatMap(result=>result.rows ?? []).filter(row=>'exists_must_be_true' in row);
  assert.equal(helpers.length,6);
  assert.ok(helpers.every(row=>row.exists_must_be_true && !row.anon_must_be_false
    && !row.authenticated_must_be_false && !row.service_must_be_false && !row.public_must_be_false)); checks++;
  await db.exec(sql('20261123_02_room_role_authorization'));
  const wrappedBodies=(await db.query("select oid,prosrc from pg_proc where pronamespace='public'::regnamespace and prosrc like '%perform public.require_room_organizer(%'")).rows;
  for(const after of wrappedBodies) {
    const before=previousBodies.find(x=>x.oid===after.oid);
    assert.equal(after.prosrc.replace(/\n perform public\.require_room_organizer\((?:p_room_id|null::uuid)\);/, ''), before.prosrc, 'Only guard insertion changes source'); checks++;
    const metadata=(await db.query("select to_jsonb(p)-'prosrc' as metadata from pg_proc p where oid=$1",[after.oid])).rows[0].metadata;
    assert.deepEqual(metadata,before.metadata,'All function metadata and ACLs preserved'); checks++;
    assert.match(after.prosrc,/begin\n perform public\.require_room_organizer\(/,'Guard is first executable statement'); checks++;
  }
  await identity(ids[0]);
  assert.equal((await db.query('select public.read_my_platform_role() as role')).rows[0].role,'user'); checks++;
  await denied("update public.profiles set role='admin' where id=auth.uid()");
  await denied('update public.profiles set role_approved_at=now() where id=auth.uid()');
  await denied("insert into public.profiles(id,role) values(auth.uid(),'admin') on conflict(id) do update set role='admin'");
  await denied("update public.rooms set host_user_id=auth.uid()");
  await denied("select public.assign_platform_role($1,'admin','fake','fake')",[ids[0]]);
  await denied('select public.create_open_room()');
  assert.equal((await db.query('select count(*)::int as n from public.rooms')).rows[0].n,0,'Denied creation has no business mutation'); checks++;
  await denied("select public.create_series_room('Test',3,'public','fun','random')");
  await db.exec("update public.profiles set display_name='Safe',bio='Profile edit' where id=auth.uid()"); checks++;
  await db.exec('reset role');
  await db.query("update public.profiles set role='admin' where id=$1",[ids[0]]);
  await identity(ids[0]);
  assert.equal((await db.query('select public.read_my_platform_role() as role')).rows[0].role,'user'); checks++;
  await denied('select public.create_open_room()');
  await db.exec('reset role');
  await db.query("update public.profiles set role='player' where id=$1",[ids[0]]);
  const auditBefore=(await db.query('select count(*)::int as n from public.platform_role_audit')).rows[0].n;
  await denied("select public.assign_platform_role($1,'bogus','operator','reason')",[ids[0]],'P0001');
  await denied("select public.assign_platform_role($1,'admin','operator','')",[ids[0]],'P0001');
  assert.equal((await db.query('select count(*)::int as n from public.platform_role_audit')).rows[0].n,auditBefore); checks++;
  for (const [index,role] of [[1,'admin'],[2,'super_admin']]) {
    await db.query('select public.assign_platform_role($1,$2,$3,$4)',[ids[index],role,'local verified operator','disposable test']);
  }
  const audit = (await db.query('select * from public.platform_role_audit')).rows;
  assert.equal(audit.length,2); assert.equal(audit[0].execution_role,'postgres'); checks++;
  await identity(ids[1]);
  const room = (await db.query('select * from public.create_open_room()')).rows[0]; checks++;
  const guarded = (await db.query(`select proname,proargnames,oidvectortypes(proargtypes) as types
    from pg_proc where pronamespace='public'::regnamespace and prosrc like '%perform public.require_room_organizer(%'`)).rows;
  assert.equal(guarded.length,17); checks++;
  for (const actor of [ids[0],ids[2]]) {
    await identity(actor);
    for (const fn of guarded) {
      if (actor===ids[2] && fn.proname.startsWith('create_')) continue;
      const types = fn.types ? fn.types.split(', ') : [];
      const args = types.map((type,i) => fn.proargnames[i]==='p_room_id' ? `'${room.id}'::uuid` : `null::${type}`);
      await denied(`select public.${fn.proname}(${args.join(',')})`);
    }
  }
  await identity(ids[2]);
  await db.query('select public.create_open_room()'); checks++;
  await denied('select public.close_open_room($1)',[room.id]);
  await denied('select public.phase3_internal_start_open_room_round($1)',[room.id]);
  await identity(ids[0]);
  await db.query('select public.join_open_room($1,$2)',[room.invite_code,'Player']); checks++;
  await identity(ids[1]);
  await db.query('select public.host_add_player_to_room($1,$2)',[room.id,'Added player']); checks++;
  // Same persisted BO/FIFO/version/Replace/Swap contracts behind the role gate.
  for (const bo of [3,5,7]) {
    const r=(await db.query("select * from public.create_series_room($1,$2,'public','fun','random')",['BO fixture',bo])).rows[0];
    for(let n=0;n<11;n++) await db.query('select public.host_add_player_to_room($1,$2)',[r.id,`Player ${n}`]);
    const version=async()=> (await db.query('select version from public.rooms where id=$1',[r.id])).rows[0].version;
    const fifo=(await db.query("select member_id from public.room_queue_entries where room_id=$1 order by queue_seq",[r.id])).rows;
    await db.query('select public.prepare_next_open_room_round($1)',[r.id]);
    let roster=(await db.query('select member_id from public.room_current_players where room_id=$1 order by slot',[r.id])).rows;
    assert.deepEqual(roster.map(x=>x.member_id),fifo.slice(0,10).map(x=>x.member_id)); checks++;
    await denied('select public.replace_open_room_player($1,-1,$2)',[r.id,roster[0].member_id],'P0001');
    await db.query('select public.replace_open_room_player($1,$2,$3)',[r.id,await version(),roster[0].member_id]);
    roster=(await db.query('select member_id from public.room_current_players where room_id=$1 order by slot',[r.id])).rows;
    assert.equal(roster[0].member_id,fifo[10].member_id); checks++;
    const lineup=roster.map((x,i)=>({...x,team:i<5?'a':'b',skill_mode:'random',skill_value:null,skill_score:null}));
    await db.query('select public.save_open_room_lineup($1,$2,$3)',[r.id,await version(),JSON.stringify(lineup)]);
    await db.query('select public.swap_open_room_players($1,$2,$3,$4)',[r.id,await version(),roster[0].member_id,roster[5].member_id]);
    for(let n=0;n<Math.floor(bo/2)+1;n++) {
      const game=(await db.query('select * from public.start_series_game($1,$2)',[r.id,await version()])).rows[0];
      await denied('select public.save_open_room_lineup($1,$2,$3)',[r.id,await version(),JSON.stringify(lineup)],'P0001');
      await db.query('select public.assign_series_game($1,$2,$3,$4)',[r.id,await version(),game.id,'automatic']);
      const series=(await db.query('select * from public.report_series_result($1,$2,$3,$4,$5,true)',[r.id,await version(),game.id,`local-${bo}-${n}`,'a'])).rows[0];
      assert.equal(series.complete,n===Math.floor(bo/2)); checks++;
    }
    assert.equal((await db.query('select current_round_state from public.rooms where id=$1',[r.id])).rows[0].current_round_state,'ended'); checks++;
  }
  await db.exec('reset role');
  await db.query("select public.assign_platform_role($1,'user','local operator','revoke test')",[ids[1]]);
  await identity(ids[1]);
  await denied('select public.close_open_room($1)',[room.id]);
  await denied('select public.prepare_next_open_room_round($1)',[room.id]);
  await identity(ids[2],'authenticated',true);
  await denied('select public.create_open_room()');
  await identity(null,'anon');
  await denied('select public.create_open_room()');
  await db.exec('reset role');
  await db.exec(readFileSync(new URL('../db/verification/platform_roles_postflight.sql',import.meta.url),'utf8'));
  console.log(`PASS: ${checks} PostgreSQL role/security checks; historical migrations + both role migrations applied in disposable PGlite.`);
} catch (error) { console.error(error.message, error.where ?? ''); process.exitCode = 1; }
finally { await db.close(); }
