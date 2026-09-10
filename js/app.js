(function () {
  var padrao = window.PB_PADRAO;
  var cfg = window.PB_CONFIG || {};
  var temBanco = Boolean(cfg.supabaseUrl && cfg.supabaseAnonKey);
  var LINK_GRUPO = /^https:\/\/chat\.whatsapp\.com\/\S+$/;

  function reais(n) {
    n = Number(n);
    return "R$ " + n.toLocaleString("pt-BR", { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 });
  }

  function el(tag, classe, texto) {
    var e = document.createElement(tag);
    if (classe) e.className = classe;
    if (texto != null) e.textContent = texto;
    return e;
  }

  function texto(seletor, valor) {
    document.querySelectorAll(seletor).forEach(function (e) { e.textContent = valor; });
  }

  function cartao(oferta, copia) {
    var de = Number(oferta.preco_de);
    var por = Number(oferta.preco_por);
    var card = el("div", "card");
    if (copia) card.setAttribute("aria-hidden", "true");

    var foto = el("div", "card-img");
    var img = el("img");
    img.src = oferta.imagem_url;
    img.alt = copia ? "" : oferta.titulo;
    img.width = 148;
    img.height = 112;
    img.decoding = "async";
    foto.append(img, el("span", "badge", "-" + Math.round((1 - por / de) * 100) + "%"));

    var precos = el("div", "card-prices");
    precos.append(el("s", "de", reais(de)), el("strong", "por", reais(por)));

    card.append(foto, el("div", "card-title", oferta.titulo), precos);
    return card;
  }

  function mostrarOfertas(ofertas) {
    var trilho = document.getElementById("vitrine");
    if (!ofertas.length) {
      trilho.parentElement.hidden = true;
      return;
    }
    // O carrossel anda metade da trilha e recomeça: a segunda metade repete a primeira,
    // e cada metade precisa de cartões suficientes para cobrir a tela.
    var metade = [];
    while (metade.length < 6) metade = metade.concat(ofertas);
    trilho.replaceChildren();
    metade.forEach(function (o, i) { trilho.append(cartao(o, i >= ofertas.length)); });
    metade.forEach(function (o) { trilho.append(cartao(o, true)); });
    trilho.style.animationDuration = (metade.length * 5.7).toFixed(1) + "s";
  }

  function mostrarConfig(c) {
    if (LINK_GRUPO.test(c.grupo_link)) {
      document.querySelectorAll("[data-grupo]").forEach(function (a) { a.href = c.grupo_link; });
    }
    texto("[data-pessoas]", Number(c.pessoas_no_grupo).toLocaleString("pt-BR") + " pessoas");
    texto("[data-ofertas-dia]", c.ofertas_por_dia);
    texto("[data-ofertas-num]", parseInt(c.ofertas_por_dia, 10) || c.ofertas_por_dia);
    texto("[data-desconto]", c.desconto_maximo);
  }

  function api(caminho, opcoes) {
    opcoes = opcoes || {};
    opcoes.headers = Object.assign({
      apikey: cfg.supabaseAnonKey,
      Authorization: "Bearer " + cfg.supabaseAnonKey
    }, opcoes.headers);
    return fetch(cfg.supabaseUrl + "/rest/v1/" + caminho, opcoes).then(function (r) {
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.status === 200 ? r.json() : null;
    });
  }

  function usarPadrao() {
    mostrarConfig(padrao.config);
    mostrarOfertas(padrao.ofertas);
  }

  function carregar() {
    if (!temBanco) return usarPadrao();
    Promise.all([
      api("config?id=eq.1&select=grupo_link,pessoas_no_grupo,ofertas_por_dia,desconto_maximo"),
      api("ofertas?ativo=eq.true&select=titulo,imagem_url,preco_de,preco_por&order=ordem.asc,criado_em.asc")
    ]).then(function (r) {
      mostrarConfig(r[0][0] || padrao.config);
      mostrarOfertas(r[1]);
    }).catch(usarPadrao);
  }

  document.addEventListener("click", function (e) {
    var botao = e.target.closest("[data-grupo]");
    if (!botao || !temBanco) return;
    api("cliques", {
      method: "POST",
      keepalive: true,
      headers: { "Content-Type": "application/json", Prefer: "return=minimal" },
      body: JSON.stringify({ origem: botao.dataset.grupo })
    }).catch(function () {});
  });

  carregar();
})();
