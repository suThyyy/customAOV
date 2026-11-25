-- SEPARATE ACL PROPOSAL. Requires approval and external service workflow inventory.
-- Release record: PO confirms this separate ACL action was approved and applied.
-- Historical reviewed artifact; do not rerun as part of Migration 02 deployment.
-- Not part of Migration 02. Defaults to ROLLBACK; no activation is authorized here.
begin;
revoke execute on function
 public.huy11_lock_preparing(uuid,bigint),
 public.series_host(uuid,bigint),
 public.phase3_internal_start_open_room_round(uuid),
 public.phase3_internal_end_open_room_round(uuid),
 public.phase3_internal_kick(uuid,uuid),
 public.phase3_internal_continue(uuid)
from service_role;
do $$
declare signature text; target oid; client text;
begin
 foreach signature in array array[
 'huy11_lock_preparing(uuid,bigint)','series_host(uuid,bigint)',
 'phase3_internal_start_open_room_round(uuid)','phase3_internal_end_open_room_round(uuid)',
 'phase3_internal_kick(uuid,uuid)','phase3_internal_continue(uuid)'] loop
  target:=to_regprocedure('public.'||signature);
  if target is null then raise exception 'Missing helper: %',signature; end if;
  foreach client in array array['anon','authenticated','service_role'] loop
  IF EXISTS (
    SELECT 1
    FROM pg_proc p,
         LATERAL aclexplode(
             COALESCE(p.proacl, acldefault('f', p.proowner))
         ) a
    WHERE p.oid = target
      AND a.grantee = 0
      AND a.privilege_type = 'EXECUTE'
) THEN
    RAISE EXCEPTION
        'PUBLIC EXECUTE remains on helper: %',
        signature;
END IF;
   if has_function_privilege(client,target,'EXECUTE') then
    raise exception 'Remaining effective helper EXECUTE: % %',client,signature;
   end if;
  end loop;
 end loop;
end $$;
COMMIT;
