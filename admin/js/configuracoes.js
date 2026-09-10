(function (PB) {
  var form = PB.$("#form-config");
  var msg = PB.$("#config-msg");
  var CAMPOS = ["pessoas_no_grupo", "economia_gerada", "ofertas_por_dia", "desconto_maximo", "vagas_liberadas", "canal_link", "telegram_link", "pixel_id", "capi_webhook"];
  var LINK_CANAL = /^https:\/\/(www\.)?whatsapp\.com\/channel\/\S+$/;
  var LINK_TELEGRAM = /^https:\/\/t\.me\/\S+$/;

  PB.carregarConfig = async function () {
    PB.msg(msg, "Carregando…");
    var r = await PB.db.from("config").select(CAMPOS.join(",")).eq("id", 1).single();
    if (r.error) return PB.msg(msg, "Não consegui carregar: " + r.error.message, "erro");
    CAMPOS.forEach(function (campo) {
      var valor = r.data[campo];
      form.elements[campo].value = valor == null ? "" : campo === "economia_gerada" ? PB.formatar(valor) : valor;
    });
    PB.msg(msg, "");
  };

  form.addEventListener("submit", async function (e) {
    e.preventDefault();
    var economia = form.elements.economia_gerada.value.trim();
    var dados = {
      pessoas_no_grupo: parseInt(form.elements.pessoas_no_grupo.value, 10),
      economia_gerada: economia ? PB.numero(economia) : 0,
      ofertas_por_dia: form.elements.ofertas_por_dia.value.trim(),
      desconto_maximo: form.elements.desconto_maximo.value.trim(),
      vagas_liberadas: parseInt(form.elements.vagas_liberadas.value, 10),
      canal_link: form.elements.canal_link.value.trim() || null,
      telegram_link: form.elements.telegram_link.value.trim() || null,
      pixel_id: form.elements.pixel_id.value.trim() || null,
      capi_webhook: form.elements.capi_webhook.value.trim() || null,
      atualizado_em: new Date().toISOString()
    };
    if (!(dados.pessoas_no_grupo >= 0)) return PB.msg(msg, "Digite quantas pessoas estão no grupo.", "erro");
    if (!(dados.economia_gerada >= 0)) return PB.msg(msg, "A economia gerada precisa ser um número, ex.: 125.400,50.", "erro");
    if (!dados.ofertas_por_dia || !dados.desconto_maximo) return PB.msg(msg, "Preencha ofertas por dia e desconto máximo.", "erro");
    if (!(dados.vagas_liberadas >= 0 && dados.vagas_liberadas <= 999)) return PB.msg(msg, "Vagas liberadas: use um número de 0 a 999.", "erro");
    if (dados.canal_link && !LINK_CANAL.test(dados.canal_link)) return PB.msg(msg, "O canal precisa começar com https://whatsapp.com/channel/", "erro");
    if (dados.telegram_link && !LINK_TELEGRAM.test(dados.telegram_link)) return PB.msg(msg, "O Telegram precisa começar com https://t.me/", "erro");
    if (dados.pixel_id && !/^\d{6,20}$/.test(dados.pixel_id)) return PB.msg(msg, "O ID do Pixel tem só números (de 6 a 20 dígitos).", "erro");
    if (dados.capi_webhook && !/^https:\/\/\S+$/.test(dados.capi_webhook)) return PB.msg(msg, "O webhook precisa começar com https://", "erro");

    var botao = form.querySelector("[type=submit]");
    botao.disabled = true;
    PB.msg(msg, "Salvando…");
    var r = await PB.db.from("config").update(dados).eq("id", 1);
    botao.disabled = false;
    if (r.error) return PB.msg(msg, "Não consegui salvar: " + r.error.message, "erro");
    PB.msg(msg, "Salvo. O site já mostra os dados novos.", "ok");
  });
})(window.PB);
