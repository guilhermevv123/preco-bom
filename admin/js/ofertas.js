(function (PB) {
  var LINK_HTTPS = /^https:\/\/\S+$/;

  function atualizarDesconto(form) {
    var de = PB.numero(form.elements.preco_de.value);
    var por = PB.numero(form.elements.preco_por.value);
    PB.$("#previa-desconto").textContent = de > 0 && por > 0 && por < de
      ? "O selo no site vai mostrar -" + PB.desconto(de, por) + "%"
      : "";
  }

  PB.carregarOfertas = PB.crud({
    tabela: "ofertas",
    lista: "#lista-ofertas",
    dialogo: "#dlg-oferta",
    botaoNovo: "#btn-nova-oferta",
    vazio: "Nenhuma oferta ainda. Use “+ Nova oferta”.",
    titulos: { novo: "Nova oferta", editar: "Editar oferta" },
    foto: { campo: "foto", coluna: "imagem_url", pasta: "ofertas", previa: "#foto-previa" },
    observar: ["preco_de", "preco_por"],
    aoMudar: atualizarDesconto,
    nome: function (o) { return o.titulo; },

    render: function (o) {
      var precos = PB.el("div", { className: "item-precos" }, [
        PB.el("s", { textContent: PB.reais(o.preco_de) }),
        " → ",
        PB.el("strong", { textContent: PB.reais(o.preco_por) }),
        PB.el("span", { className: "selo", textContent: "-" + PB.desconto(o.preco_de, o.preco_por) + "%" })
      ]);
      var info = PB.el("div", { className: "item-info" }, [PB.el("div", { className: "item-titulo", textContent: o.titulo }), precos]);
      var extras = [];
      if (o.cupom) extras.push("Cupom " + o.cupom);
      if (o.link) extras.push("com link");
      if (extras.length) info.append(PB.el("div", { className: "item-extra", textContent: extras.join(" · ") }));
      return { thumb: PB.el("img", { src: PB.imagemSrc(o.imagem_url), alt: "" }), info: info };
    },

    preencher: function (form, o) {
      form.elements.titulo.value = o.titulo;
      form.elements.preco_de.value = PB.formatar(o.preco_de);
      form.elements.preco_por.value = PB.formatar(o.preco_por);
      form.elements.cupom.value = o.cupom || "";
      form.elements.link.value = o.link || "";
    },

    ler: function (form, ctx) {
      var titulo = form.elements.titulo.value.trim();
      var de = PB.numero(form.elements.preco_de.value);
      var por = PB.numero(form.elements.preco_por.value);
      var cupom = form.elements.cupom.value.trim();
      var link = form.elements.link.value.trim();
      if (!titulo) return { erro: "Digite o nome do produto." };
      if (!(de > 0) || !(por > 0)) return { erro: "Preencha os dois preços com números, ex.: 2.299 ou 873,90." };
      if (por >= de) return { erro: "O preço “por” precisa ser menor que o preço “de”." };
      if (link && !LINK_HTTPS.test(link)) return { erro: "O link da oferta precisa começar com https://" };
      if (!ctx.editando && !ctx.fotoNova) return { erro: "Escolha a foto do produto." };
      return { dados: { titulo: titulo, preco_de: de, preco_por: por, cupom: cupom || null, link: link || null } };
    }
  }).carregar;
})(window.PB);
