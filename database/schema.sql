-- Mural FEB - executar no SQL Editor do Supabase.
-- O perfil acompanha auth.users. Não armazenamos senhas nesta tabela.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text not null,
  sobrenome text not null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table if not exists public.anuncios (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references public.profiles(id) on delete cascade,
  titulo varchar(100) not null,
  descricao varchar(2000) not null,
  categoria text not null check (categoria in ('servico','aluguel','classificados')),
  tipo_publicacao text not null check (tipo_publicacao in ('oferta','procura')),
  preco numeric(10,2) check (preco is null or preco >= 0),
  whatsapp_contato varchar(25),
  telefone_contato varchar(25),
  email_contato varchar(254),
  status text not null default 'ativo'
    check (status in ('ativo','pendente_moderacao','removido','encerrado')),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table if not exists public.denuncias (
  id uuid primary key default gen_random_uuid(),
  anuncio_id uuid not null references public.anuncios(id) on delete cascade,
  usuario_id uuid not null references public.profiles(id) on delete cascade,
  motivo text not null check (motivo in (
    'falso_enganoso','conteudo_inadequado','contato_suspeito','item_proibido','spam','outro'
  )),
  descricao varchar(1000),
  status text not null default 'recebida'
    check (status in ('recebida','em_analise','procedente','improcedente')),
  criado_em timestamptz not null default now(),
  constraint denuncias_unica_por_usuario unique (anuncio_id, usuario_id)
);

create index if not exists idx_anuncios_feed
  on public.anuncios (status, criado_em desc);
create index if not exists idx_anuncios_categoria
  on public.anuncios (categoria, status, criado_em desc);
create index if not exists idx_anuncios_usuario
  on public.anuncios (usuario_id, criado_em desc);
create index if not exists idx_denuncias_anuncio
  on public.denuncias (anuncio_id);

-- Perfil criado automaticamente quando uma conta é criada no Supabase Auth.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, nome, sobrenome)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'nome', ''),
    coalesce(new.raw_user_meta_data ->> 'sobrenome', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- Denúncia atômica: evita duplicidade e oculta o anúncio ao atingir 10 denunciantes.
create or replace function public.registrar_denuncia(
  p_anuncio_id uuid,
  p_usuario_id uuid,
  p_motivo text,
  p_descricao text default null
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
  v_owner uuid;
  v_status text;
begin
  select usuario_id, status into v_owner, v_status
  from public.anuncios
  where id = p_anuncio_id
  for update;

  if not found then
    raise exception 'Anúncio não encontrado';
  end if;
  if v_owner = p_usuario_id then
    raise exception 'Não é permitido denunciar o próprio anúncio';
  end if;
  if v_status <> 'ativo' then
    raise exception 'Anúncio não está ativo';
  end if;

  insert into public.denuncias (anuncio_id, usuario_id, motivo, descricao)
  values (p_anuncio_id, p_usuario_id, p_motivo, nullif(trim(p_descricao), ''));

  select count(*) into v_count
  from public.denuncias
  where anuncio_id = p_anuncio_id;

  if v_count >= 10 then
    update public.anuncios
    set status = 'pendente_moderacao', atualizado_em = now()
    where id = p_anuncio_id;
  end if;

  return v_count;
end;
$$;

-- A função é chamada apenas pelo backend com service_role.
revoke all on function public.registrar_denuncia(uuid, uuid, text, text) from public, anon, authenticated;
grant execute on function public.registrar_denuncia(uuid, uuid, text, text) to service_role;

-- A API FastAPI utiliza a service_role exclusivamente no servidor.
-- Bloqueamos acesso direto às tabelas via chaves públicas.
alter table public.profiles enable row level security;
alter table public.anuncios enable row level security;
alter table public.denuncias enable row level security;

drop policy if exists "bloquear acesso direto profiles" on public.profiles;
drop policy if exists "bloquear acesso direto anuncios" on public.anuncios;
drop policy if exists "bloquear acesso direto denuncias" on public.denuncias;

create policy "bloquear acesso direto profiles" on public.profiles
  for all to anon, authenticated using (false) with check (false);
create policy "bloquear acesso direto anuncios" on public.anuncios
  for all to anon, authenticated using (false) with check (false);
create policy "bloquear acesso direto denuncias" on public.denuncias
  for all to anon, authenticated using (false) with check (false);
