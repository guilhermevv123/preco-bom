(function (PB) {
  if (!PB.configurado) {
    PB.$("#sem-banco").hidden = false;
    return;
  }

  var CARREGAR = {
    ofertas: PB.carregarOfertas,
    grupos: PB.carregarGrupos,
    config: PB.carregarConfig,
    metricas: PB.carregarMetricas
  };
  var recuperando = /type=recovery/.test(location.hash);
  var usuarioAtual = null;

  function telaLogin(aviso) {
    usuarioAtual = null;
    PB.$("#app").hidden = true;
    PB.$("#tela-login").hidden = false;
    if (aviso) PB.msg(PB.$("#login-msg"), aviso, "erro");
  }

  async function entrar(usuario) {
    if (usuarioAtual === usuario.id) return;
    var r = await PB.db.rpc("is_admin");
    if (r.error || r.data !== true) {
      await PB.db.auth.signOut();
      return telaLogin("Este e-mail não tem acesso ao painel.");
    }
    usuarioAtual = usuario.id;
    PB.$("#usuario-email").textContent = usuario.email;
    PB.$("#tela-login").hidden = true;
    PB.$("#app").hidden = false;
    abrirAba(abaSalva());
  }

  function abaSalva() {
    try { return localStorage.getItem("pb-aba") || "ofertas"; } catch (e) { return "ofertas"; }
  }

  function abrirAba(nome) {
    if (!CARREGAR[nome]) nome = "ofertas";
    try { localStorage.setItem("pb-aba", nome); } catch (e) { /* navegador sem armazenamento */ }
    document.querySelectorAll("[data-aba]").forEach(function (b) {
      var ativa = b.dataset.aba === nome;
      b.classList.toggle("ativa", ativa);
      b.setAttribute("aria-selected", String(ativa));
    });
    document.querySelectorAll(".aba").forEach(function (secao) { secao.hidden = secao.id !== "aba-" + nome; });
    CARREGAR[nome]();
  }

  PB.aoTrocarSenha = function () {
    recuperando = false;
    history.replaceState(null, "", location.pathname);
    PB.db.auth.getSession().then(function (r) {
      if (r.data.session) entrar(r.data.session.user);
    });
  };

  document.querySelectorAll("[data-aba]").forEach(function (b) {
    b.addEventListener("click", function () { abrirAba(b.dataset.aba); });
  });
  PB.$("#btn-sair").addEventListener("click", function () { PB.db.auth.signOut(); });

  // O supabase-js pede para não chamar o próprio cliente dentro deste callback; o setTimeout adia a chamada.
  PB.db.auth.onAuthStateChange(function (evento, sessao) {
    setTimeout(function () {
      if (evento === "PASSWORD_RECOVERY") recuperando = true;
      if (recuperando && sessao) {
        telaLogin();
        PB.modoLogin("nova-senha");
        return;
      }
      if (sessao) entrar(sessao.user);
      else telaLogin();
    }, 0);
  });
})(window.PB);
