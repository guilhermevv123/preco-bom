(function () {
  var padrao = window.PB_PADRAO;
  var cfg = window.PB_CONFIG || {};
  var temBanco = Boolean(cfg.supabaseUrl && cfg.supabaseAnonKey);
  var LINK_GRUPO = /^https:\/\/chat\.whatsapp\.com\/\S+$/;
  var LINK_CANAL = /^https:\/\/(www\.)?whatsapp\.com\/channel\/\S+$/;
  var LINK_TELEGRAM = /^https:\/\/t\.me\/\S+$/;
  var LINK_HTTPS = /^https:\/\/\S+$/;
  var HORAS_EXEMPLO = ["09:12", "11:47", "14:05", "16:31", "18:41", "20:16"];
  var reduzMovimento = matchMedia("(prefers-reduced-motion: reduce)").matches;
  var membros = "";
  var configAtual = {};

  function el(tag, classe, texto) {
    var e = document.createElement(tag);
    if (classe) e.className = classe;
    if (texto != null) e.textContent = texto;
    return e;
  }

  function reais(n) {
    n = Number(n);
    return "R$ " + n.toLocaleString("pt-BR", { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 });
  }

  function texto(seletor, valor) {
    document.querySelectorAll(seletor).forEach(function (e) { e.textContent = valor; });
  }

  function hora(iso, indice) {
    if (iso) {
      var d = new Date(iso);
      if (!isNaN(d)) return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    }
    return HORAS_EXEMPLO[indice % HORAS_EXEMPLO.length];
  }

  function horario(iso, indice) {
    var span = el("span", "msg-time", hora(iso, indice) + " ");
    span.append(el("span", "lido", "✓✓"));
    return span;
  }

  function topoPrint(subtitulo) {
    var topo = el("div", "print-top");
    var nomes = el("div");
    nomes.append(el("b", null, "Preço Bom 🛒"), el("small", null, subtitulo));
    topo.append(el("span", "avatar", "PB"), nomes);
    return topo;
  }

  function linkCurto(url) {
    var t = url.replace(/^https?:\/\/(www\.)?/, "");
    return t.length > 36 ? t.slice(0, 35) + "…" : t;
  }

  function printOferta(o, indice, mini) {
    var de = Number(o.preco_de);
    var por = Number(o.preco_por);
    var temLink = !mini && LINK_HTTPS.test(o.link || "");
    var raiz = el(temLink ? "a" : "article", "print");
    if (temLink) {
      raiz.href = o.link;
      raiz.target = "_blank";
      raiz.rel = "noopener nofollow";
      raiz.dataset.entrar = "oferta";
    }
    var chat = el("div", "print-chat");
    var msg = el("div", "msg msg-out");
    var fig = el("div", "msg-img");
    var img = el("img");
    img.src = o.imagem_url;
    img.alt = mini ? "" : o.titulo;
    img.loading = "lazy";
    img.decoding = "async";
    fig.append(img);
    var pDe = el("p", "msg-de", "De ");
    pDe.append(el("s", null, reais(de)));
    var pPor = el("p", "msg-por", "Por " + reais(por) + " 🔥");
    pPor.append(el("span", "tag", "-" + Math.round((1 - por / de) * 100) + "%"));
    msg.append(el("b", "msg-from", "Preço Bom"), fig, el("p", "msg-title", o.titulo), pDe, pPor);
    if (o.cupom) {
      var pCupom = el("p", "msg-cupom", "🎟️ Cupom: ");
      pCupom.append(el("b", null, o.cupom));
      msg.append(pCupom);
    }
    if (LINK_HTTPS.test(o.link || "")) msg.append(el("p", "msg-link", linkCurto(o.link)));
    msg.append(horario(o.criado_em, indice));
    chat.append(el("span", "chip", "Hoje"), msg);
    raiz.append(topoPrint(membros ? membros + " membros" : "grupo de ofertas"), chat);
    return raiz;
  }

  function montarOfertas(ofertas) {
    var trilho = document.getElementById("track-ofertas");
    var secao = document.getElementById("ofertas");
    var fones = [document.getElementById("phone-1"), document.getElementById("phone-2")];
    fones.forEach(function (f, i) {
      f.replaceChildren();
      if (ofertas[i]) f.append(printOferta(ofertas[i], i, true));
    });
    document.querySelector(".hero-art").classList.toggle("sem-fones", ofertas.length < 2);
    if (!ofertas.length) {
      secao.hidden = true;
      document.querySelectorAll('a[href="#ofertas"]').forEach(function (a) { a.hidden = true; });
      return;
    }
    trilho.replaceChildren.apply(trilho, ofertas.map(function (o, i) { return printOferta(o, i, false); }));
    carrossel(secao.querySelector("[data-carousel]"));
  }

  function montarFaixa(c) {
    var itens = [
      "🔥 Mais de " + (parseInt(c.ofertas_por_dia, 10) || c.ofertas_por_dia) + " ofertas por dia",
      "💸 Até " + c.desconto_maximo + " de desconto",
      "✅ 100% grátis, sem cadastro",
      "🛒 Só links do Mercado Livre",
      "⚡ Cupons antes de acabar"
    ];
    var trilho = document.getElementById("faixa");
    // A faixa anda metade do trilho e recomeça, então o conteúdo vai duas vezes.
    trilho.replaceChildren.apply(trilho, itens.concat(itens).map(function (t) { return el("span", null, t); }));
  }

  function revelar() {
    var alvos = document.querySelectorAll(".reveal, .print");
    if (reduzMovimento || !("IntersectionObserver" in window)) {
      alvos.forEach(function (a) { a.classList.add("visivel"); });
      return;
    }
    var io = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (x) {
        if (!x.isIntersecting) return;
        x.target.classList.add("visivel");
        io.unobserve(x.target);
      });
    }, { threshold: 0.2 });
    alvos.forEach(function (a) { io.observe(a); });
  }

  function montarGrupos(grupos) {
    var lista = document.getElementById("lista-grupos");
    var validos = grupos.filter(function (g) { return LINK_GRUPO.test(g.link); });
    lista.replaceChildren.apply(lista, validos.map(function (g) {
      var a = el("a", "btn btn-grupo");
      a.href = g.link;
      a.target = "_blank";
      a.rel = "noopener nofollow";
      a.dataset.entrar = "modal-grupo";
      var icone = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      icone.setAttribute("class", "ic");
      var uso = document.createElementNS("http://www.w3.org/2000/svg", "use");
      uso.setAttribute("href", "#i-wa");
      icone.append(uso);
      a.append(icone, " Entrar no grupo " + g.nome);
      return a;
    }));
    if (!validos.length) lista.append(el("p", "vazio-modal", "Os grupos estão sendo atualizados. Volte em alguns minutos."));
    return validos.length;
  }

  function aplicarConfig(c) {
    configAtual = c;
    membros = Number(c.pessoas_no_grupo).toLocaleString("pt-BR");
    texto("[data-desconto]", c.desconto_maximo);
    document.querySelector("[data-kpi-pessoas]").dataset.value = Number(c.pessoas_no_grupo) || 0;

    var kpiOfertas = document.querySelector("[data-kpi-ofertas]");
    var n = parseInt(c.ofertas_por_dia, 10);
    if (n > 0) kpiOfertas.dataset.value = n;
    else {
      kpiOfertas.classList.remove("counter");
      kpiOfertas.textContent = c.ofertas_por_dia;
    }

    var economia = Number(c.economia_gerada) || 0;
    var kpiEconomia = document.querySelector("[data-kpi-economia]");
    kpiEconomia.hidden = !(economia > 0);
    kpiEconomia.querySelector(".counter").dataset.value = economia;

    if (LINK_TELEGRAM.test(c.telegram_link || "")) {
      document.querySelectorAll("[data-telegram]").forEach(function (a) { a.href = c.telegram_link; a.hidden = false; });
    }
    var canal = document.querySelector("[data-canal]");
    if (LINK_CANAL.test(c.canal_link || "")) {
      canal.href = c.canal_link;
      canal.hidden = false;
    }
    var vagas = parseInt(c.vagas_liberadas, 10);
    var banner = document.querySelector("[data-vagas]");
    banner.hidden = !(vagas > 0);
    texto("[data-vagas-num]", vagas);

    if (/^\d{6,20}$/.test(c.pixel_id || "")) pixel(c.pixel_id);
  }

  function contadores() {
    var suave = function (t) { return 1 - Math.pow(1 - t, 3); };
    function animar(e) {
      var alvo = parseFloat(e.dataset.value) || 0;
      var decimais = parseInt(e.dataset.decimals || "0", 10);
      var prefixo = e.dataset.prefix || "";
      var sufixo = e.dataset.suffix || "";
      var formato = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: decimais, maximumFractionDigits: decimais });
      var inicio = performance.now();
      var duracao = reduzMovimento ? 0 : 1400;
      function quadro(agora) {
        var p = duracao ? Math.min((agora - inicio) / duracao, 1) : 1;
        e.textContent = prefixo + formato.format(alvo * suave(p)) + sufixo;
        if (p < 1) requestAnimationFrame(quadro);
      }
      requestAnimationFrame(quadro);
    }
    var io = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (x) {
        if (!x.isIntersecting) return;
        animar(x.target);
        io.unobserve(x.target);
      });
    }, { threshold: 0.4 });
    document.querySelectorAll(".counter").forEach(function (e) { io.observe(e); });
  }

  function carrossel(raiz) {
    var trilho = raiz.querySelector(".car-track");
    var pontos = raiz.querySelector(".car-dots");
    var itens = Array.prototype.slice.call(trilho.children);
    var atual = 0;
    var pausado = false;
    var relogio = null;

    pontos.replaceChildren.apply(pontos, itens.map(function (_, i) {
      var b = el("button");
      b.type = "button";
      b.setAttribute("role", "tab");
      b.setAttribute("aria-label", "Item " + (i + 1));
      b.addEventListener("click", function () { irPara(i); reiniciar(); });
      return b;
    }));

    function marcar(i) {
      atual = i;
      pontos.querySelectorAll("button").forEach(function (b, j) { b.setAttribute("aria-selected", String(j === i)); });
    }

    function irPara(i) {
      var item = itens[i];
      trilho.scrollTo({ left: item.offsetLeft - (trilho.clientWidth - item.offsetWidth) / 2, behavior: reduzMovimento ? "auto" : "smooth" });
      marcar(i);
    }

    function maisProximo() {
      var centro = trilho.scrollLeft + trilho.clientWidth / 2;
      var melhor = 0;
      var menor = Infinity;
      itens.forEach(function (item, i) {
        var d = Math.abs(item.offsetLeft + item.offsetWidth / 2 - centro);
        if (d < menor) { menor = d; melhor = i; }
      });
      return melhor;
    }

    function reiniciar() {
      clearInterval(relogio);
      if (reduzMovimento || itens.length < 2) return;
      relogio = setInterval(function () {
        if (pausado || document.hidden) return;
        irPara((atual + 1) % itens.length);
      }, 3200);
    }

    var agendado = false;
    trilho.addEventListener("scroll", function () {
      if (agendado) return;
      agendado = true;
      requestAnimationFrame(function () { agendado = false; marcar(maisProximo()); });
    });
    raiz.querySelector(".car-prev").addEventListener("click", function () { irPara((atual - 1 + itens.length) % itens.length); reiniciar(); });
    raiz.querySelector(".car-next").addEventListener("click", function () { irPara((atual + 1) % itens.length); reiniciar(); });
    ["pointerenter", "pointerdown", "focusin"].forEach(function (ev) { raiz.addEventListener(ev, function () { pausado = true; }); });
    ["pointerleave", "pointerup", "focusout"].forEach(function (ev) { raiz.addEventListener(ev, function () { pausado = false; }); });

    marcar(0);
    reiniciar();
  }

  function pixel(id) {
    if (window.fbq) return;
    var n = window.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); };
    window._fbq = n;
    n.push = n;
    n.loaded = true;
    n.version = "2.0";
    n.queue = [];
    var s = document.createElement("script");
    s.async = true;
    s.src = "https://connect.facebook.net/en_US/fbevents.js";
    document.head.append(s);
    fbq("init", id);
    fbq("track", "PageView");
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

  function cookie(nome) {
    var m = document.cookie.match("(?:^|; )" + nome + "=([^;]*)");
    return m ? decodeURIComponent(m[1]) : "";
  }

  // Manda o mesmo evento para a API de Conversões (via webhook do n8n), com o event_id do Pixel para a Meta não contar duas vezes.
  function servidorMeta(origem, id) {
    var url = configAtual.capi_webhook || "";
    if (!LINK_HTTPS.test(url)) return;
    var fbc = cookie("_fbc");
    if (!fbc) {
      var fbclid = new URLSearchParams(location.search).get("fbclid");
      if (fbclid) fbc = "fb.1." + Date.now() + "." + fbclid;
    }
    var corpo = JSON.stringify({ event_name: "Lead", event_id: id, url: location.href, origem: origem, fbp: cookie("_fbp"), fbc: fbc });
    if (navigator.sendBeacon) navigator.sendBeacon(url, corpo);
    else fetch(url, { method: "POST", body: corpo, keepalive: true, mode: "no-cors" }).catch(function () {});
  }

  function registrar(origem) {
    var entrada = origem !== "nav" && origem !== "topo" && origem !== "final";
    if (entrada) {
      var id = window.crypto && crypto.randomUUID ? crypto.randomUUID() : Date.now() + "-" + Math.random().toString(36).slice(2);
      if (window.fbq) {
        fbq("track", "Lead", { content_name: origem }, { eventID: id });
        fbq("trackCustom", "EntrarNoGrupo", { origem: origem });
      }
      servidorMeta(origem, id);
    }
    if (!temBanco) return;
    api("cliques", {
      method: "POST",
      keepalive: true,
      headers: { "Content-Type": "application/json", Prefer: "return=minimal" },
      body: JSON.stringify({ origem: origem })
    }).catch(function () {});
  }

  function montar(dados) {
    aplicarConfig(dados.config);
    montarFaixa(dados.config);
    montarGrupos(dados.grupos);
    montarOfertas(dados.ofertas);
    contadores();
    revelar();
  }

  function carregar() {
    if (!temBanco) return montar(padrao);
    Promise.all([
      api("config?id=eq.1&select=pessoas_no_grupo,economia_gerada,ofertas_por_dia,desconto_maximo,vagas_liberadas,canal_link,telegram_link,pixel_id,capi_webhook"),
      api("grupos?ativo=eq.true&select=nome,link&order=ordem.asc,criado_em.asc"),
      api("ofertas?ativo=eq.true&select=titulo,imagem_url,preco_de,preco_por,cupom,link,criado_em&order=ordem.asc,criado_em.asc")
    ]).then(function (r) {
      montar({ config: r[0][0] || padrao.config, grupos: r[1], ofertas: r[2] });
    }).catch(function () { montar(padrao); });
  }

  var dlg = document.getElementById("dlg-whatsapp");
  document.addEventListener("click", function (e) {
    var abrir = e.target.closest("[data-grupo]");
    if (abrir) {
      registrar(abrir.dataset.grupo);
      dlg.showModal();
      var primeiro = dlg.querySelector("a:not([hidden])");
      if (primeiro) primeiro.focus();
      return;
    }
    if (e.target.closest("[data-fechar]") || e.target === dlg) {
      dlg.close();
      return;
    }
    var entrar = e.target.closest("[data-entrar]");
    if (entrar) registrar(entrar.dataset.entrar);
  });

  texto("[data-ano]", new Date().getFullYear());
  carregar();
})();
