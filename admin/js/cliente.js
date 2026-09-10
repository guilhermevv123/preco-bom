window.PB = window.PB || {};

(function (PB) {
  var cfg = window.PB_CONFIG || {};
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
})(window.PB);
