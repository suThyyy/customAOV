-- READ ONLY, BEFORE Migration 02. Every fingerprint_matches must be true (17 rows).
-- Re-run immediately before activation. No body text or JWT secrets are emitted.
begin transaction read only;
with expected(signature,digest,begin_end) as (values
('assign_series_game(uuid,bigint,uuid,text,jsonb)','f57a055d817584fd5840480ccdd7bae4',113),
('close_open_room(uuid)','74de1153dedbe9cb4e38cb8faffe4d0c',45),
('create_open_room()','a1e11f90802baf1bddc130e88a46e9df',46),
('create_series_room(text,integer,text,text,text)','bb79fb0a3d84bb3a8236bdf945cab3c2',32),
('end_open_room_round(uuid)','fe11fb1cf9b4f70ed575dd51172b2b0f',7),
('host_add_player_to_room(uuid,text)','307e970a6cce88005ead3905faf0641d',82),
('host_kick_room_member(uuid,uuid)','8a5ee786287385fb36fec939eee34c03',32),
('host_requeue_room_member(uuid,uuid)','103d156f586b4d372b393ec2f183eed5',128),
('prepare_next_open_room_round(uuid)','a46bf9364517b09435a88e2de9870cb7',43),
('replace_open_room_player(uuid,bigint,uuid)','5d9872c860597bb819654d72d844e242',109),
('report_series_result(uuid,bigint,uuid,text,text,boolean,boolean)','2f504384e3c5e2a13d0245ad9aa198f8',138),
('save_open_room_lineup(uuid,bigint,jsonb)','15e6a84b9cc0583e63c8f78d922880bd',43),
('set_room_allocation_mode(uuid,bigint,text)','8ec21894890af068188fcbff26b90930',32),
('set_room_play_style(uuid,bigint,text)','eb385864f8f76f79e2654eafbbfbd1f2',32),
('start_open_room_round(uuid)','78917f959fe386ffbf5e4574454a3f1d',7),
('start_series_game(uuid,bigint)','1d91e243f62ee8def81666c368be05f1',88),
('swap_open_room_players(uuid,bigint,uuid,uuid)','3ce0747272fc4014ce9b3e6f8741f933',94)
)
select e.signature,e.digest as expected_md5,md5(p.prosrc) as actual_md5,
 coalesce(md5(p.prosrc)=e.digest,false) as fingerprint_matches
from expected e left join pg_proc p on p.oid=to_regprocedure('public.'||e.signature)
order by e.signature;

-- Missing helper OR any effective client/service EXECUTE is a release blocker.
-- These internal entry points do not contain the new organizer guard.
with expected(signature) as (values
 ('huy11_lock_preparing(uuid,bigint)'),('series_host(uuid,bigint)'),
 ('phase3_internal_start_open_room_round(uuid)'),('phase3_internal_end_open_room_round(uuid)'),
 ('phase3_internal_kick(uuid,uuid)'),('phase3_internal_continue(uuid)'))
select e.signature,p.oid is not null as exists_must_be_true,p.proacl,
 has_function_privilege('anon',p.oid,'EXECUTE') as anon_must_be_false,
 has_function_privilege('authenticated',p.oid,'EXECUTE') as authenticated_must_be_false,
 has_function_privilege('service_role',p.oid,'EXECUTE') as service_must_be_false,
 exists(select from aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a
   where a.grantee=0 and a.privilege_type='EXECUTE') as public_must_be_false
from expected e left join pg_proc p on p.oid=to_regprocedure('public.'||e.signature);
select status,count(*) from public.rooms group by status;
select count(*) as approved_super_admins from public.profiles
 where role='admin' and role_approved_at is not null;
rollback;
