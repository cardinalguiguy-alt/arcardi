-- ============================================================
-- ARCARDI — schéma de base de données
-- À exécuter dans Supabase : Dashboard → SQL Editor → New query
-- Colle tout ce fichier, puis clique "Run".
-- ============================================================

-- 1) PROFILS -----------------------------------------------------
-- Un profil par utilisateur inscrit (créé automatiquement à l'inscription).
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null,
  avatar text not null default '🦊',
  total_points integer not null default 0,
  games_played integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Tout le monde connecté peut voir les profils (pseudos/avatars/scores publics).
create policy "profiles: lecture publique"
  on public.profiles for select
  to authenticated
  using (true);

-- Chacun ne peut modifier que SON propre profil.
create policy "profiles: modification de son propre profil"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Création automatique du profil quand un compte s'inscrit.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, username, avatar)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'avatar', '🦊')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- 2) SALONS (ROOMS) ----------------------------------------------
-- Un salon = une "soirée" avec un code à 6 caractères à partager.
create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  host_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'lobby', -- lobby | playing | finished
  current_game text,                    -- id du mini-jeu en cours, ex: 'quiz'
  created_at timestamptz not null default now()
);

alter table public.rooms enable row level security;

create policy "rooms: lecture publique (pour rejoindre via code)"
  on public.rooms for select
  to authenticated
  using (true);

create policy "rooms: création par un utilisateur connecté"
  on public.rooms for insert
  to authenticated
  with check (auth.uid() = host_id);

create policy "rooms: modification par l'hôte uniquement"
  on public.rooms for update
  to authenticated
  using (auth.uid() = host_id);


-- 3) JOUEURS DANS UN SALON -----------------------------------------
create table if not exists public.room_players (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  score integer not null default 0,
  joined_at timestamptz not null default now(),
  unique (room_id, profile_id)
);

alter table public.room_players enable row level security;

create policy "room_players: lecture publique du salon"
  on public.room_players for select
  to authenticated
  using (true);

create policy "room_players: un joueur peut s'ajouter lui-même"
  on public.room_players for insert
  to authenticated
  with check (auth.uid() = profile_id);

create policy "room_players: un joueur peut modifier sa propre ligne"
  on public.room_players for update
  to authenticated
  using (auth.uid() = profile_id);

create policy "room_players: un joueur peut quitter (supprimer sa ligne)"
  on public.room_players for delete
  to authenticated
  using (auth.uid() = profile_id);


-- 4) RÉSULTATS DE PARTIES (historique + records par jeu) -----------
create table if not exists public.game_results (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references public.rooms(id) on delete set null,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  game_id text not null,     -- 'wordle' | 'flags' | 'quiz' | 'reflex' | 'memory' | 'p4' | 'simon' | 'calc'
  points integer not null,
  created_at timestamptz not null default now()
);

alter table public.game_results enable row level security;

create policy "game_results: lecture publique"
  on public.game_results for select
  to authenticated
  using (true);

create policy "game_results: un joueur n'écrit que ses propres résultats"
  on public.game_results for insert
  to authenticated
  with check (auth.uid() = profile_id);


-- 5) ACTIVER REALTIME sur les tables utiles au live -----------------
alter publication supabase_realtime add table public.room_players;
alter publication supabase_realtime add table public.rooms;

-- ============================================================
-- Fin du script. Vérifie dans Database → Tables que les 4 tables
-- existent, et dans Database → Replication que room_players/rooms
-- apparaissent bien dans supabase_realtime.
-- ============================================================
