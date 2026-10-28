# COE Agro

**Centro de Operações para cooperativas agroindustriais**, com telas operacionais prontas e videowall editável.

Recepção · Classificação · Moegas · Secagem · Silos e aeração · Armazém · Expedição · Previsão do tempo · Câmeras · Demais unidades · Alertas

![versão](https://img.shields.io/badge/versão-1.0.0-1f6feb) ![stack](https://img.shields.io/badge/stack-HTML%20%7C%20CSS%20%7C%20JavaScript-0f172a) ![build](https://img.shields.io/badge/build-nenhum-15803d) ![licença](https://img.shields.io/badge/licença-MIT-64708a)

---

> Este modelo faz parte do **COI Forge** (pasta `agro/`). Abra pelo menu **Modelos → COE Agro** ou em `/agro/`; o botão **COI FORGE** no cabeçalho volta para a plataforma. Veja a seção *COE Agro* do [README principal](../README.md) para incorporar as telas nos dashboards e no videowall do COI Forge.

## Visão geral

O COE Agro reúne em um site estático as telas de acompanhamento de uma unidade de recebimento, beneficiamento e armazenagem de grãos, mais a comparação com as demais unidades da cooperativa. Ele foi pensado para a sala de controle: as telas se ajustam a qualquer resolução sem rolagem e podem ser distribuídas em um videowall de várias TVs.

A plataforma é **genérica**: nome da cooperativa, logo, sigla, unidade principal, demais unidades, municípios dos cooperados e cor de destaque são configuráveis, sem editar as telas.

> Os números exibidos são **ilustrativos**. Use-os para validar com a operação quais indicadores, alertas e telas são necessários antes de integrar as fontes reais (veja [Dados reais](#dados-reais)).

## O que vem pronto

| Recurso | Descrição |
|---|---|
| **26 telas** | Visão geral da unidade, recepção e fluxo de caminhões, classificação, moegas, secagem e produtividade, silos e aeração, armazém, expedição e dosagem, previsão do tempo, câmeras por área e telas das demais unidades (visão geral com mapa, recebimento e filas, armazenagem, termometria, secagem e clima) |
| **Painel de alertas** | Lista priorizada com contador no cabeçalho |
| **Editor de conteúdo** (botão EDITAR) | Edita textos e valores, move, duplica e remove blocos e adiciona componentes (KPIs, gráficos, tabelas) com desfazer/refazer |
| **Identidade** (botão IDENTIDADE) | Nome, nome curto, sigla, logo, unidade principal, prefixo dos códigos, demais unidades, municípios e cor de destaque |
| **Videowall** (botão VIDEOWALL) | Layouts salvos, matriz de até 6 × 8 monitores, TVs mescladas, playlists por TV, modelos prontos, modo TV por link |
| **Tema claro e escuro**, **exportação em PDF** e **modo LIVE** | Como nas telas originais |

## Estrutura

```text
agro/   (dentro do repositório do COI Forge)
├── index.html          # telas do COE (conteúdo e estrutura)
├── style.css           # visual, temas claro/escuro e ajuste à tela
├── script.js           # navegação, editor de conteúdo, gráficos, mapa e câmeras
├── coe-config.js       # identidade padrão da cooperativa  ← comece por aqui
├── coe-plataforma.js   # identidade configurável e videowall editável
├── logo.svg            # logo genérico (substitua pelo da cooperativa)
└── README.md
```

## Publicar

### GitHub Pages

1. No repositório do COI Forge, os arquivos ficam na pasta `agro/`. Para usar o COE Agro sozinho, envie o conteúdo desta pasta para a raiz de outro repositório e deixe `portal` vazio no `coe-config.js`.
2. Em **Settings → Pages**, escolha **Deploy from a branch**, branch `main`, pasta `/ (root)`, e salve.
3. Em 1 a 3 minutos o site fica em `https://<usuário-ou-organização>.github.io/<repositório>/`.

### Rede interna

Qualquer servidor web estático serve (IIS, Nginx, Apache). Para testar no computador:

```bash
python -m http.server 8080
# acesse http://localhost:8080
```

Abrir o `index.html` direto do disco funciona para as telas, mas o videowall precisa da página servida por HTTP (as TVs abrem a própria página em quadros).

O mapa real da tela *Demais unidades · Visão geral* e a fonte Inter vêm da internet (CDN). Sem internet, a tela usa o mapa esquemático e a fonte do sistema.

## Adaptar para a sua cooperativa

### 1. Padrão para todos: `coe-config.js`

```js
window.COE_CONFIG = {
  cooperativa: "Cooperativa Vale do Grão",
  nomeCurto: "Coop. Vale",
  sigla: "CVG",
  logo: "logo.svg",          // ou "logo.png", ou https://…, ou "" para usar a sigla
  unidade: "Ribeirão",       // vira “Unidade Ribeirão”, “TELAS RIBEIRÃO”…
  codigo: "RIB",             // códigos dos cards: RIB-VG-A…
  destaque: "#16a34a",       // cor da moldura (cabeçalho, menu, selos); "" = padrão
  unidades: { "Matriz": "Matriz", "Unidade 2": "Campo Novo", "Unidade 3": "Serra Alta", … },
  municipios: { "Município A": "Santa Cruz", … }
};
```

As chaves (à esquerda) são os **nomes de exemplo** que aparecem nas telas; troque só os valores. Substitua também o `logo.svg` (SVG ou PNG com fundo transparente).

### 2. Pela tela: botão IDENTIDADE

Altera os mesmos campos na hora, inclusive o envio do logo. Vale para aquele navegador e para as TVs do videowall. Use **EXPORTAR** para gerar `coe-configuracao.json` (identidade + layouts do videowall) e **IMPORTAR** em outro computador. **PADRÃO** volta ao `coe-config.js`.

Os nomes são trocados em todo o texto, nos rótulos de acessibilidade, nos códigos dos cards e no que aparece depois (troca de tela, editor, restaurar layout). A cor de destaque vale para a moldura da interface; as cores dos gráficos (culturas, séries, alertas) não mudam, para não confundir a leitura dos dados.

### 3. Telas, unidades e mapa

- **Textos e valores das telas:** botão **EDITAR** (fica salvo no navegador) ou diretamente no `index.html` (vale para todos).
- **Posição das unidades no mapa:** atributos `data-latlng="lat,long"` dos pinos na tela *Demais unidades · Visão geral* do `index.html`.
- **Culturas:** milho, sorgo, trigo e soja estão nas legendas e tabelas; ajuste no `index.html` conforme as culturas da unidade.

## Videowall

Abra pelo botão **VIDEOWALL** no cabeçalho ou pelo endereço `index.html?videowall=1`.

Cada TV mostra uma tela do COE, sem cabeçalho nem menu, com o mesmo conteúdo e ajuste de escala das telas. Tudo o que for editado no botão EDITAR aparece também nas TVs.

**Layouts prontos:** *Sala COE* (4 × 2 com visão geral em 2 × 2), *Câmeras* (3 × 2), *Turno · Recepção e expedição* (2 × 2) e *Demais unidades* (3 × 2 com destaque).

| Ação | Como |
|---|---|
| Trocar / criar / duplicar / renomear / excluir layout | Seletor **Layout** e botões ao lado |
| Matriz e modelos | **Linhas** (1–6), **Colunas** (1–8) e modelos 2×2 a 4×3, inclusive com destaque, faixa e central |
| Aparência | Formato do monitor (16:9, 16:10, 21:9, 4:3, 9:16), moldura entre monitores, cor de fundo, emendas nas TVs mescladas, rótulos e barra de progresso |
| Editar a montagem | **EDITAR LAYOUT**: arraste a TV para mover (soltar sobre outra do mesmo tamanho troca as duas), alça no canto para mesclar monitores, botões para configurar, duplicar, dividir e remover, ＋ em monitor livre para criar |
| Playlist da TV | Botão de configurar: até 12 telas por TV, cada uma com duração de 5 a 3.600 s; a troca acontece sem recarregar o quadro |
| Posição exata | No painel da TV: coluna, linha, largura e altura |
| Renomear TV | Clique no nome no rótulo da TV |
| Desfazer / refazer | `Ctrl+Z` / `Ctrl+Shift+Z` (até 40 passos) |
| Teclado | Setas movem, `Shift`+setas redimensionam, `Del` remove, `Ctrl+D` duplica, `Enter` configura, `Esc` sai |

### Modo TV no computador da sala

**▶ MODO TV** abre em tela inteira; **LINK TV** copia o endereço que abre o layout direto:

```text
https://<seu-endereço>/index.html?videowall=1&tv=1&layout=sala-coe
```

Para abrir sozinho ao ligar o computador, use o modo quiosque do navegador:

```bash
chrome --kiosk "https://<seu-endereço>/index.html?videowall=1&tv=1&layout=sala-coe"
msedge --kiosk "https://<seu-endereço>/index.html?videowall=1&tv=1&layout=sala-coe" --edge-kiosk-type=fullscreen
```

Durante o modo TV a plataforma pede ao navegador para não apagar a tela; configure também a energia do sistema operacional. Os layouts ficam salvos no navegador: monte-os em uma estação, **EXPORTE** e **IMPORTE** uma vez no computador da sala.

**Capacidade:** cada TV carrega uma cópia da página do COE. Salas de 5 a 9 TVs funcionam bem em computadores comuns; para mais TVs, prefira um computador com mais memória ou divida as TVs entre dois computadores, cada um com seu layout.

## Dados reais

As telas trazem dados de exemplo no próprio `index.html`. O caminho recomendado para produção:

1. **Validar com a operação** quais telas, indicadores, metas e alertas serão usados (o botão EDITAR ajuda a ajustar rapidamente).
2. **Camada de integração:** consolidar balança, classificação, CLPs/SCADA (secadores, aeração, termometria), ERP (contratos, estoques) e estação meteorológica em um ponto único (historiador, data hub ou API), com envolvimento de cada fornecedor.
3. **API do COE:** expor os valores em JSON (HTTPS, somente leitura) e preencher as telas a partir dela.

Não exponha sistemas de automação diretamente à internet e mantenha separadas as redes de automação (OT) e corporativa (TI).

## Segurança e privacidade

- Não versione dados operacionais reais, nomes de clientes e contratos, endereços internos ou credenciais.
- A configuração (identidade e layouts) fica no `localStorage` do navegador; o logo enviado pela tela fica salvo ali também (até 400 KB).
- Logos aceitam apenas caminho do próprio site, `https://` ou imagem enviada; os nomes informados são inseridos como texto, nunca como HTML.

## Compatibilidade

Chrome, Edge e Firefox atuais. Celular: telas com rolagem e menu em gaveta; a montagem do videowall é mais confortável em computador.

## Licença

MIT. Consulte [`LICENSE`](../LICENSE).
