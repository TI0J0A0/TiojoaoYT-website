-- ============================================================
-- Sistema de pontos (tjcoins) do TiojoaoYT — etapa 1
-- Cole este arquivo inteiro no Supabase: SQL Editor → New query → Run.
-- Pode rodar de novo sem problema (é idempotente).
-- Só o servidor do site (chave secreta) acessa estas tabelas.
-- ============================================================

create extension if not exists pgcrypto;

-- Perfis: uma carteira por pessoa (pode ter Twitch e Kick ligadas)
create table if not exists profiles (
  id            uuid primary key default gen_random_uuid(),
  display_name  text not null,
  avatar_url    text,
  points        integer not null default 0 check (points >= 0),
  last_award_at timestamptz,
  is_admin      boolean not null default false,
  created_at    timestamptz not null default now()
);

-- Contas das plataformas ligadas a cada perfil
create table if not exists accounts (
  provider          text not null check (provider in ('twitch', 'kick')),
  provider_user_id  text not null,
  login             text not null,
  profile_id        uuid not null references profiles(id) on delete cascade,
  created_at        timestamptz not null default now(),
  primary key (provider, provider_user_id)
);
create unique index if not exists accounts_one_per_provider on accounts (profile_id, provider);
create index if not exists accounts_login on accounts (provider, login);

-- Histórico de tudo que entra e sai da carteira
create table if not exists points_ledger (
  id          bigserial primary key,
  profile_id  uuid not null references profiles(id) on delete cascade,
  delta       integer not null,
  reason      text not null,
  ref         text,
  created_at  timestamptz not null default now()
);
create index if not exists points_ledger_profile on points_ledger (profile_id, created_at desc);

-- Saldos importados do StreamElements (resgatados no 1º login com a Twitch)
create table if not exists se_import (
  login        text primary key,
  points       integer not null check (points >= 0),
  claimed_by   uuid references profiles(id) on delete set null,
  claimed_at   timestamptz,
  imported_at  timestamptz not null default now()
);

-- Ninguém de fora acessa: sem políticas = só a chave secreta do servidor
alter table profiles      enable row level security;
alter table accounts      enable row level security;
alter table points_ledger enable row level security;
alter table se_import     enable row level security;

-- Login/cadastro/vínculo em uma operação só
create or replace function login_with(
  p_provider text, p_uid text, p_login text, p_name text, p_avatar text, p_link uuid default null
) returns json
language plpgsql security definer set search_path = public as $$
declare
  v_pid uuid;
  v_imported integer := 0;
begin
  select profile_id into v_pid from accounts where provider = p_provider and provider_user_id = p_uid;

  if v_pid is not null and p_link is not null and v_pid <> p_link then
    raise exception 'conta_ja_vinculada';
  end if;

  if v_pid is null then
    if p_link is not null then
      if not exists (select 1 from profiles where id = p_link) then raise exception 'perfil_inexistente'; end if;
      if exists (select 1 from accounts where profile_id = p_link and provider = p_provider) then raise exception 'plataforma_ja_vinculada'; end if;
      v_pid := p_link;
    else
      insert into profiles (display_name, avatar_url) values (p_name, p_avatar) returning id into v_pid;
    end if;
    insert into accounts (provider, provider_user_id, login, profile_id) values (p_provider, p_uid, lower(p_login), v_pid);
  else
    update accounts set login = lower(p_login) where provider = p_provider and provider_user_id = p_uid;
    update profiles set avatar_url = coalesce(p_avatar, avatar_url) where id = v_pid;
  end if;

  -- tjcoins do StreamElements (só existem para logins da Twitch)
  if p_provider = 'twitch' then
    update se_import set claimed_by = v_pid, claimed_at = now()
      where login = lower(p_login) and claimed_by is null
      returning points into v_imported;
    if coalesce(v_imported, 0) > 0 then
      update profiles set points = points + v_imported where id = v_pid;
      insert into points_ledger (profile_id, delta, reason, ref) values (v_pid, v_imported, 'import_streamelements', lower(p_login));
    end if;
  end if;

  return (select json_build_object('id', id, 'display_name', display_name, 'avatar_url', avatar_url,
                                   'points', points, 'imported', coalesce(v_imported, 0))
          from profiles where id = v_pid);
end $$;

revoke all on function login_with(text, text, text, text, text, uuid) from public, anon, authenticated;
