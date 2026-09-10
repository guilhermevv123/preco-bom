(function (PB) {
  var form = PB.$("#form-config");
  var msg = PB.$("#config-msg");
  var CAMPOS = ["grupo_link", "pessoas_no_grupo", "ofertas_por_dia", "desconto_maximo"];

  PB.carregarConfig = async function () {
    PB.msg(msg, "Carregando…");
    var r = await PB.db.from("config").select(CAMPOS.join(",")).eq("id", 1).single();
    if (r.error) return PB.msg(msg, "Não consegui carregar: " + r.error.message, "erro");
    CAMPOS.forEach(function (campo) { form.elements[campo].value = r.data[campo]; });
    PB.msg(msg, "");
  };

  form.addEventListener("submit", async function (e) {
    e.preventDefault();
    var dados = {
      grupo_link: form.elements.grupo_link.value.trim(),
      pessoas_no_grupo: parseInt(form.elements.pessoas_no_grupo.value, 10),
      ofertas_por_dia: form.elements.ofertas_por_dia.value.trim(),
      desconto_maximo: form.elements.desconto_maximo.value.trim(),
      atualizado_em: new Date().toISOString()
    };
    if (!/^https:\/\/chat\.whatsapp\.com\/\S+$/.test(dados.grupo_link)) {
      return PB.msg(msg, "O link do grupo precisa começar com https://chat.whatsapp.com/", "erro");
    }
    if (!(dados.pessoas_no_grupo >= 0)) return PB.msg(msg, "Digite quantas pessoas estão no grupo.", "erro");
    if (!dados.ofertas_por_dia || !dados.desconto_maximo) return PB.msg(msg, "Preencha todos os campos.", "erro");

    var botao = form.querySelector("[type=submit]");
    botao.disabled = true;
    PB.msg(msg, "Salvando…");
    var r = await PB.db.from("config").update(dados).eq("id", 1);
    botao.disabled = false;
    if (r.error) return PB.msg(msg, "Não consegui salvar: " + r.error.message, "erro");
    PB.msg(msg, "Salvo. O site já mostra os dados novos.", "ok");
  });
})(window.PB);
