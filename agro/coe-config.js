/*!
 * COE Agro — identidade padrão da cooperativa
 * ------------------------------------------------------------------
 * Edite este arquivo para adaptar a plataforma à sua cooperativa.
 * Os mesmos campos podem ser alterados pela tela (botão IDENTIDADE);
 * o que for alterado pela tela vale para aquele navegador e pode ser
 * exportado em JSON.
 *
 * Os textos à esquerda (chaves) são os nomes de exemplo usados nas telas;
 * troque apenas os valores à direita.
 */
window.COE_CONFIG = {
  cooperativa: "Cooperativa Agroindustrial",   // nome completo (cabeçalho, título da página)
  nomeCurto: "Coop. Agroindustrial",           // usado em tabelas e contratos
  sigla: "CA",                                 // selo exibido quando não há logo (2 a 5 letras)
  logo: "logo.svg",                            // caminho, URL https ou vazio para usar a sigla
  unidade: "Central",                          // unidade principal (aparece como “Unidade Central”, “TELAS CENTRAL”…)
  codigo: "UNC",                               // prefixo dos códigos dos cards (ex.: UNC-VG-A)
  destaque: "",                                // cor de destaque (#rrggbb); vazio = cor padrão do tema

  // Portal: botão no cabeçalho para voltar à plataforma principal (vazio = sem botão)
  portal: "../index.html",
  portalNome: "COI Forge",

  // Demais unidades da cooperativa (telas “Demais unidades”, mapa, comparativos)
  unidades: {
    "Matriz": "Matriz",
    "Unidade 2": "Unidade 2",
    "Unidade 3": "Unidade 3",
    "Unidade 4": "Unidade 4",
    "Unidade 5": "Unidade 5",
    "Unidade 6": "Unidade 6"
  },

  // Municípios dos cooperados (tela Previsão do tempo)
  municipios: {
    "Município A": "Município A",
    "Município B": "Município B",
    "Município C": "Município C",
    "Município D": "Município D",
    "Município E": "Município E"
  }
};
