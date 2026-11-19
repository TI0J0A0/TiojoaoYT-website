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

-- ============================================================
-- Loja de tjcoins — prêmios reais e sorteios com bilhete
-- ============================================================

-- Itens da loja (o Tio cadastra pelo painel /painel)
create table if not exists store_items (
  id                bigserial primary key,
  tipo              text not null check (tipo in ('premio', 'sorteio')),
  nome              text not null,
  descricao         text not null default '',
  imagem            text,
  preco             integer not null check (preco > 0),         -- prêmio: preço; sorteio: preço do bilhete
  estoque           integer check (estoque >= 0),               -- prêmio: unidades (vazio = sem limite)
  limite_por_pessoa integer check (limite_por_pessoa > 0),      -- vazio = sem limite
  pede_entrega      text,                                       -- o que pedir para entregar (ex.: "Seu e-mail")
  encerra_em        timestamptz,                                -- sorteio: quando param as vendas
  ativo             boolean not null default true,
  ordem             integer not null default 0,
  vencedor_id       uuid references profiles(id) on delete set null,
  sorteado_em       timestamptz,
  criado_em         timestamptz not null default now()
);

-- Resgates (prêmios) e bilhetes (sorteios)
create table if not exists redemptions (
  id            bigserial primary key,
  profile_id    uuid not null references profiles(id) on delete cascade,
  item_id       bigint not null references store_items(id) on delete cascade,
  qtd           integer not null check (qtd > 0),
  custo         integer not null check (custo >= 0),
  -- pendente → entregue | recusado (prêmios e ganhadores de sorteio)
  -- participando → encerrado (bilhetes depois do sorteio)
  status        text not null check (status in ('pendente', 'entregue', 'recusado', 'participando', 'encerrado')),
  entrega       text,          -- dado que a pessoa informou para receber (só o painel vê)
  nota          text,          -- recado do Tio (a pessoa vê)
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz
);
create index if not exists redemptions_profile on redemptions (profile_id, criado_em desc);
create index if not exists redemptions_item on redemptions (item_id, status);

alter table store_items enable row level security;
alter table redemptions enable row level security;

-- Comprar: confere tudo e desconta os tjcoins numa operação só (sem risco de saldo negativo)
create or replace function store_redeem(p_profile uuid, p_item bigint, p_qtd integer, p_entrega text)
returns json language plpgsql security definer set search_path = public as $$
declare
  it store_items%rowtype;
  v_cost integer;
  v_ja integer;
  v_saldo integer;
  v_id bigint;
begin
  if p_qtd is null or p_qtd < 1 or p_qtd > 100 then raise exception 'qtd_invalida'; end if;
  select * into it from store_items where id = p_item for update;
  if not found or not it.ativo then raise exception 'item_indisponivel'; end if;
  if it.tipo = 'premio' and p_qtd <> 1 then raise exception 'qtd_invalida'; end if;
  if it.tipo = 'sorteio' and (it.sorteado_em is not null or (it.encerra_em is not null and it.encerra_em <= now())) then
    raise exception 'sorteio_encerrado';
  end if;
  if it.estoque is not null and it.estoque < p_qtd then raise exception 'sem_estoque'; end if;
  if it.pede_entrega is not null and coalesce(trim(p_entrega), '') = '' then raise exception 'falta_entrega'; end if;
  if it.limite_por_pessoa is not null then
    select coalesce(sum(qtd), 0) into v_ja from redemptions
      where profile_id = p_profile and item_id = p_item and status <> 'recusado' and custo > 0;
    if v_ja + p_qtd > it.limite_por_pessoa then raise exception 'limite_por_pessoa'; end if;
  end if;

  v_cost := it.preco * p_qtd;
  update profiles set points = points - v_cost where id = p_profile and points >= v_cost returning points into v_saldo;
  if not found then raise exception 'saldo_insuficiente'; end if;

  if it.estoque is not null then update store_items set estoque = estoque - p_qtd where id = p_item; end if;
  insert into redemptions (profile_id, item_id, qtd, custo, status, entrega)
    values (p_profile, p_item, p_qtd, v_cost, case when it.tipo = 'sorteio' then 'participando' else 'pendente' end,
            nullif(left(trim(coalesce(p_entrega, '')), 300), ''))
    returning id into v_id;
  insert into points_ledger (profile_id, delta, reason, ref) values (p_profile, -v_cost, 'loja', v_id::text);
  return json_build_object('id', v_id, 'saldo', v_saldo);
