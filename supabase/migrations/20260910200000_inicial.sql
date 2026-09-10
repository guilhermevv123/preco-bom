-- Preço Bom: configuração do site, grupos do WhatsApp, ofertas, cliques e administradores.

create table public.admins (
  email text primary key check (email = lower(email))
);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.admins where email = lower(auth.jwt() ->> 'email'));
$$;

create table public.config (
  id int primary key default 1 check (id = 1),
  pessoas_no_grupo int not null default 0 check (pessoas_no_grupo >= 0),
  economia_gerada numeric(14, 2) not null default 0 check (economia_gerada >= 0),
  ofertas_por_dia text not null default '30+' check (char_length(ofertas_por_dia) between 1 and 10),
  desconto_maximo text not null default '65%' check (char_length(desconto_maximo) between 1 and 10),
  vagas_liberadas int not null default 0 check (vagas_liberadas between 0 and 999),
  canal_link text check (canal_link is null or canal_link ~ '^https://(www\.)?whatsapp\.com/channel/\S+$'),
  telegram_link text check (telegram_link is null or telegram_link ~ '^https://t\.me/\S+$'),
  pixel_id text check (pixel_id is null or pixel_id ~ '^[0-9]{6,20}$'),
  capi_webhook text check (capi_webhook is null or capi_webhook ~ '^https://\S+$'),
  atualizado_em timestamptz not null default now()
);

create table public.grupos (
  id uuid primary key default gen_random_uuid(),
  nome text not null check (char_length(nome) between 1 and 40),
  link text not null check (link ~ '^https://chat\.whatsapp\.com/\S+$'),
  ordem int not null default 0,
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

create table public.ofertas (
  id uuid primary key default gen_random_uuid(),
  titulo text not null check (char_length(titulo) between 1 and 80),
  imagem_url text not null,
  preco_de numeric(10, 2) not null check (preco_de > 0),
  preco_por numeric(10, 2) not null check (preco_por > 0 and preco_por < preco_de),
  cupom text check (cupom is null or char_length(cupom) between 1 and 30),
  link text check (link is null or link ~ '^https://\S+$'),
  ordem int not null default 0,
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

create table public.cliques (
  id bigint generated always as identity primary key,
  origem text not null check (origem in ('nav', 'topo', 'final', 'modal-grupo', 'modal-canal', 'telegram', 'oferta')),
  criado_em timestamptz not null default now()
);
create index cliques_criado_em_idx on public.cliques (criado_em);

create or replace function public.cliques_por_dia(dias int default 14, origens text[] default null)
returns table (dia date, total bigint)
language sql
stable
security invoker
set search_path = public
as $$
  select (criado_em at time zone 'America/Sao_Paulo')::date as dia, count(*) as total
  from public.cliques
  where criado_em >= ((now() at time zone 'America/Sao_Paulo')::date - (dias - 1)) at time zone 'America/Sao_Paulo'
    and (origens is null or origem = any (origens))
  group by 1
  order by 1;
$$;

-- Regras de acesso: o site lê o que está ativo e registra cliques; só administradores alteram.
alter table public.admins enable row level security;
alter table public.config enable row level security;
alter table public.grupos enable row level security;
alter table public.ofertas enable row level security;
alter table public.cliques enable row level security;

create policy "admin vê admins" on public.admins for select to authenticated using (public.is_admin());

create policy "todos leem a config" on public.config for select to anon, authenticated using (true);
create policy "admin altera a config" on public.config for update to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "todos leem grupos ativos" on public.grupos for select to anon, authenticated using (ativo or public.is_admin());
create policy "admin cria grupos" on public.grupos for insert to authenticated with check (public.is_admin());
create policy "admin altera grupos" on public.grupos for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin apaga grupos" on public.grupos for delete to authenticated using (public.is_admin());

create policy "todos leem ofertas ativas" on public.ofertas for select to anon, authenticated using (ativo or public.is_admin());
create policy "admin cria ofertas" on public.ofertas for insert to authenticated with check (public.is_admin());
create policy "admin altera ofertas" on public.ofertas for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin apaga ofertas" on public.ofertas for delete to authenticated using (public.is_admin());

create policy "todos registram cliques" on public.cliques for insert to anon, authenticated with check (true);
create policy "admin vê cliques" on public.cliques for select to authenticated using (public.is_admin());

grant select on public.config, public.grupos, public.ofertas to anon, authenticated;
grant update on public.config to authenticated;
grant insert, update, delete on public.grupos, public.ofertas to authenticated;
grant insert on public.cliques to anon, authenticated;
grant select on public.cliques, public.admins to authenticated;
revoke execute on function public.cliques_por_dia(int, text[]) from public, anon;
grant execute on function public.cliques_por_dia(int, text[]) to authenticated;
grant execute on function public.is_admin() to anon, authenticated;

-- Fotos de produto: leitura pública, envio só por administradores.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('imagens', 'imagens', true, 3145728, array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do nothing;

create policy "admin envia imagens" on storage.objects for insert to authenticated
  with check (bucket_id = 'imagens' and public.is_admin());
create policy "admin troca imagens" on storage.objects for update to authenticated
  using (bucket_id = 'imagens' and public.is_admin());
create policy "admin apaga imagens" on storage.objects for delete to authenticated
  using (bucket_id = 'imagens' and public.is_admin());

-- Conteúdo inicial, igual ao do design.
insert into public.config (id, pessoas_no_grupo, ofertas_por_dia, desconto_maximo, vagas_liberadas, pixel_id, capi_webhook)
values (1, 5988, '30+', '65%', 12, '1010782158687635', 'https://meuauxiliar-n8n.nyrnfd.easypanel.host/webhook/preco-bom-meta');

insert into public.grupos (nome, link, ordem)
values ('Preço Bom · Grupo 34', 'https://chat.whatsapp.com/CcPBUDarapQ4q3J2u6rAgL?s=cl&p=i&mlu=4&ilr=4', 0);

insert into public.ofertas (titulo, imagem_url, preco_de, preco_por, ordem) values
  ('Smart TV TCL 50" 4K Google TV', 'assets/img/produtos/tv.webp', 2299, 873, 0),
  ('Geladeira Electrolux 375L Frost Free', 'assets/img/produtos/geladeira.webp', 3799, 1519, 1),
  ('Notebook ASUS 8GB / SSD 256GB', 'assets/img/produtos/notebook.webp', 2499, 974, 2),
  ('Air Fryer Mondial Family 5L', 'assets/img/produtos/airfryer.webp', 499, 184, 3),
  ('Fone Bluetooth TWS', 'assets/img/produtos/fone.webp', 249, 87, 4),
  ('Robô Aspirador Roborock Q7 Max', 'assets/img/produtos/robo.webp', 2599, 961, 5);
