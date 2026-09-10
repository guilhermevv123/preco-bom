(function (PB) {
  PB.carregarDepoimentos = PB.crud({
    tabela: "depoimentos",
    lista: "#lista-depoimentos",
    dialogo: "#dlg-depoimento",
    botaoNovo: "#btn-novo-depoimento",
    vazio: "Nenhum depoimento ainda. Enquanto isso, a seção fica escondida no site.",
    titulos: { novo: "Novo depoimento", editar: "Editar depoimento" },
    foto: { campo: "foto", coluna: "imagem_url", pasta: "depoimentos", previa: "#depoimento-previa" },
    nome: function (d) { return d.nome; },

    render: function (d) {
      var info = PB.el("div", { className: "item-info" }, [
        PB.el("div", { className: "item-titulo", textContent: d.nome }),
        PB.el("div", { className: "item-extra", textContent: d.texto || "Print enviado como foto" })
      ]);
      return { thumb: d.imagem_url ? PB.el("img", { src: PB.imagemSrc(d.imagem_url), alt: "" }) : null, info: info };
    },

    preencher: function (form, d) {
      form.elements.nome.value = d.nome;
      form.elements.texto.value = d.texto || "";
    },

    ler: function (form, ctx) {
      var nome = form.elements.nome.value.trim();
      var texto = form.elements.texto.value.trim();
      var temFoto = ctx.fotoNova || (ctx.editando && ctx.editando.imagem_url);
      if (!nome) return { erro: "Digite o nome de quem mandou." };
      if (!texto && !temFoto) return { erro: "Escreva a mensagem ou envie o print." };
      return { dados: { nome: nome, texto: texto || null } };
    }
  }).carregar;
})(window.PB);