end $$;

-- Painel: marcar pedido como entregue, pendente ou recusado (recusar devolve os tjcoins e o estoque)
create or replace function store_set_status(p_admin uuid, p_id bigint, p_status text, p_nota text)
returns json language plpgsql security definer set search_path = public as $$
declare r redemptions%rowtype;
begin
  if not exists (select 1 from profiles where id = p_admin and is_admin) then raise exception 'sem_permissao'; end if;
  if p_status not in ('entregue', 'recusado', 'pendente') then raise exception 'status_invalido'; end if;
  select * into r from redemptions where id = p_id for update;
  if not found or r.status not in ('pendente', 'entregue') then raise exception 'pedido_invalido'; end if;
  if p_status = 'recusado' then
    if r.custo > 0 then
      update profiles set points = points + r.custo where id = r.profile_id;
      insert into points_ledger (profile_id, delta, reason, ref) values (r.profile_id, r.custo, 'loja_estorno', r.id::text);
    end if;
    update store_items set estoque = estoque + r.qtd where id = r.item_id and estoque is not null and r.custo > 0;
  end if;
  update redemptions set status = p_status, nota = nullif(left(trim(coalesce(p_nota, '')), 300), ''), atualizado_em = now()
    where id = p_id;
  return json_build_object('ok', true);
end $$;

-- Painel: sortear (cada bilhete é uma chance). O ganhador entra na fila de entrega.
create or replace function store_draw(p_admin uuid, p_item bigint)
returns json language plpgsql security definer set search_path = public as $$
declare
  it store_items%rowtype;
  v_total integer;
  v_pick integer;
  v_winner uuid;
  v_entrega text;
begin
  if not exists (select 1 from profiles where id = p_admin and is_admin) then raise exception 'sem_permissao'; end if;
  select * into it from store_items where id = p_item for update;
  if not found or it.tipo <> 'sorteio' then raise exception 'item_invalido'; end if;
  if it.sorteado_em is not null then raise exception 'ja_sorteado'; end if;
  select coalesce(sum(qtd), 0) into v_total from redemptions where item_id = p_item and status = 'participando';
  if v_total = 0 then raise exception 'sem_bilhetes'; end if;
  v_pick := 1 + floor(random() * v_total)::integer;
  select profile_id into v_winner from (
    select profile_id, sum(qtd) over (order by id) as acc
      from redemptions where item_id = p_item and status = 'participando'
  ) t where acc >= v_pick order by acc limit 1;
  select entrega into v_entrega from redemptions
    where item_id = p_item and profile_id = v_winner and entrega is not null order by id desc limit 1;
  update redemptions set status = 'encerrado', atualizado_em = now() where item_id = p_item and status = 'participando';
  update store_items set vencedor_id = v_winner, sorteado_em = now() where id = p_item;
  insert into redemptions (profile_id, item_id, qtd, custo, status, entrega) values (v_winner, p_item, 1, 0, 'pendente', v_entrega);
  return (select json_build_object('vencedor', display_name, 'bilhetes', v_total) from profiles where id = v_winner);
end $$;

revoke all on function store_redeem(uuid, bigint, integer, text) from public, anon, authenticated;
revoke all on function store_set_status(uuid, bigint, text, text) from public, anon, authenticated;
revoke all on function store_draw(uuid, bigint) from public, anon, authenticated;

