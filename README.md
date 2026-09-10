# Preço Bom

Landing page do grupo de ofertas **Preço Bom** (achadinhos do Mercado Livre no WhatsApp) com painel de administração.

HTML, CSS e JavaScript puros, sem etapa de build: dá para abrir o `index.html` com dois cliques e hospedar em qualquer lugar (GitHub Pages, Netlify, Vercel).

## O site

- Barra fixa com botão **Entrar**, herói com dois celulares mostrando ofertas e o logo.
- Contadores animados (pessoas no grupo, ofertas por dia e, se preenchida, economia gerada) e três cards de destaque.
- **Ofertas recentes:** cada oferta cadastrada vira um "print" de mensagem do WhatsApp (foto, preço de/por, selo de desconto, cupom e link), num carrossel com passagem automática.
- **Depoimentos:** mensagens de quem comprou, como texto no estilo do WhatsApp ou como foto do print.
- FAQ em sanfona, chamada final e rodapé.
- Todos os botões de entrar abrem uma janela com o aviso de vagas, o canal (opcional) e a lista de grupos — quando um grupo lota, é só cadastrar o próximo.

## Estrutura

```
index.html              página
css/
  fonts.css             fontes (Bricolage Grotesque e Manrope, servidas daqui mesmo)
  style.css             visual da página
js/
  config.js             endereço e chave pública do Supabase
  dados.js              conteúdo usado quando o banco não está ligado
  app.js                monta prints, carrosséis, contadores, janela dos grupos e cliques
assets/
  fonts/                arquivos .woff2
  img/produtos/         fotos de exemplo (WebP)
  img/favicon.svg
admin/                  painel
  index.html
  admin.css
  js/                   cliente, login, lista genérica (crud), ofertas, grupos, depoimentos, configurações, métricas
supabase/migrations/    tabelas, regras de acesso e conteúdo inicial
design-original/        export do Claude Design, sem alterações
```

## Como funciona

Sem banco configurado, o site mostra o conteúdo de `js/dados.js` (os depoimentos de exemplo aparecem com o selo "exemplo").

Com o Supabase ligado, o site lê tudo do banco e cada clique nos links dos grupos vira um registro em `cliques`. O painel em `/admin/` permite:

- **Ofertas:** criar, editar, ocultar, reordenar e excluir. A foto é reduzida no navegador antes do envio; o selo de desconto é calculado a partir dos dois preços. Cupom e link são opcionais (com link, o print vira clicável).
- **Grupos:** nome e link de convite de cada grupo do WhatsApp; os ativos aparecem na janela de entrada.
- **Depoimentos:** nome + mensagem, ou a foto do print. Sem depoimentos, a seção fica escondida.
- **Configurações:** pessoas no grupo, economia gerada, ofertas por dia, desconto máximo, vagas liberadas (aviso na janela), canal do WhatsApp, Telegram e ID do Pixel da Meta.
- **Métricas:** entradas de hoje, dos últimos 7 e 30 dias e o total; por botão e por dia.

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
