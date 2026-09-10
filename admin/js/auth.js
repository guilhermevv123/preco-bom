(function (PB) {
  var form = PB.$("#form-login");
  var msg = PB.$("#login-msg");
  var botao = form.querySelector("[type=submit]");
  var endereco = location.origin + location.pathname;
  var modo = "entrar";
  var TEXTOS = {
    entrar: ["Entrar", "Painel de administração"],
    primeiro: ["Criar minha senha", "Primeiro acesso: crie sua senha"],
    "nova-senha": ["Salvar nova senha", "Escolha uma senha nova"]
  };

  PB.modoLogin = function (novo) {
    modo = novo;
    botao.textContent = TEXTOS[novo][0];
    PB.$("#login-sub").textContent = TEXTOS[novo][1];
    form.elements.email.closest("label").hidden = novo === "nova-senha";
    form.elements.senha.autocomplete = novo === "entrar" ? "current-password" : "new-password";
    PB.$("#btn-primeiro-acesso").textContent = novo === "primeiro" ? "Já tenho senha" : "Primeiro acesso";
    PB.$(".login-links").hidden = novo === "nova-senha";
    PB.msg(msg, novo === "primeiro" ? "Use o e-mail cadastrado como administrador." : "");
  };

  PB.erroAuth = function (erro) {
    var m = erro.message || String(erro);
    if (/invalid login credentials/i.test(m)) return "E-mail ou senha incorretos.";
    if (/email not confirmed/i.test(m)) return "Confirme seu e-mail pelo link que enviamos antes de entrar.";
    if (/already registered/i.test(m)) return "Esse e-mail já tem senha. Use “Entrar” ou “Esqueci a senha”.";
    if (/rate limit|security purposes/i.test(m)) return "Muitas tentativas seguidas. Espere um minuto e tente de novo.";
    if (/password/i.test(m)) return "Senha fraca: use pelo menos 8 caracteres, com letras e números.";
    return m;
  };

  PB.$("#btn-primeiro-acesso").addEventListener("click", function () {
    PB.modoLogin(modo === "primeiro" ? "entrar" : "primeiro");
  });

  PB.$("#btn-esqueci").addEventListener("click", async function () {
    var email = form.elements.email.value.trim();
    if (!email) return PB.msg(msg, "Digite seu e-mail no campo acima e clique de novo.", "erro");
    var r = await PB.db.auth.resetPasswordForEmail(email, { redirectTo: endereco });
    if (r.error) return PB.msg(msg, PB.erroAuth(r.error), "erro");
    PB.msg(msg, "Se esse e-mail tiver acesso, chega um link para criar uma senha nova.", "ok");
  });

  form.addEventListener("submit", async function (e) {
    e.preventDefault();
    var email = form.elements.email.value.trim();
    var senha = form.elements.senha.value;
    if (modo !== "nova-senha" && !email) return PB.msg(msg, "Digite seu e-mail.", "erro");
    if (senha.length < 8) return PB.msg(msg, "A senha precisa ter pelo menos 8 caracteres.", "erro");

    botao.disabled = true;
    PB.msg(msg, "Aguarde…");
    var r;
    if (modo === "entrar") r = await PB.db.auth.signInWithPassword({ email: email, password: senha });
    else if (modo === "primeiro") r = await PB.db.auth.signUp({ email: email, password: senha, options: { emailRedirectTo: endereco } });
    else r = await PB.db.auth.updateUser({ password: senha });
    botao.disabled = false;

    if (r.error) return PB.msg(msg, PB.erroAuth(r.error), "erro");
    if (modo === "primeiro" && !r.data.session) {
      return PB.msg(msg, "Quase lá: confirme pelo link que mandamos no seu e-mail e depois entre aqui.", "ok");
    }
    if (modo === "nova-senha") {
      form.reset();
      PB.modoLogin("entrar");
      PB.aoTrocarSenha();
    }
  });
})(window.PB);
