// Conexão com o Supabase. A chave "anon" é pública por natureza: quem protege os dados são as regras (RLS) do banco.
// Com os dois campos vazios, o site usa as ofertas de js/dados.js e o painel fica desligado.
window.PB_CONFIG = {
  supabaseUrl: "",
  supabaseAnonKey: ""
};
