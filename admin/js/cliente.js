window.PB = window.PB || {};

(function (PB) {
  var cfg = window.PB_CONFIG || {};
  var PASTA_PUBLICA = "/storage/v1/object/public/imagens/";
  PB.configurado = Boolean(cfg.supabaseUrl && cfg.supabaseAnonKey && window.supabase);
  if (PB.configurado) PB.db = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey);

  PB.$ = function (seletor, raiz) { return (raiz || document).querySelector(seletor); };

  PB.el = function (tag, props, filhos) {
    var e = document.createElement(tag);
    Object.assign(e, props || {});
    (filhos || []).forEach(function (f) { e.append(f); });
    return e;
  };

  PB.formatar = function (n) {
    n = Number(n);
    return n.toLocaleString("pt-BR", { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 });
  };

  PB.reais = function (n) { return "R$ " + PB.formatar(n); };

  // Aceita "2.299", "2.299,90", "873", "873,5" e "R$ 1.519".
  PB.numero = function (texto) {
    var t = String(texto).replace(/[R$\s]/g, "");
    if (t.indexOf(",") >= 0) t = t.replace(/\./g, "").replace(",", ".");
    else if (/^\d{1,3}(\.\d{3})+$/.test(t)) t = t.replace(/\./g, "");
    var n = Number(t);
    return t && isFinite(n) ? n : NaN;
  };

  PB.desconto = function (de, por) { return Math.round((1 - por / de) * 100); };

  PB.msg = function (el, texto, tipo) {
    el.textContent = texto || "";
    el.dataset.tipo = tipo || "";
  };

  // Fotos do banco vêm com URL completa; as de exemplo são caminhos do próprio site.
  PB.imagemSrc = function (url) { return /^https?:\/\//.test(url) ? url : "../" + url; };

  // Reduz a imagem para no máximo 900 px de lado, com fundo branco, antes de enviar.
  async function reduzir(arquivo) {
    var imagem = await createImageBitmap(arquivo);
    var escala = Math.min(1, 900 / Math.max(imagem.width, imagem.height));
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

  PB.enviarImagem = async function (arquivo, pasta) {
    var blob = await reduzir(arquivo);
    var extensao = blob.type === "image/webp" ? "webp" : "jpg";
    var caminho = pasta + "/" + Date.now() + "-" + Math.random().toString(36).slice(2, 8) + "." + extensao;
    var r = await PB.db.storage.from("imagens").upload(caminho, blob, { contentType: blob.type, cacheControl: "31536000" });
    if (r.error) throw r.error;
    return PB.db.storage.from("imagens").getPublicUrl(caminho).data.publicUrl;
  };

  PB.removerImagem = function (url) {
    var i = (url || "").indexOf(PASTA_PUBLICA);
    if (i >= 0) PB.db.storage.from("imagens").remove([url.slice(i + PASTA_PUBLICA.length)]);
  };
})(window.PB);
