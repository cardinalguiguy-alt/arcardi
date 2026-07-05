-- ============================================================
-- ARCARDI — mise à jour 001
-- À exécuter dans Supabase : SQL Editor → New query → Run
-- (à faire APRÈS le schema.sql initial, déjà exécuté)
-- ============================================================

-- 1) Ajout de points ATOMIQUE (évite les scores écrasés quand
--    plusieurs joueurs répondent en même temps).
create or replace function public.add_points(p_room uuid, p_delta int)
returns void
language sql
security definer set search_path = public
as $$
  update public.room_players
  set score = score + p_delta
  where room_id = p_room and profile_id = auth.uid();
$$;

grant execute on function public.add_points(uuid, int) to authenticated;

-- 2) Quand un résultat de partie est enregistré, on met à jour
--    automatiquement le total et le compteur de parties du profil.
create or replace function public.apply_game_result()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  update public.profiles
  set total_points = total_points + new.points,
      games_played = games_played + 1
  where id = new.profile_id;
  return new;
end;
$$;

drop trigger if exists on_game_result on public.game_results;
create trigger on_game_result
  after insert on public.game_results
  for each row execute procedure public.apply_game_result();

-- ============================================================
-- Fin. "Success. No rows returned" = tout est bon.
-- ============================================================