-- Vitrine da loja: itens ativos (e sorteios dos últimos 30 dias), bilhetes vendidos e,
-- se a pessoa estiver logada, os pedidos/bilhetes dela
create or replace function store_catalog(p_profile uuid default null)
returns json language sql stable security definer set search_path = public as $$
  select json_build_object(
    'itens', coalesce((
      select json_agg(x order by x.ordem, x.id desc) from (
        select i.id, i.tipo, i.nome, i.descricao, i.imagem, i.preco, i.estoque, i.limite_por_pessoa,
               i.pede_entrega, i.encerra_em, i.sorteado_em, i.ordem,
               (select display_name from profiles where id = i.vencedor_id) as vencedor,
               (select coalesce(sum(qtd), 0) from redemptions r where r.item_id = i.id and r.custo > 0 and r.status <> 'recusado') as vendidos,
               case when p_profile is null then 0 else
                 (select coalesce(sum(qtd), 0) from redemptions r where r.item_id = i.id and r.profile_id = p_profile and r.custo > 0 and r.status <> 'recusado')
               end as meus
          from store_items i
         where i.ativo and (i.sorteado_em is null or i.sorteado_em > now() - interval '30 days')
      ) x), '[]'::json),
    'pedidos', case when p_profile is null then '[]'::json else coalesce((
      select json_agg(json_build_object('id', r.id, 'item', i.nome, 'tipo', i.tipo, 'qtd', r.qtd, 'custo', r.custo,
                                        'status', r.status, 'nota', r.nota, 'criado_em', r.criado_em) order by r.id desc)
        from (select * from redemptions where profile_id = p_profile order by id desc limit 30) r
        join store_items i on i.id = r.item_id), '[]'::json) end
  );
$$;

-- Painel: todos os itens e os pedidos (pendentes primeiro)
create or replace function store_admin(p_admin uuid)
returns json language plpgsql stable security definer set search_path = public as $$
begin
  if not exists (select 1 from profiles where id = p_admin and is_admin) then raise exception 'sem_permissao'; end if;
  return json_build_object(
    'itens', coalesce((
      select json_agg(json_build_object('id', i.id, 'tipo', i.tipo, 'nome', i.nome, 'descricao', i.descricao, 'imagem', i.imagem,
               'preco', i.preco, 'estoque', i.estoque, 'limite_por_pessoa', i.limite_por_pessoa, 'pede_entrega', i.pede_entrega,
               'encerra_em', i.encerra_em, 'ativo', i.ativo, 'ordem', i.ordem, 'sorteado_em', i.sorteado_em,
               'vencedor', (select display_name from profiles where id = i.vencedor_id),
               'vendidos', (select coalesce(sum(qtd), 0) from redemptions r where r.item_id = i.id and r.custo > 0 and r.status <> 'recusado'),
               'participantes', (select count(distinct profile_id) from redemptions r where r.item_id = i.id and r.custo > 0 and r.status <> 'recusado'))
             order by i.ativo desc, i.ordem, i.id desc)
        from store_items i), '[]'::json),
    'pedidos', coalesce((
      select json_agg(json_build_object('id', r.id, 'item', i.nome, 'tipo', i.tipo, 'qtd', r.qtd, 'custo', r.custo, 'status', r.status,
               'entrega', r.entrega, 'nota', r.nota, 'criado_em', r.criado_em, 'sorteio', r.custo = 0,
               'pessoa', p.display_name, 'avatar', p.avatar_url,
               'contas', (select json_agg(json_build_object('provider', a.provider, 'login', a.login)) from accounts a where a.profile_id = p.id))
             order by (r.status = 'pendente') desc, r.id desc)
        from (select * from redemptions where status in ('pendente', 'entregue', 'recusado') order by id desc limit 200) r
        join store_items i on i.id = r.item_id join profiles p on p.id = r.profile_id), '[]'::json)
  );
end $$;

revoke all on function store_catalog(uuid) from public, anon, authenticated;
revoke all on function store_admin(uuid) from public, anon, authenticated;

-- Para virar dono da loja: entre no site com a Twitch uma vez e rode só esta linha:
--   update profiles set is_admin = true where id = (select profile_id from accounts where provider = 'twitch' and login = 'tiojoaoyt');
