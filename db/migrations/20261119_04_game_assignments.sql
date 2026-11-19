begin;
-- Identifiers from the repository's HEROES_DATA; maintain via reviewed migrations.
create table public.series_hero_catalog(hero text primary key);
insert into public.series_hero_catalog values
 ('Tamyn'),
 ('Flowborn'),
 ('Flowborn Pháp Sư'),
 ('Dyadia'),
 ('Edras'),
 ('Goverra'),
 ('Heino'),
 ('Billow'),
 ('Bolt Baron'),
 ('Biron'),
 ('Dolia'),
 ('Charlotte'),
 ('Tachi'),
 ('Dirak'),
 ('Qi'),
 ('Erin'),
 ('Ming'),
 ('Bijan'),
 ('Bonnie'),
 ('Teeri'),
 ('Yue'),
 ('Yan'),
 ('Aya'),
 ('Aoi'),
 ('Iggy'),
 ('Bright'),
 ('Lorion'),
 ('Dextra'),
 ('Sinestrea'),
 ('Thorne'),
 ('Allain'),
 ('Zata'),
 ('Rouie'),
 ('Laville'),
 ('Paine'),
 ('Ata'),
 ('Keera'),
 ('Ishar'),
 ('Eland''orr'),
 ('Krizzix'),
 ('Volkath'),
 ('Celica'),
 ('Zip'),
 ('Enzo'),
 ('Yena'),
 ('Errol'),
 ('Capheny'),
 ('Hayate'),
 ('D''Arcy'),
 ('Veres'),
 ('Florentino'),
 ('Sephera'),
 ('Quillen'),
 ('Wiro'),
 ('Richter'),
 ('Elsu'),
 ('Y''bneth'),
 ('Amily'),
 ('Annette'),
 ('Baldum'),
 ('Roxie'),
 ('Marja'),
 ('Rourke'),
 ('Arum'),
 ('Wisp'),
 ('The Flash'),
 ('Max'),
 ('Liliana'),
 ('Tulen'),
 ('Omen'),
 ('Lindis'),
 ('TeeMee'),
 ('Moren'),
 ('Kil''Groth'),
 ('Xeniel'),
 ('Wonder Woman'),
 ('Superman'),
 ('Tel''Annas'),
 ('Astrid'),
 ('Ryoma'),
 ('Stuart'),
 ('Arduin'),
 ('Zill'),
 ('Murad'),
 ('Ignis'),
 ('Zuka'),
 ('Airi'),
 ('Kaine'),
 ('Lauriel'),
 ('Raz'),
 ('Skud'),
 ('Preyta'),
 ('Ilumia'),
 ('Slimz'),
 ('Arthur'),
 ('Kriknak'),
 ('Ngộ Không'),
 ('Maloch'),
 ('Helen'),
 ('Jinna'),
 ('Cresht'),
 ('Natalya'),
 ('Lumburr'),
 ('Fennik'),
 ('Aleister'),
 ('Grakk'),
 ('Nakroth'),
 ('Taara'),
 ('Toro'),
 ('Yorn'),
 ('Gildur'),
 ('Alice'),
 ('Azzen''Ka'),
 ('Ormarr'),
 ('Butterfly'),
 ('Violet'),
 ('Chaugnar'),
 ('Điêu Thuyền'),
 ('Zephys'),
 ('Kahlii'),
 ('Omega'),
 ('Triệu Vân'),
 ('Mganga'),
 ('Krixi'),
 ('Mina'),
 ('Lữ Bố'),
 ('Veera'),
 ('Thane'),
 ('Valhein');
alter table public.series_hero_catalog enable row level security;
revoke all on public.series_hero_catalog from public,anon,authenticated;
grant select on public.series_hero_catalog to authenticated;
create policy read_heroes on public.series_hero_catalog for select to authenticated using(true);
create function public.assign_series_game(p_room_id uuid,p_version bigint,p_game_id uuid,p_mode text,p_players jsonb default null)
returns public.series_games language plpgsql security definer set search_path=pg_catalog,public as $$
declare g public.series_games; payload jsonb; lanes text[]:=array['top','jungle','mid','adc','support'];
begin
 perform public.series_host(p_room_id,p_version);
 select games.* into strict g from public.series_games games join public.room_series s on s.id=games.series_id
 where games.id=p_game_id and s.room_id=p_room_id and games.ended_at is null;
 if p_mode='automatic' then
  if g.auto_generated then raise exception 'Already generated'; end if;
  with players as (select member_id,team,row_number() over(partition by team order by random()) pos from public.series_players where series_id=g.series_id),
  heroes as (select team,hero,row_number() over(partition by team order by random()) pos from public.series_hero_catalog cross join (values ('a'),('b')) teams(team))
  select jsonb_agg(jsonb_build_object('member_id',member_id,'lane',lanes[players.pos::integer],'hero',hero)) into payload from players join heroes using(team,pos);
 elsif p_mode='manual' then
  if jsonb_typeof(p_players) is distinct from 'array' then raise exception 'Assignment array required'; end if;
  select coalesce(jsonb_agg(to_jsonb(x)),'[]') into payload from jsonb_to_recordset(p_players) x(member_id uuid,hero text,lane text);
 else raise exception 'Invalid assignment mode';
 end if;
 if exists(select from jsonb_to_recordset(payload) x(member_id uuid,hero text,lane text)
 left join public.series_players p on p.series_id=g.series_id and p.member_id=x.member_id
 where p.member_id is null or (x.lane is not null and not x.lane=any(lanes))
 or (x.hero is not null and not exists(select from public.series_hero_catalog h where h.hero=x.hero)))
 or exists(select from jsonb_to_recordset(payload) x(member_id uuid) group by member_id having count(*)>1)
 or exists(select from jsonb_to_recordset(payload) x(member_id uuid,hero text,lane text)
 join public.series_players p on p.series_id=g.series_id and p.member_id=x.member_id group by p.team
 having count(hero)<>count(distinct hero) or count(lane)<>count(distinct lane))
 then raise exception 'Invalid or duplicate assignment'; end if;
 update public.series_games set assignments=payload,assignment_mode=p_mode,auto_generated=auto_generated or p_mode='automatic' where id=g.id returning * into g;
 update public.rooms set version=version+1 where id=p_room_id;
 return g;
end $$;
revoke all on function public.assign_series_game(uuid,bigint,uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.assign_series_game(uuid,bigint,uuid,text,jsonb) to authenticated;
commit;
