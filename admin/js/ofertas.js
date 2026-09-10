(function (PB) {
  var PASTA_PUBLICA = "/storage/v1/object/public/produtos/";
  var ul = PB.$("#lista-ofertas");
  var dlg = PB.$("#dlg-oferta");
  var form = PB.$("#form-oferta");
  var msg = PB.$("#oferta-msg");
  var previa = PB.$("#foto-previa");
  var ofertas = [];
  var editando = null;
  var fotoNova = null;

  function aviso(texto) {
    ul.replaceChildren(PB.el("li", { className: "vazio", textContent: texto }));
  }

  PB.carregarOfertas = async function () {
    aviso("Carregando…");
    var r = await PB.db.from("ofertas").select("*").order("ordem").order("criado_em");
    if (r.error) return aviso("Não consegui carregar as ofertas: " + r.error.message);
    ofertas = r.data;
    if (!ofertas.length) return aviso("Nenhuma oferta ainda. Use “+ Nova oferta”.");
    ul.replaceChildren.apply(ul, ofertas.map(item));
  };

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

  function item(o, i) {
    var precos = PB.el("div", { className: "item-precos" }, [
      PB.el("s", { textContent: PB.reais(o.preco_de) }),
      " → ",
      PB.el("strong", { textContent: PB.reais(o.preco_por) }),
      PB.el("span", { className: "selo", textContent: "-" + PB.desconto(o.preco_de, o.preco_por) + "%" })
    ]);
    var info = PB.el("div", { className: "item-info" }, [PB.el("div", { className: "item-titulo", textContent: o.titulo }), precos]);
    if (!o.ativo) info.append(PB.el("div", { className: "item-status", textContent: "Oculta no site" }));

    var acoes = PB.el("div", { className: "item-acoes" }, [
      botao("↑", "Subir " + o.titulo, function () { mover(i, -1); }, { desabilitado: i === 0 }),
      botao("↓", "Descer " + o.titulo, function () { mover(i, 1); }, { desabilitado: i === ofertas.length - 1 }),
      botao(o.ativo ? "Ocultar" : "Mostrar", (o.ativo ? "Ocultar do site: " : "Mostrar no site: ") + o.titulo, function () { alternar(o); }),
      botao("Editar", "Editar " + o.titulo, function () { abrir(o); }),
      botao("Excluir", "Excluir " + o.titulo, function () { excluir(o); }, { perigo: true })
    ]);

    return PB.el("li", { className: "item" + (o.ativo ? "" : " inativo") }, [
      PB.el("img", { src: PB.imagemSrc(o.imagem_url), alt: "" }),
      info,
      acoes
    ]);
  }

  async function mover(i, passo) {
    var nova = ofertas.slice();
    var trocada = nova[i];
    nova[i] = nova[i + passo];
    nova[i + passo] = trocada;
    var mudancas = [];
    nova.forEach(function (o, posicao) {
      if (o.ordem !== posicao) mudancas.push(PB.db.from("ofertas").update({ ordem: posicao }).eq("id", o.id));
    });
    var falha = (await Promise.all(mudancas)).find(function (r) { return r.error; });
    if (falha) alert("Não consegui reordenar: " + falha.error.message);
    PB.carregarOfertas();
  }

  async function alternar(o) {
    var r = await PB.db.from("ofertas").update({ ativo: !o.ativo }).eq("id", o.id);
    if (r.error) alert("Não consegui alterar: " + r.error.message);
    PB.carregarOfertas();
  }

  async function excluir(o) {
    if (!confirm("Excluir “" + o.titulo + "”? Não tem como desfazer.")) return;
    var r = await PB.db.from("ofertas").delete().eq("id", o.id);
    if (r.error) return alert("Não consegui excluir: " + r.error.message);
    removerFoto(o.imagem_url);
    PB.carregarOfertas();
  }

  function abrir(o) {
    editando = o || null;
    fotoNova = null;
    form.reset();
    PB.$("#dlg-titulo").textContent = o ? "Editar oferta" : "Nova oferta";
    if (o) {
      form.elements.titulo.value = o.titulo;
      form.elements.preco_de.value = PB.formatar(o.preco_de);
      form.elements.preco_por.value = PB.formatar(o.preco_por);
      form.elements.ativo.checked = o.ativo;
      previa.src = PB.imagemSrc(o.imagem_url);
    } else {
      previa.removeAttribute("src");
    }
    atualizarDesconto();
    PB.msg(msg, "");
    dlg.showModal();
  }

  function atualizarDesconto() {
    var de = PB.numero(form.elements.preco_de.value);
    var por = PB.numero(form.elements.preco_por.value);
    PB.$("#previa-desconto").textContent = de > 0 && por > 0 && por < de
      ? "O selo no site vai mostrar -" + PB.desconto(de, por) + "%"
      : "";
  }

  // Reduz a foto para no máximo 600 px e fundo branco, como aparece no cartão do site.
  async function reduzir(arquivo) {
    var imagem = await createImageBitmap(arquivo);
    var escala = Math.min(1, 600 / Math.max(imagem.width, imagem.height));
    var tela = document.createElement("canvas");
    tela.width = Math.round(imagem.width * escala);
    tela.height = Math.round(imagem.height * escala);
    var ctx = tela.getContext("2d");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, tela.width, tela.height);
    ctx.drawImage(imagem, 0, 0, tela.width, tela.height);
    var gerar = function (tipo, qualidade) {
      return new Promise(function (ok) { tela.toBlob(ok, tipo, qualidade); });
    };
    var blob = await gerar("image/webp", 0.82);
    if (!blob || blob.type !== "image/webp") blob = await gerar("image/jpeg", 0.85);
    return blob;
  }

  async function enviarFoto(arquivo) {
    var blob = await reduzir(arquivo);
    var extensao = blob.type === "image/webp" ? "webp" : "jpg";
    var caminho = "ofertas/" + Date.now() + "-" + Math.random().toString(36).slice(2, 8) + "." + extensao;
    var r = await PB.db.storage.from("produtos").upload(caminho, blob, { contentType: blob.type, cacheControl: "31536000" });
    if (r.error) throw r.error;
    return PB.db.storage.from("produtos").getPublicUrl(caminho).data.publicUrl;
  }

  function removerFoto(url) {
    var i = url.indexOf(PASTA_PUBLICA);
    if (i >= 0) PB.db.storage.from("produtos").remove([url.slice(i + PASTA_PUBLICA.length)]);
  }

  async function salvar(e) {
    e.preventDefault();
    var titulo = form.elements.titulo.value.trim();
    var de = PB.numero(form.elements.preco_de.value);
    var por = PB.numero(form.elements.preco_por.value);
    if (!titulo) return PB.msg(msg, "Digite o nome do produto.", "erro");
    if (!(de > 0) || !(por > 0)) return PB.msg(msg, "Preencha os dois preços com números, ex.: 2.299 ou 873,90.", "erro");
    if (por >= de) return PB.msg(msg, "O preço “por” precisa ser menor que o preço “de”.", "erro");
    if (!editando && !fotoNova) return PB.msg(msg, "Escolha a foto do produto.", "erro");

    var enviar = form.querySelector("[type=submit]");
    enviar.disabled = true;
    PB.msg(msg, fotoNova ? "Enviando a foto…" : "Salvando…");
    var dados = { titulo: titulo, preco_de: de, preco_por: por, ativo: form.elements.ativo.checked };
    try {
      if (fotoNova) dados.imagem_url = await enviarFoto(fotoNova);
      var r;
      if (editando) {
        r = await PB.db.from("ofertas").update(dados).eq("id", editando.id);
      } else {
        dados.ordem = ofertas.reduce(function (maior, o) { return Math.max(maior, o.ordem + 1); }, 0);
        r = await PB.db.from("ofertas").insert(dados);
      }
      if (r.error) {
        if (dados.imagem_url) removerFoto(dados.imagem_url);
        throw r.error;
      }
      if (fotoNova && editando) removerFoto(editando.imagem_url);
      dlg.close();
      PB.carregarOfertas();
    } catch (erro) {
      PB.msg(msg, "Não consegui salvar: " + erro.message, "erro");
    } finally {
      enviar.disabled = false;
    }
  }

  form.elements.foto.addEventListener("change", function () {
    var arquivo = this.files[0];
    if (!arquivo) return;
    fotoNova = arquivo;
    previa.src = URL.createObjectURL(arquivo);
  });
  form.elements.preco_de.addEventListener("input", atualizarDesconto);
  form.elements.preco_por.addEventListener("input", atualizarDesconto);
  form.addEventListener("submit", salvar);
  PB.$("#dlg-cancelar").addEventListener("click", function () { dlg.close(); });
  PB.$("#btn-nova-oferta").addEventListener("click", function () { abrir(null); });
})(window.PB);
