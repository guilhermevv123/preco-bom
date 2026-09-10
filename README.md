# Preço Bom

Landing page do grupo de ofertas **Preço Bom** (achadinhos do Mercado Livre no WhatsApp) com painel de administração.

HTML, CSS e JavaScript puros, sem etapa de build: dá para abrir o `index.html` com dois cliques e hospedar em qualquer lugar (GitHub Pages, Netlify, Vercel).

## Estrutura

```
index.html              página
css/
  fonts.css             fontes (Bricolage Grotesque e Manrope, servidas daqui mesmo)
  style.css             visual da página
js/
  config.js             endereço e chave pública do Supabase
  dados.js              ofertas e textos usados quando o banco não está ligado
  app.js                monta o carrossel, aplica a configuração e conta os cliques
assets/
  fonts/                arquivos .woff2
  img/produtos/         fotos de exemplo (WebP)
  img/favicon.svg
admin/                  painel
  index.html
  admin.css
  js/                   cliente, login, ofertas, configurações, métricas
supabase/migrations/    tabelas, regras de acesso e conteúdo inicial
design-original/        export do Claude Design, sem alterações
```

## Como funciona

Sem banco configurado, o site mostra as ofertas de `js/dados.js`.

Com o Supabase ligado, o site lê as ofertas ativas e a configuração do banco, e cada toque nos botões do grupo vira um registro em `cliques`. O painel em `/admin/` permite:

- **Ofertas:** criar, editar, ocultar, reordenar e excluir. A foto é reduzida no navegador antes do envio, e o selo de desconto é calculado a partir dos dois preços.
- **Configurações:** link do grupo (vale para os três botões), pessoas no grupo, ofertas por dia e desconto máximo.
- **Métricas:** cliques de hoje, dos últimos 7 e 30 dias, e o total; separados por botão e por dia.

## Ligar o banco (Supabase)

1. Crie um projeto no Supabase e rode a migration:
   ```bash
   supabase link --project-ref SEU_REF
   supabase db push
   ```
2. Cadastre quem pode entrar no painel:
   ```sql
   insert into public.admins (email) values ('seu-email@exemplo.com');
   ```
3. Em `js/config.js`, preencha `supabaseUrl` e `supabaseAnonKey` (Project Settings → API). A chave anon é pública; quem protege os dados são as regras de acesso (RLS) da migration.
4. Em Authentication → URL Configuration, adicione o endereço do painel (ex.: `https://SEU_USUARIO.github.io/preco-bom/admin/`) em **Redirect URLs**, para os links de confirmação e de nova senha funcionarem.

No primeiro acesso, a pessoa entra em **Primeiro acesso** no painel e cria a própria senha com o e-mail cadastrado em `admins`.

## Publicar no GitHub Pages

Settings → Pages → Deploy from a branch → `main` / `(root)`. O site fica em `https://SEU_USUARIO.github.io/preco-bom/` e o painel em `/admin/`.

## Rodar localmente

Abrir o `index.html` direto já funciona. Para testar o painel com login, sirva a pasta por HTTP:

```bash
python3 -m http.server 8765
```
