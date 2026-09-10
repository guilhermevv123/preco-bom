// Lista com criar, editar, ocultar, reordenar e excluir — a mesma mecânica para ofertas e grupos.
(function (PB) {
  PB.crud = function (op) {
    var ul = PB.$(op.lista);
    var dlg = PB.$(op.dialogo);
    var form = dlg.querySelector("form");
    var msg = form.querySelector(".msg");
    var titulo = dlg.querySelector("h2");
    var enviar = form.querySelector("[type=submit]");
    var campoFoto = op.foto ? form.elements[op.foto.campo] : null;
    var previa = op.foto ? PB.$(op.foto.previa, form) : null;
    var registros = [];
    var editando = null;
    var fotoNova = null;

    function aviso(texto) {
      ul.replaceChildren(PB.el("li", { className: "vazio", textContent: texto }));
    }

    async function carregar() {
      aviso("Carregando…");
      var r = await PB.db.from(op.tabela).select("*").order("ordem").order("criado_em");
      if (r.error) return aviso("Não consegui carregar: " + r.error.message);
      registros = r.data;
      if (!registros.length) return aviso(op.vazio);
      ul.replaceChildren.apply(ul, registros.map(linha));
    }

    function botao(rotulo, descricao, acao, opcoes) {
      opcoes = opcoes || {};
      var b = PB.el("button", {
        type: "button",
        className: "icone" + (opcoes.perigo ? " perigo" : ""),
        textContent: rotulo,
        title: descricao,
        disabled: Boolean(opcoes.desabilitado),
        onclick: acao
      });
      b.setAttribute("aria-label", descricao);
      return b;
    }

    function linha(reg, i) {
      var nome = op.nome(reg);
      var partes = op.render(reg);
      var li = PB.el("li", { className: "item" + (reg.ativo ? "" : " inativo") + (partes.thumb ? "" : " item-sem-foto") });
      if (partes.thumb) li.append(partes.thumb);
      if (!reg.ativo) partes.info.append(PB.el("div", { className: "item-status", textContent: "Oculto no site" }));
      li.append(partes.info, PB.el("div", { className: "item-acoes" }, [
        botao("↑", "Subir " + nome, function () { mover(i, -1); }, { desabilitado: i === 0 }),
        botao("↓", "Descer " + nome, function () { mover(i, 1); }, { desabilitado: i === registros.length - 1 }),
        botao(reg.ativo ? "Ocultar" : "Mostrar", (reg.ativo ? "Ocultar do site: " : "Mostrar no site: ") + nome, function () { alternar(reg); }),
        botao("Editar", "Editar " + nome, function () { abrir(reg); }),
        botao("Excluir", "Excluir " + nome, function () { excluir(reg); }, { perigo: true })
      ]));
      return li;
    }

    async function mover(i, passo) {
      var nova = registros.slice();
      var trocado = nova[i];
      nova[i] = nova[i + passo];
      nova[i + passo] = trocado;
      var mudancas = [];
      nova.forEach(function (reg, posicao) {
        if (reg.ordem !== posicao) mudancas.push(PB.db.from(op.tabela).update({ ordem: posicao }).eq("id", reg.id));
      });
      var falha = (await Promise.all(mudancas)).find(function (r) { return r.error; });
      if (falha) alert("Não consegui reordenar: " + falha.error.message);
      carregar();
    }

    async function alternar(reg) {
      var r = await PB.db.from(op.tabela).update({ ativo: !reg.ativo }).eq("id", reg.id);
      if (r.error) alert("Não consegui alterar: " + r.error.message);
      carregar();
    }

    async function excluir(reg) {
      if (!confirm("Excluir “" + op.nome(reg) + "”? Não tem como desfazer.")) return;
      var r = await PB.db.from(op.tabela).delete().eq("id", reg.id);
      if (r.error) return alert("Não consegui excluir: " + r.error.message);
      if (op.foto && reg[op.foto.coluna]) PB.removerImagem(reg[op.foto.coluna]);
      carregar();
    }

    function abrir(reg) {
      editando = reg || null;
      fotoNova = null;
      form.reset();
      titulo.textContent = reg ? op.titulos.editar : op.titulos.novo;
      form.elements.ativo.checked = reg ? reg.ativo : true;
      if (previa) {
        if (reg && reg[op.foto.coluna]) previa.src = PB.imagemSrc(reg[op.foto.coluna]);
        else previa.removeAttribute("src");
      }
      if (reg) op.preencher(form, reg);
      if (op.aoMudar) op.aoMudar(form);
      PB.msg(msg, "");
      dlg.showModal();
    }

    async function salvar(e) {
      e.preventDefault();
      var lido = op.ler(form, { editando: editando, fotoNova: fotoNova });
      if (lido.erro) return PB.msg(msg, lido.erro, "erro");
      var dados = lido.dados;
      dados.ativo = form.elements.ativo.checked;
      var coluna = op.foto && op.foto.coluna;

      enviar.disabled = true;
      PB.msg(msg, fotoNova ? "Enviando a imagem…" : "Salvando…");
      try {
        if (fotoNova) dados[coluna] = await PB.enviarImagem(fotoNova, op.foto.pasta);
        var r;
        if (editando) {
          r = await PB.db.from(op.tabela).update(dados).eq("id", editando.id);
        } else {
          dados.ordem = registros.reduce(function (maior, reg) { return Math.max(maior, reg.ordem + 1); }, 0);
          r = await PB.db.from(op.tabela).insert(dados);
        }
        if (r.error) {
          if (fotoNova) PB.removerImagem(dados[coluna]);
          throw r.error;
        }
        if (fotoNova && editando && editando[coluna]) PB.removerImagem(editando[coluna]);
        dlg.close();
        carregar();
      } catch (erro) {
        PB.msg(msg, "Não consegui salvar: " + erro.message, "erro");
      } finally {
        enviar.disabled = false;
      }
    }

    if (campoFoto) {
      campoFoto.addEventListener("change", function () {
        var arquivo = this.files[0];
        if (!arquivo) return;
        fotoNova = arquivo;
        previa.src = URL.createObjectURL(arquivo);
      });
    }
    (op.observar || []).forEach(function (campo) {
      form.elements[campo].addEventListener("input", function () { op.aoMudar(form); });
    });
    form.addEventListener("submit", salvar);
    form.querySelector("[data-cancelar]").addEventListener("click", function () { dlg.close(); });
    PB.$(op.botaoNovo).addEventListener("click", function () { abrir(null); });

    return { carregar: carregar };
  };
})(window.PB);
