begin;
alter table public.rooms add column room_name text check(length(btrim(room_name)) between 1 and 80),
 add column best_of integer check(best_of in (3,5,7)),
 add column visibility text not null default 'private' check(visibility in ('public','private')),
 add column play_style text check(play_style in ('fun','tryhard')),
 add column allocation_mode text check(allocation_mode in ('random','tier','rank')),
 add constraint configured_room_fields check(best_of is null or
    (room_name is not null and play_style is not null and allocation_mode is not null));

create function public.create_series_room(p_name text,p_best_of integer,p_visibility text,p_style text,p_mode text)
returns public.rooms language plpgsql security definer set search_path=pg_catalog,public as $$
declare r public.rooms;
begin
 if p_name is null or p_best_of is null or p_visibility is null or p_style is null or p_mode is null then raise exception 'Configuration required'; end if;
 r:=public.create_open_room();
 update public.rooms set room_name=btrim(p_name),best_of=p_best_of,visibility=p_visibility,play_style=p_style,allocation_mode=p_mode where id=r.id returning * into r;
 return r;
end $$;
create function public.discover_series_rooms() returns table(room_id uuid,room_name text,best_of integer,play_style text,allocation_mode text,invite_code text)
language sql stable security definer set search_path=pg_catalog,public as $$
 select r.id,r.room_name,r.best_of,r.play_style,r.allocation_mode,r.invite_code from public.rooms r
 where r.visibility='public' and r.status='open' and auth.uid() is not null and not public.huy9_is_anonymous_session() order by r.created_at desc
$$;
revoke all on function public.create_series_room(text,integer,text,text,text) from public,anon,authenticated;
grant execute on function public.create_series_room(text,integer,text,text,text) to authenticated;
revoke all on function public.discover_series_rooms() from public,anon,authenticated;
grant execute on function public.discover_series_rooms() to authenticated;
commit;
