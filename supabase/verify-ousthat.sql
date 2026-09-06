-- ARCARDI — audit Supabase en lecture seule pour « Où's that ? ».
-- Dashboard Supabase → SQL Editor → New query → Run.
-- Ce script ne crée, ne modifie et ne supprime rien.

with checks(label, ok, expected_fix) as (
  values
    (
      'rooms.game_state',
      exists (
        select 1 from information_schema.columns
        where table_schema = 'public' and table_name = 'rooms' and column_name = 'game_state' and data_type = 'jsonb'
      ),
      'upgrade-002.sql'
    ),
    (
      'rooms.launch_at',
      exists (
        select 1 from information_schema.columns
        where table_schema = 'public' and table_name = 'rooms' and column_name = 'launch_at'
      ),
      'upgrade-003.sql'
    ),
    (
      'rooms.stage_launch_at',
      exists (
        select 1 from information_schema.columns
        where table_schema = 'public' and table_name = 'rooms' and column_name = 'stage_launch_at'
      ),
      'upgrade-004.sql'
    ),
    (
      'room_players.wins',
      exists (
        select 1 from information_schema.columns
        where table_schema = 'public' and table_name = 'room_players' and column_name = 'wins'
      ),
      'upgrade-003.sql'
    ),
    (
      'room_players.losses',
      exists (
        select 1 from information_schema.columns
        where table_schema = 'public' and table_name = 'room_players' and column_name = 'losses'
      ),
      'upgrade-003.sql'
    ),
    (
      'fonction add_game_result(uuid, boolean)',
      to_regprocedure('public.add_game_result(uuid,boolean)') is not null,
      'upgrade-003.sql'
    ),
    (
      'fonction leave_room(uuid)',
      to_regprocedure('public.leave_room(uuid)') is not null,
      'upgrade-003.sql'
    ),
    (
      'fonction nominate_host(uuid, uuid)',
      to_regprocedure('public.nominate_host(uuid,uuid)') is not null,
      'upgrade-003.sql'
    ),
    (
      'Realtime rooms',
      exists (
        select 1 from pg_publication_tables
        where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'rooms'
      ),
      'schema.sql, section Realtime'
    ),
    (
      'Realtime room_players',
      exists (
        select 1 from pg_publication_tables
        where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'room_players'
      ),
      'schema.sql, section Realtime'
    )
)
select label, ok, case when ok then 'prêt' else expected_fix end as action
from checks
order by ok, label;
