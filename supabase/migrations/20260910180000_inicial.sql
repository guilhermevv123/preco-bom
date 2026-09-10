-- Preço Bom: configuração do site, ofertas da vitrine, cliques nos botões e administradores.

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
  grupo_link text not null check (grupo_link ~ '^https://chat\.whatsapp\.com/\S+$'),
  pessoas_no_grupo int not null default 0 check (pessoas_no_grupo >= 0),
  ofertas_por_dia text not null default '30+' check (char_length(ofertas_por_dia) between 1 and 10),
  desconto_maximo text not null default '65%' check (char_length(desconto_maximo) between 1 and 10),
  atualizado_em timestamptz not null default now()
);

create table public.ofertas (
  id uuid primary key default gen_random_uuid(),
  titulo text not null check (char_length(titulo) between 1 and 80),
  imagem_url text not null,
  preco_de numeric(10, 2) not null check (preco_de > 0),
  preco_por numeric(10, 2) not null check (preco_por > 0 and preco_por < preco_de),
  ordem int not null default 0,
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

create table public.cliques (
  id bigint generated always as identity primary key,
  origem text not null check (origem in ('topo', 'final', 'fixo')),
  criado_em timestamptz not null default now()
);
create index cliques_criado_em_idx on public.cliques (criado_em);

create or replace function public.cliques_por_dia(dias int default 14)
returns table (dia date, total bigint)
language sql
stable
security invoker
set search_path = public
as $$
  select (criado_em at time zone 'America/Sao_Paulo')::date as dia, count(*) as total
  from public.cliques
  where criado_em >= ((now() at time zone 'America/Sao_Paulo')::date - (dias - 1)) at time zone 'America/Sao_Paulo'
  group by 1
  order by 1;
$$;

-- Regras de acesso: o site lê config e ofertas ativas e registra cliques; só administradores alteram.
alter table public.admins enable row level security;
alter table public.config enable row level security;
alter table public.ofertas enable row level security;
alter table public.cliques enable row level security;

create policy "admin vê admins" on public.admins for select to authenticated using (public.is_admin());

create policy "todos leem a config" on public.config for select to anon, authenticated using (true);
create policy "admin altera a config" on public.config for update to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "todos leem ofertas ativas" on public.ofertas for select to anon, authenticated using (ativo or public.is_admin());
create policy "admin cria ofertas" on public.ofertas for insert to authenticated with check (public.is_admin());
create policy "admin altera ofertas" on public.ofertas for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin apaga ofertas" on public.ofertas for delete to authenticated using (public.is_admin());

create policy "todos registram cliques" on public.cliques for insert to anon, authenticated with check (true);
create policy "admin vê cliques" on public.cliques for select to authenticated using (public.is_admin());

grant select on public.config, public.ofertas to anon, authenticated;
grant update on public.config to authenticated;
grant insert, update, delete on public.ofertas to authenticated;
grant insert on public.cliques to anon, authenticated;
grant select on public.cliques, public.admins to authenticated;
revoke execute on function public.cliques_por_dia(int) from public, anon;
grant execute on function public.cliques_por_dia(int) to authenticated;
grant execute on function public.is_admin() to anon, authenticated;

-- Fotos das ofertas: leitura pública, envio só por administradores.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('produtos', 'produtos', true, 2097152, array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do nothing;

create policy "admin envia fotos" on storage.objects for insert to authenticated
  with check (bucket_id = 'produtos' and public.is_admin());
create policy "admin troca fotos" on storage.objects for update to authenticated
  using (bucket_id = 'produtos' and public.is_admin());
create policy "admin apaga fotos" on storage.objects for delete to authenticated
  using (bucket_id = 'produtos' and public.is_admin());

-- Conteúdo inicial, igual ao do design.
insert into public.config (id, grupo_link, pessoas_no_grupo, ofertas_por_dia, desconto_maximo)
values (1, 'https://chat.whatsapp.com/CcPBUDarapQ4q3J2u6rAgL?s=cl&p=i&mlu=4&ilr=4', 5988, '30+', '65%');

insert into public.ofertas (titulo, imagem_url, preco_de, preco_por, ordem) values
  ('Smart TV TCL 50" 4K Google TV', 'assets/img/produtos/tv.webp', 2299, 873, 0),
  ('Geladeira Electrolux 375L Frost Free', 'assets/img/produtos/geladeira.webp', 3799, 1519, 1),
  ('Notebook ASUS 8GB / SSD 256GB', 'assets/img/produtos/notebook.webp', 2499, 974, 2),
  ('Air Fryer Mondial Family 5L', 'assets/img/produtos/airfryer.webp', 499, 184, 3),
  ('Fone Bluetooth TWS', 'assets/img/produtos/fone.webp', 249, 87, 4),
  ('Robô Aspirador Roborock Q7 Max', 'assets/img/produtos/robo.webp', 2599, 961, 5);
