(function (PB) {
  var ORIGENS = { topo: "Botão do topo", final: "Botão do final da página", fixo: "Barra fixa no rodapé" };
  var msg = PB.$("#metricas-msg");

  function contar(desde, origem) {
    var q = PB.db.from("cliques").select("id", { count: "exact", head: true });
    if (desde) q = q.gte("criado_em", desde.toISOString());
    if (origem) q = q.eq("origem", origem);
    return q.then(function (r) {
      if (r.error) throw r.error;
      return r.count || 0;
    });
  }

  function chaveDia(d) {
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }

  function linha(rotulo, valor) {
    return PB.el("tr", {}, [
      PB.el("td", { textContent: rotulo }),
      PB.el("td", { className: "num", textContent: valor.toLocaleString("pt-BR") })
    ]);
  }

  PB.carregarMetricas = async function () {
    PB.msg(msg, "Carregando…");
    var hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    var diasAtras = function (n) { var d = new Date(hoje); d.setDate(d.getDate() - n); return d; };

    var totais, porOrigem, porDia;
    try {
      totais = await Promise.all([contar(hoje), contar(diasAtras(6)), contar(diasAtras(29)), contar(null)]);
      porOrigem = await Promise.all(Object.keys(ORIGENS).map(function (o) { return contar(diasAtras(29), o); }));
      var r = await PB.db.rpc("cliques_por_dia", { dias: 14 });
      if (r.error) throw r.error;
      porDia = r.data;
    } catch (erro) {
      return PB.msg(msg, "Não consegui carregar: " + erro.message, "erro");
    }
    PB.msg(msg, "");

    var rotulos = ["Hoje", "Últimos 7 dias", "Últimos 30 dias", "Desde o início"];
    PB.$("#kpis").replaceChildren.apply(PB.$("#kpis"), totais.map(function (n, i) {
      return PB.el("div", { className: "kpi" }, [
        PB.el("strong", { textContent: n.toLocaleString("pt-BR") }),
        PB.el("span", { textContent: rotulos[i] })
      ]);
    }));

    var corpoOrigens = PB.$("#tabela-origens");
    corpoOrigens.replaceChildren.apply(corpoOrigens, Object.keys(ORIGENS).map(function (o, i) {
      return linha(ORIGENS[o], porOrigem[i]);
    }));

    var contagem = {};
    porDia.forEach(function (d) { contagem[d.dia] = Number(d.total); });
    var linhas = [];
    for (var n = 0; n < 14; n++) {
      var dia = diasAtras(n);
      var rotulo = n === 0 ? "Hoje" : n === 1 ? "Ontem" : dia.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" });
      linhas.push(linha(rotulo, contagem[chaveDia(dia)] || 0));
    }
    var corpoDias = PB.$("#tabela-dias");
    corpoDias.replaceChildren.apply(corpoDias, linhas);
  };

  PB.$("#btn-atualizar-metricas").addEventListener("click", function () { PB.carregarMetricas(); });
})(window.PB);
