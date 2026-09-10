(function (PB) {
  var LINK_GRUPO = /^https:\/\/chat\.whatsapp\.com\/\S+$/;

  PB.carregarGrupos = PB.crud({
    tabela: "grupos",
    lista: "#lista-grupos",
    dialogo: "#dlg-grupo",
    botaoNovo: "#btn-novo-grupo",
    vazio: "Nenhum grupo cadastrado. Sem grupo, os botões do site não têm para onde levar.",
    titulos: { novo: "Novo grupo", editar: "Editar grupo" },
    nome: function (g) { return g.nome; },

    render: function (g) {
      var info = PB.el("div", { className: "item-info" }, [
        PB.el("div", { className: "item-titulo", textContent: g.nome }),
        PB.el("a", { className: "item-link", href: g.link, target: "_blank", rel: "noopener", textContent: g.link })
      ]);
      return { thumb: null, info: info };
    },

    preencher: function (form, g) {
      form.elements.nome.value = g.nome;
      form.elements.link.value = g.link;
    },

    ler: function (form) {
      var nome = form.elements.nome.value.trim();
      var link = form.elements.link.value.trim();
      if (!nome) return { erro: "Digite o nome do grupo." };
      if (!LINK_GRUPO.test(link)) return { erro: "O link precisa começar com https://chat.whatsapp.com/" };
      return { dados: { nome: nome, link: link } };
    }
  }).carregar;
})(window.PB);
