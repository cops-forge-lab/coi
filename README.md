<div align="center">

# COI Forge

**Plataforma web configurável para estruturação de Centros de Operações Integradas**

Dashboards · KPIs · Alarmes · Videowall · Fontes de dados ao vivo · Arquitetura de integração · Infraestrutura

![versão](https://img.shields.io/badge/versão-0.3.0-6d28d9) ![stack](https://img.shields.io/badge/stack-HTML%20%7C%20CSS%20%7C%20JavaScript-0f172a) ![dependências](https://img.shields.io/badge/dependências-zero-0f9f6e) ![arquivos](https://img.shields.io/badge/arquivos-4-64708a) ![licença](https://img.shields.io/badge/licença-MIT-64708a)

</div>

---

## Visão geral

O **COI Forge** é uma base aberta para prototipar, configurar e apresentar as telas de um Centro de Operações Integradas direto no navegador. A configuração é feita pela própria interface, sem editar código, e pode ser exportada em JSON para versionamento.

A plataforma apoia a fase de concepção de um COI: alinhar com a operação quais indicadores, alarmes e conteúdos devem estar em cada tela, como o videowall será distribuído e quais sistemas precisam ser integrados.

> Os widgets podem ser alimentados por **fontes de dados reais** (APIs REST e WebSocket). A configuração padrão usa um simulador. O caminho para conectar SCADA, historiador, ERP, sensores e CFTV está na seção [Integração com fontes de dados](#integração-com-fontes-de-dados).

## Funcionalidades

| Módulo | O que permite |
|---|---|
| **Dashboards** | Múltiplas páginas com grid de 12 colunas; widgets de KPI, linha, barras, medidor, alarmes, status, tabela, texto, relógio, câmera e página externa |
| **Editor visual** | Adicionar, configurar, duplicar e excluir widgets; arrastar para reordenar; redimensionar pelo canto do card |
| **Fontes de dados** | Conectores REST (consulta periódica), WebSocket (tempo real) e simulador; status, latência, teste de conexão e visualização dos campos recebidos |
| **Dados ao vivo** | Cada widget pode ser vinculado a uma fonte e a um caminho no JSON; selo “Ao vivo” / “Desatualizado” e destaque visual quando a fonte para de atualizar |
| **Videowall** | Matriz de até 4 × 6 telas; cada tela recebe uma página completa ou um widget; modo TV em tela cheia |
| **Arquitetura** | Mapa de integração por camada (campo → visualização) e inventário editável de sistemas, fornecedores, protocolos e status |
| **Infraestrutura** | Inventário editável de equipamentos físicos do COI (monitores, controladora, estações, servidores, nobreaks, rede) |
| **Configurações** | Nome, cor de destaque, tema claro/escuro, simulação de dados e importação/exportação de JSON |

## Estrutura do repositório

```text
coi/
├── index.html      # aplicação completa: estilos, configuração padrão (JSON) e código
├── coi-tools.mjs   # ferramentas: servidor de teste, validador e exemplos (Node.js 18+)
├── README.md       # documentação completa
└── LICENSE
```

## Como usar

### Abrir

Basta abrir o `index.html` no navegador; não há build nem dependências. Tudo funciona direto do disco, inclusive o simulador de dados. Fontes REST e WebSocket exigem que a página seja servida (GitHub Pages ou servidor local).

### Publicar no GitHub Pages

1. Envie os 4 arquivos para a raiz do repositório.
2. Acesse **Settings → Pages**.
3. Em **Source**, selecione **Deploy from a branch**, branch `main`, pasta `/ (root)`, e salve.
4. Em alguns minutos o site fica disponível em `https://<usuário-ou-organização>.github.io/<repositório>/`.

O GitHub Pages publica todos os arquivos da branch, inclusive `README.md` e `coi-tools.mjs`; isso é esperado e não afeta o site. Nenhum arquivo do projeto usa o processamento do Jekyll, por isso não é necessário `.nojekyll`.

### Editar as telas

1. Clique em **Editar COI**.
2. Use **＋ Adicionar widget** para incluir componentes na página atual.
3. Arraste os cards para reordenar e use o canto inferior direito para redimensionar.
4. Clique em ⚙ no card para alterar título, valores, metas e demais propriedades.
5. Em **Fonte de dados**, escolha uma fonte e o caminho no JSON para que o widget seja atualizado automaticamente.
6. Clique em **Concluir edição**.

As alterações ficam salvas no navegador. Para compartilhar ou versionar, use **Configurações → Exportar JSON**. Para mudar o conteúdo **padrão** da plataforma, edite o bloco `<script id="coi-defaults" type="application/json">` no `index.html` e rode `node coi-tools.mjs verificar`.

## Ferramentas (`coi-tools.mjs`)

Requer Node.js 18 ou superior. A aplicação em si não depende de Node.

| Comando | O que faz |
|---|---|
| `node coi-tools.mjs servidor [porta]` | Serve a aplicação em `http://localhost:8787` com API REST de teste (`/api/coi`) e WebSocket (`ws://localhost:8787/ws`) |
| `node coi-tools.mjs validar [arquivo.json]` | Valida uma configuração exportada; sem arquivo, valida a configuração padrão do `index.html` |
| `node coi-tools.mjs exemplo mock [saida.json] [porta]` | Gera configuração com a página Executivo via REST e demais widgets via WebSocket do servidor de teste (informe a porta se não for 8787) |
| `node coi-tools.mjs exemplo 3x3 [saida.json]` | Gera configuração com videowall 3 × 3 (páginas, gráficos, alarmes e mosaico de câmeras) |
| `node coi-tools.mjs verificar` | Confere a sintaxe do código do `index.html`, a configuração padrão e os exemplos — **rodar antes de cada commit** |

Arquivos gerados são importados em **Configurações → Importar JSON**. Como o repositório não tem `.gitignore`, gere-os fora da pasta do projeto ou não os inclua no commit — principalmente configurações exportadas com endereços internos.

## Integração com fontes de dados

A v0.3 permite alimentar os widgets com dados de **APIs REST** e **WebSocket**. Esta seção descreve como conectar fontes reais e o formato esperado.

### Premissa

Em um COI, os sistemas de campo, automação, segurança e gestão normalmente operam de forma isolada e são fornecidos por empresas diferentes. A plataforma de visualização não substitui a integração: ela depende de uma camada de dados que consolide essas fontes, com o envolvimento de cada fornecedor.

```text
Campo / automação        Segurança          Gestão
(sensores, CLP, SCADA)   (CFTV, acesso)     (ERP, MES)
        │                     │                 │
        └──────────┬──────────┴────────┬────────┘
                   ▼                   ▼
           Camada de integração / data hub
          (OPC UA, Modbus, MQTT, APIs REST)
                   │
                   ▼
      API do COI (REST / WebSocket, JSON) ──► COI Forge
```

Na v0.3, o COI Forge **não** se conecta diretamente a CLPs, OPC UA, Modbus ou MQTT. Esses protocolos devem ser tratados pela camada de integração, que expõe os dados em JSON.

> **Planejado para a v0.4:** fonte MQTT sobre WebSocket (`wss://`) direto no navegador e gateway OPC UA (`bridge/`) que publica por WebSocket, REST e MQTT. Detalhes em [`PLANO-TECNICO-v0.4.md`](PLANO-TECNICO-v0.4.md#6-conectividade-industrial).

### Tipos de fonte

| Tipo | Quando usar | Configuração |
|---|---|---|
| **Simulador** | Demonstrações e validação de layout | Intervalo (s) |
| **REST (polling)** | APIs ou arquivos JSON atualizados periodicamente | URL, intervalo (s) |
| **WebSocket** | Dados em tempo real (alarmes, telemetria) | URL `wss://` |

URLs aceitas: `https://`, `wss://`, caminhos relativos (ex.: `dados.json`) e `http://localhost` / `ws://localhost` para testes.

### Passo a passo

1. **Fontes de dados → Nova fonte**: informe nome, tipo e URL; use **Testar conexão**.
2. **Ver dados**: confira os caminhos disponíveis no JSON recebido.
3. **Editar COI → ⚙ do widget → Fonte de dados**: escolha a fonte e o caminho (o campo sugere os caminhos encontrados).
4. O widget exibe **Ao vivo** enquanto recebe dados e **Desatualizado** (com destaque visual) quando a fonte para.

### Formato do payload

Qualquer JSON é aceito; cada widget lê um caminho dentro dele. Estrutura usada pelo simulador e pelo servidor de teste:

```json
{
  "timestamp": "2026-10-28T10:00:00-03:00",
  "operacao": {
    "disponibilidade": 98.7,
    "eficiencia": 92.4,
    "capacidade": 76,
    "producao": [420, 445, 438, 470],
    "alarmesAtivos": 4,
    "sistemasIntegrados": 3
  },
  "alarmes": [
    { "nivel": "critical", "descricao": "Sensor TS-04 sem comunicação", "hora": "10:42" }
  ],
  "integracoes": [
    { "sistema": "SCADA", "status": "online" },
    { "sistema": "ERP", "status": "pendente" }
  ],
  "paradas": [
    { "area": "Secagem", "minutos": 52 }
  ]
}
```

Caminhos: notação com ponto (`operacao.disponibilidade`) e índices de lista (`alarmes.0.descricao` ou `alarmes[0].descricao`). Os formatos aceitos por tipo de widget estão em [`WIDGETS.md`](WIDGETS.md).

### Requisitos da API

- Responder `Content-Type: application/json` com JSON válido.
- Liberar CORS (`Access-Control-Allow-Origin`) para o domínio onde o COI Forge está publicado.
- Usar HTTPS/WSS quando o COI Forge estiver em HTTPS (ex.: GitHub Pages) — navegadores bloqueiam conteúdo misto.
- Responder em até 8 segundos (tempo limite da consulta REST).
- WebSocket: cada mensagem deve ser um JSON completo (não incremental).

### Autenticação

A configuração fica no navegador e pode ser exportada para o repositório; por isso **não informe tokens ou senhas em URLs**. O validador bloqueia URLs com parâmetros como `token=`, `key=` ou `password=`.

Para APIs autenticadas, publique um **proxy/API do COI** que faça a autenticação no servidor e exponha apenas os dados necessários, com acesso restrito à rede ou ao SSO da empresa.

### Testar localmente

```bash
node coi-tools.mjs servidor                       # porta 8787 (ou: node coi-tools.mjs servidor 9000)
node coi-tools.mjs exemplo mock coi-mock.json     # gera a configuração de teste
```

- Aplicação: `http://localhost:8787`
- REST: `http://localhost:8787/api/coi` (ou o caminho relativo `api/coi`)
- WebSocket: `ws://localhost:8787/ws` (mensagem a cada 2 s)

Importe `coi-mock.json` em **Configurações → Importar JSON** para ter a página Executivo ligada ao REST e as demais ao WebSocket. Os alarmes do servidor de teste aparecem com o prefixo `[API]`.

> Ao abrir o `index.html` direto do disco (`file://`), o navegador bloqueia fontes REST com caminho relativo. O Simulador funciona normalmente; para REST e WebSocket use o servidor de teste ou o GitHub Pages.

### Cuidados

- Não expor sistemas de automação diretamente à internet; a API do COI deve consumir dados de uma camada intermediária.
- Segregar redes de automação (OT) e corporativa (TI).
- Não versionar credenciais, endereços IP internos ou tokens neste repositório.

## Documentação técnica

<details>
<summary><strong>Arquitetura da aplicação</strong></summary>

O COI Forge é uma aplicação web estática, escrita em HTML, CSS e JavaScript sem frameworks ou dependências externas. Isso permite publicação direta no GitHub Pages e leitura simples do código.

#### Camadas

Tudo fica em um único `index.html`, organizado em seções comentadas, nesta ordem:

```text
┌──────────────────────────────────────────────────────────────┐
│ <style>            — design system, temas e responsividade   │
├──────────────────────────────────────────────────────────────┤
│ estrutura HTML     — sidebar, topbar, área de telas, painel  │
├──────────────────────────────────────────────────────────────┤
│ #coi-defaults      — configuração padrão em JSON             │
├──────────────────────────────────────────────────────────────┤
│ Store              — persistência, migração e utilitários    │
├──────────────────────────────────────────────────────────────┤
│ DataHub            — conectores REST, WebSocket e simulador; │
│                      status, reconexão e testes              │
├──────────────────────────────────────────────────────────────┤
│ Widgets            — biblioteca de widgets (render, simulação│
│                      e vínculo com fontes)                   │
├──────────────────────────────────────────────────────────────┤
│ Views              — dashboards, videowall, fontes,          │
│                      arquitetura, infraestrutura, config.    │
├──────────────────────────────────────────────────────────────┤
│ App                — estado, eventos, editor, drag-and-drop, │
│                      redimensionamento, dados ao vivo        │
└──────────────────────────────────────────────────────────────┘
```

Para encontrar uma seção, procure no arquivo pelo título do comentário (ex.: `DataHub — fontes de dados`).

#### Modelo de dados

Todo o conteúdo da plataforma é um único objeto JSON (`version: 3`):

| Chave | Conteúdo |
|---|---|
| `settings` | nome, subtítulo, cor de destaque, tema, simulação e intervalo |
| `pages[]` | páginas de dashboard, cada uma com `widgets[]` |
| `sources[]` | `id`, `name`, `type` (`simulated`, `rest`, `websocket`), `url`, `interval`, `staleAfter`, `enabled` |
| `pages[].widgets[]` | `id`, `type`, `title`, `w` (1–12), `h` (1–8), `props` e, opcionalmente, `binding` |
| `pages[].widgets[].binding` | `source` (id da fonte) e `path` (caminho no JSON, ex.: `operacao.disponibilidade`) |
| `videowall` | `rows`, `cols`, `labels`, `tiles[]` com `source` |
| `architecture[]` | camada, sistema, fornecedor, protocolo, status |
| `assets[]` | item, quantidade, local, status, observações |

Fontes do videowall: `page:<idPágina>`, `widget:<idPágina>:<idWidget>` ou `none`.

#### Fluxo de dados

```text
Fonte (REST / WebSocket / simulador)
        │  payload JSON
        ▼
DataHub ── status, latência, reconexão
        │
        ▼
Widgets vinculados ── resolve o caminho ── bind.apply() ── atualiza props ── re-renderiza
        │
        ▼
Selo “Ao vivo” / “Desatualizado” (verificado a cada segundo)
```

- **REST:** consulta a URL a cada `interval` segundos, com tempo limite de 8 s e sem requisições sobrepostas.
- **WebSocket:** cada mensagem deve ser um JSON completo; reconexão automática com espera progressiva (1 s a 30 s).
- **Desatualizado:** após `staleAfter` segundos sem leitura (0 = automático: 3× o intervalo, mínimo 15 s; WebSocket 30 s).
- Widgets vinculados ignoram a simulação local (“Simular variação”).

#### Persistência

- O estado é salvo em `localStorage` (chave `coi-forge:state:v3`). Configurações v2 são migradas automaticamente, recebendo as fontes padrão sem vínculos.
- **Exportar JSON** gera o arquivo para versionar no repositório.
- **Importar JSON** valida a estrutura antes de aplicar.
- **Restaurar padrão** volta ao conteúdo do bloco `#coi-defaults`.

#### Segurança

- Todo texto informado pelo usuário é escapado antes da renderização.
- Câmeras e páginas externas aceitam apenas URLs `https://`; iframes são carregados com `sandbox`.
- Nenhuma requisição de rede é feita pela aplicação, exceto as URLs configuradas explicitamente.
- Fontes aceitam apenas `https://`, `wss://`, caminhos relativos ou `localhost` (para testes); esquemas como `javascript:` são bloqueados.
- Os valores recebidos das fontes passam pelo mesmo escape antes de serem exibidos.

</details>

<details>
<summary><strong>Catálogo de widgets</strong></summary>

| Tipo | Nome | Uso típico | Propriedades principais |
|---|---|---|---|
| `kpi` | KPI | Disponibilidade, eficiência, volume | `value`, `unit`, `decimals`, `target`, `direction`, `note`, `simulate` |
| `line` | Gráfico de linha | Tendência horária/diária | `series`, `unit`, `target`, `simulate` |
| `bar` | Gráfico de barras | Comparação entre áreas ou unidades | `labels`, `series`, `unit`, `simulate` |
| `gauge` | Medidor | Capacidade, utilização, nível | `value`, `min`, `max`, `unit`, `target`, `simulate` |
| `alarms` | Alarmes | Eventos priorizados | `items` — `nível|descrição|hora` por linha |
| `status` | Status de sistemas | Saúde das integrações | `items` — `nome|online/pendente/offline` por linha |
| `table` | Tabela | Plano de ação, turnos, ordens | `rows` — colunas separadas por `|`, 1ª linha = cabeçalho |
| `text` | Texto | Procedimentos e avisos | `content` |
| `clock` | Relógio | Horário local ou de outras unidades | `timezone` (IANA) |
| `camera` | Câmera / CFTV | Mosaico de câmeras | `location`, `url` (snapshot https opcional) |
| `embed` | Página externa | Power BI, Grafana, sistemas web | `url` (https) |

#### Vínculo com fontes de dados

| Tipo | Propriedade atualizada | Formatos aceitos |
|---|---|---|
| `kpi`, `gauge` | `value` | número (ou objeto com `value`/`valor`) |
| `line` | `series` | lista de números (substitui) ou número (adiciona ponto, mantém 24) |
| `bar` | `labels` + `series` | lista de objetos (rótulo + número), objeto `{categoria: número}` ou lista de números |
| `alarms` | `items` | lista de objetos `{nivel, descricao, hora}` ou texto `nível|descrição|hora` |
| `status` | `items` | lista de objetos `{sistema, status}` ou objeto `{sistema: status}` |
| `table` | `rows` | lista de objetos (chaves viram colunas) ou lista de listas |
| `text` | `content` | texto ou número |

`clock`, `camera` e `embed` não são vinculáveis.

Os nomes de campo são reconhecidos em português e inglês (`nivel`/`level`, `descricao`/`text`, `sistema`/`name` etc.). Níveis e status são normalizados: `critico`, `alta`, `high` → crítico; `ok`, `ativo`, `up` → online; `erro`, `falha`, `down` → offline.

#### Regras de status

- **KPI:** verde quando atinge a meta, vermelho quando não atinge. `direction` define se o melhor é estar acima (`higher`) ou abaixo (`lower`).
- **Medidor:** verde até 75%, amarelo até 90% e vermelho acima de 90% da escala.
- **Tabela:** a última coluna recebe cor automaticamente (concluído/ok → verde; andamento/pendente → amarelo; atrasado/offline → vermelho).

#### Como criar um novo widget

Adicione uma entrada no objeto `WIDGETS`, na seção `Widgets` do `index.html`:

```js
meuWidget: {
  label: "Meu widget", icon: "★", description: "Descrição curta",
  defaults: { w: 4, h: 3, title: "Meu widget", props: { valor: 10 } },
  fields: [{ key: "valor", label: "Valor", type: "number" }],
  render(w) { return `<strong>${U.esc(w.props.valor)}</strong>`; },
  tick(w) { /* opcional: simulação */ }
}
```

O widget aparece automaticamente na biblioteca e no editor. Inclua o novo tipo na lista `TYPES` do `coi-tools.mjs`.

Para permitir vínculo com fontes, defina `bind` (e inclua o tipo em `BINDABLE` no `coi-tools.mjs`):

```js
WIDGETS.meuWidget.bind = {
  label: "Valor", accepts: "número",
  apply(w, v) { const n = Bind.number(v); if (n === null) return false; w.props.valor = n; }
};
```

Tipos de campo disponíveis no editor: `text`, `number`, `textarea`, `select`, `checkbox`. Sempre utilize `U.esc()` ao inserir texto do usuário no HTML.

</details>

<details>
<summary><strong>Roadmap</strong></summary>

| Versão | Escopo | Status |
|---|---|---|
| v0.1 | Shell web responsivo e editor rápido de títulos | Concluída |
| v0.2 | Widgets configuráveis, múltiplas páginas, drag-and-drop, redimensionamento, videowall, arquitetura, infraestrutura, import/export JSON | Concluída |
| v0.3 | Conectores de dados (REST/WebSocket/simulador), vínculo de fonte por widget, indicador de dado desatualizado, servidor de teste local, repositório em 4 arquivos | **Atual** |
| v0.4 | Playlists por tela, layouts de videowall salvos, rotação de páginas, modo TV por link, fonte MQTT (WebSocket) e gateway OPC UA — ver *Plano técnico da v0.4* abaixo | Em planejamento |
| v0.5 | Histórico de alarmes, reconhecimento (ack) e registro de turno | Planejada |
| v0.6 | Perfis de acesso (operador, supervisor, gestor) e modo somente leitura | Planejada |
| v1.0 | Plataforma configurável de COI com integração a fontes reais | Planejada |

</details>

<details>
<summary><strong>Plano técnico da v0.4</strong></summary>

**Tema:** operação contínua do videowall e conectividade industrial (MQTT e OPC UA)  
**Base:** v0.3.0 (fontes de dados REST/WebSocket e indicador ao vivo)  
**Status:** planejado — documento de referência para implementação  
**Estrutura do repositório:** arquivo único (`index.html` com seções `Store`, `DataHub`, `Widgets`, `Views`, `App`), `coi-tools.mjs`, `README.md` e `LICENSE`. Os novos módulos da v0.4 entram como **novas seções do `index.html`**, e os novos testes como **comandos do `coi-tools.mjs`**. A única pasta nova é `bridge/` (gateway OPC UA), por ser um serviço separado com dependência própria.

---

#### 1. Objetivo

Preparar o COI Forge para rodar **sem intervenção** em uma sala de controle: cada tela do videowall passa a ter uma sequência de conteúdos que se alternam sozinhos, os layouts podem ser salvos e trocados e o computador do videowall consegue abrir direto no modo TV a partir de um link.

Na v0.3 cada tela mostra um único conteúdo fixo e só existe um layout de videowall. Esta versão resolve essas duas limitações.

A v0.4 também aproxima a plataforma da automação: passa a receber dados de **brokers MQTT** e de **servidores OPC UA**, os dois padrões mais comuns para levar dados de campo (sensores, CLPs, SCADA) até o COI.

##### 1.1 Premissa técnica

O COI Forge roda no navegador e é publicado como site estático. Isso define o que é possível:

| Protocolo | Navegador consegue acessar direto? | Abordagem na v0.4 |
|---|---|---|
| **MQTT** | Sim, **somente via WebSocket** (`wss://`). MQTT sobre TCP puro (porta 1883/8883) não é acessível pelo navegador | Cliente MQTT no navegador, conectando a um broker com listener WebSocket |
| **OPC UA** | **Não.** O protocolo binário `opc.tcp` usa TCP direto, canal seguro próprio e certificados, que o navegador não suporta | **Gateway OPC UA** executado em servidor da rede, que lê o OPC UA e entrega JSON por WebSocket, REST e/ou MQTT |

Em nenhum dos casos o COI Forge escreve dados na automação: a integração é **somente leitura**.

#### 2. Escopo

##### 2.1 Incluído

| # | Entrega | Resumo |
|---|---|---|
| E1 | **Playlists por tela** | Cada tela do videowall recebe uma lista de conteúdos (página ou widget), cada um com duração própria, exibidos em sequência |
| E2 | **Layouts salvos** | Vários layouts de videowall com nome (ex.: “Operação normal”, “Contingência”, “Reunião de turno”); criar, duplicar, renomear, excluir e ativar |
| E3 | **Modelos de matriz** | Atalhos para 2×2, 3×2, 3×3, 4×2 e 4×3 ao criar um layout |
| E4 | **Rotação de páginas no dashboard** | Alternância automática entre páginas selecionadas no modo apresentação, com pausa quando alguém interage |
| E5 | **Modo TV por link** | Endereço que abre direto o videowall em tela de TV (`?tv=1&layout=<id>`), sem menu, para uso em quiosque |
| E6 | **Tela sempre ligada** | Pedido ao navegador para não apagar a tela durante o modo TV (Wake Lock), quando disponível |
| E7 | **Configuração v4** | Novo formato, migração automática da v3 e validador atualizado |
| E8 | **Fonte MQTT** | Conector MQTT 3.1.1 sobre WebSocket, sem dependências: assinatura de tópicos com curingas, conversão da árvore de tópicos em JSON, retidos, reconexão e tempo de atualização por tópico |
| E9 | **Gateway OPC UA** | Serviço Node.js separado (pasta `bridge/`, única exceção à estrutura de arquivo único) que se conecta ao servidor OPC UA, monitora as variáveis configuradas e publica o resultado por WebSocket, REST e MQTT |
| E10 | **Fonte “OPC UA (via gateway)”** | Tipo de fonte que se conecta ao gateway e mostra duas saúdes: navegador ↔ gateway e gateway ↔ servidor OPC UA |
| E11 | **Qualidade do dado** | Widgets reconhecem `quality` (boa, incerta, ruim) vinda do OPC UA ou do MQTT e sinalizam valor não confiável |
| E12 | **Ambiente de laboratório** | `docker compose` com broker Mosquitto (WebSocket) e simulador OPC UA para testar sem equipamento real |

##### 2.2 Fora do escopo (candidatos para versões seguintes)

- Mesclar telas (um conteúdo ocupando 2×2 telas da matriz).
- Agenda de layouts por horário ou turno.
- Sincronização entre vários computadores alimentando partes do mesmo videowall.
- Controle remoto do videowall a partir de outra estação.
- Testes automatizados de navegador (avaliar na v0.5, com GitHub Actions).
- **Escrita** em MQTT ou OPC UA (comandos, setpoints, reconhecimento no equipamento). A v0.4 é somente leitura.
- MQTT 5.0 (propriedades, aliases de tópico). A v0.4 usa MQTT 3.1.1, suportado por todos os brokers comuns.
- **Sparkplug B** (payload binário Protobuf). Pode ser consumido depois de convertido para JSON pelo broker ou por um serviço intermediário.
- OPC UA PubSub com codificação binária (UADP). A codificação JSON sobre MQTT é aceita pela fonte MQTT como JSON comum (seção 6.3).
- Alarmes e eventos OPC UA (Alarms & Conditions) e leitura de histórico (HDA). A v0.4 lê apenas valores atuais de variáveis.
- Modbus, Profinet, EtherNet/IP e protocolos proprietários. Continuam dependendo da camada de integração ou de um gateway que os converta para MQTT/OPC UA.

#### 3. Situação atual (v0.3)

| Ponto | Implementação atual | Limitação |
|---|---|---|
| Modelo | `videowall = { rows, cols, labels, tiles: [{ source }] }` | Um layout só; uma fonte por tela |
| Renderização | `Views.videowall()` monta a matriz; `fitStages()` escala o conteúdo para 16:9 | Re-renderiza a matriz inteira a cada alteração |
| Modo TV | Botão chama `requestFullscreen()` na moldura | Exige clique (regra do navegador); não há link direto |
| Dashboard | Troca de página só manual | Sem rotação |
| Temporizadores | `setInterval` de 1 s para relógios e indicadores ao vivo (seção `App`) | Já existe um ciclo de 1 s que pode ser reaproveitado |
| Fontes | `simulated`, `rest`, `websocket`; cada mensagem substitui o payload inteiro | Não há atualização parcial (necessária para MQTT, em que cada tópico chega separado) |
| Atualização | Tempo da última leitura controlado **por fonte** | Em MQTT, um tópico pode parar enquanto outros continuam; o selo “Desatualizado” precisa ser por tópico |
| Qualidade | Só existe o valor | Não há como indicar que o valor veio com qualidade ruim do equipamento |

#### 4. Modelo de dados (version 4)

##### 4.1 Estrutura

```json
{
  "version": 4,
  "videowall": {
    "activeLayout": "operacao-normal",
    "layouts": [
      {
        "id": "operacao-normal",
        "name": "Operação normal",
        "rows": 2,
        "cols": 3,
        "labels": true,
        "tiles": [
          {
            "items": [
              { "source": "page:operacao", "duration": 30 },
              { "source": "page:executivo", "duration": 20 }
            ]
          },
          { "items": [{ "source": "widget:operacao:op-line-1", "duration": 30 }] }
        ]
      }
    ]
  },
  "rotation": {
    "enabled": false,
    "pages": ["operacao", "executivo"],
    "interval": 30,
    "resumeAfter": 60
  }
}
```

##### 4.2 Regras

| Campo | Regra |
|---|---|
| `layouts` | mínimo 1, máximo 20; `id` único |
| `activeLayout` | deve existir em `layouts`; se não existir, usa o primeiro |
| `rows` / `cols` | 1–4 / 1–6 (mantém v0.3) |
| `tiles[].items` | mínimo 1, máximo 12 itens por tela |
| `items[].source` | `page:<id>`, `widget:<página>:<widget>` ou `none` |
| `items[].duration` | 5–3.600 segundos; ignorada quando a tela tem um item só |
| `rotation.pages` | ids existentes; mínimo 2 para a rotação ter efeito |
| `rotation.interval` | 10–3.600 segundos |
| `rotation.resumeAfter` | 10–600 segundos sem interação para retomar |

##### 4.3 Novas fontes

```json
{
  "sources": [
    {
      "id": "mqtt-unidade-a",
      "name": "Broker MQTT — Unidade A",
      "type": "mqtt",
      "url": "wss://broker.exemplo.com.br:8884/mqtt",
      "topics": ["coi/unidade-a/#"],
      "baseTopic": "coi/unidade-a",
      "format": "auto",
      "username": "coi-leitura",
      "staleAfter": 60,
      "enabled": true
    },
    {
      "id": "opcua-gw",
      "name": "OPC UA — SCADA Unidade A (gateway)",
      "type": "opcua-gateway",
      "url": "wss://gateway-coi.exemplo.com.br/ws",
      "staleAfter": 30,
      "enabled": true
    }
  ]
}
```

| Campo | Regra |
|---|---|
| `type` | `simulated`, `rest`, `websocket`, `mqtt`, `opcua-gateway` |
| `url` (mqtt) | `wss://` (ou `ws://localhost` para testes) |
| `topics` | 1 a 50 filtros; curingas `+` e `#` conforme MQTT 3.1.1; `#` isolado (todo o broker) é recusado |
| `baseTopic` | opcional; prefixo removido dos tópicos antes de montar o JSON |
| `format` | `auto` (JSON → número → texto), `json`, `number` ou `text` |
| `username` | opcional; **a senha nunca faz parte da configuração** (seção 6.4) |
| `password` | **proibido** no JSON; o validador recusa o arquivo |

##### 4.4 Migração v3 → v4

Executada em `Store.normalize()`, sem perda de conteúdo:

```text
v3: videowall { rows, cols, labels, tiles: [{ source }] }
                          │
                          ▼
v4: videowall {
      activeLayout: "principal",
      layouts: [{ id: "principal", name: "Layout principal",
                  rows, cols, labels,
                  tiles: [{ items: [{ source, duration: 30 }] }] }]
    }
    rotation: { enabled: false, pages: [todas as páginas], interval: 30, resumeAfter: 60 }
```

- Chave de armazenamento passa para `coi-forge:state:v4`; leitura de `v3` e `v2` mantida como legado.
- Arquivos v2 e v3 importados são convertidos na hora.
- Referências a páginas ou widgets excluídos viram `none` (mesmo comportamento atual).

#### 5. Arquitetura

##### 5.0 Visão geral com as novas fontes

```text
 Campo / automação
 ┌──────────┐  ┌────────────┐  ┌──────────┐
 │ Sensores │  │ CLPs       │  │ SCADA    │
 └────┬─────┘  └─────┬──────┘  └────┬─────┘
      │ MQTT (TCP)   │ OPC UA        │ OPC UA
      ▼              ▼               ▼
 ┌──────────────┐  ┌────────────────────────────┐
 │ Broker MQTT  │◄─┤ Gateway OPC UA (bridge/)    │
 │ listener WSS │  │ node-opcua · somente leitura│
 └──────┬───────┘  └──────┬─────────────────────┘
        │ MQTT/WSS        │ WebSocket / REST (JSON)
 ───────┼─────────────────┼────────── fronteira OT / TI (DMZ) ──
        ▼                 ▼
 ┌──────────────────────────────────────────────┐
 │ COI Forge (navegador)                        │
 │ DataHub: rest · websocket · mqtt · opcua-gw  │
 └──────────────────────────────────────────────┘
```

O broker e o gateway ficam na **rede de automação ou em uma DMZ**, e só a porta WSS (ou HTTPS) é liberada para as estações do COI. Os equipamentos nunca ficam acessíveis diretamente a partir das estações ou da internet.

##### 5.1 Nova seção `Wall` no `index.html`

Responsável pelo cálculo de qual conteúdo cada tela deve mostrar e pela rotação do dashboard. Não manipula o DOM diretamente; devolve decisões para a seção `App`.

```text
           ciclo de 1 s (já existente na seção App)
                         │
                         ▼
        Wall.tick(now) ── calcula item atual de cada tela
                         │
          mudou o item?  │  não → nada a fazer
                         ▼  sim
        App troca só aquela tela (transição suave) → fitStages() só da tela
```

**Cálculo baseado em tempo, não em contador.** O item atual de cada tela é calculado a partir do horário de início do ciclo:

```text
total   = soma das durações da playlist
posição = (agora − início) mod total
item    = primeiro item cuja duração acumulada ultrapassa a posição
```

Vantagens:
- se o navegador atrasar temporizadores (aba em segundo plano, máquina lenta), a tela se corrige sozinha na próxima verificação;
- todas as telas que começaram juntas ficam sincronizadas;
- não há um temporizador por tela.

**API prevista:**

| Função | Uso |
|---|---|
| `Wall.layout(state)` | Retorna o layout ativo (com tratamento de id inválido) |
| `Wall.start(layout, now)` | Marca o início do ciclo |
| `Wall.current(tile, now)` | Retorna `{ index, item, remaining }` |
| `Wall.tick(state, now)` | Lista de telas cujo item mudou desde a última verificação |
| `Wall.templates` | Modelos de matriz (2×2, 3×2, 3×3, 4×2, 4×3) |
| `Wall.rotation.*` | Próxima página, pausa por interação, retomada |

##### 5.2 Alterações nas seções existentes

Todas as seções abaixo ficam dentro do `index.html`, exceto as indicadas.

| Seção / arquivo | Alteração |
|---|---|
| `Store` | Migração v3→v4, normalização de layouts/playlists/rotação, chave `v4` |
| Configuração padrão (`#coi-defaults`) | `version: 4`; dois layouts de exemplo (“Operação normal” 2×3 com playlists e “Reunião de turno” 2×2) |
| `Views` | Barra de layouts; telas com indicador de playlist (ex.: “2/3 · 12 s”); editor de playlist; controles de rotação em Configurações |
| `App` | Integração com `Wall.tick` no ciclo de 1 s; troca individual de telas; leitura dos parâmetros da URL; modo TV; Wake Lock; pausa por interação |
| Estilos (`<style>`) | Barra de layouts, editor de playlist, barra de progresso, transição entre conteúdos, modo TV sem menu |
| Cabeçalho do `index.html` | Novas seções `Wall` e `MQTT`; versão `v0.4.0` |
| `DataHub` | Tipos `mqtt` e `opcua-gateway`; `merge`, tempo por caminho, agrupamento de mensagens e limites (seção 5.5) |
| `MQTT` *(nova seção)* | Cliente MQTT 3.1.1 sobre WebSocket, somente leitura (seção 6.1) |
| `Widgets` | Leitura de `quality` / `status` nos valores vinculados (seção 6.5) |
| `bridge/` *(nova pasta)* | Gateway OPC UA, mapeamento, Dockerfile e ambiente de laboratório (seções 6.2 e 6.6) |
| `coi-tools.mjs` | Validador com as regras da seção 4.2 (aceita v2/v3 com aviso); novos comandos `testar wall` e `testar mqtt`; exemplos v4 |

##### 5.3 Atualização seletiva das telas

Hoje qualquer mudança no videowall chama `render()` e reconstrói a matriz inteira. Na v0.4:

- troca de item → atualiza **apenas** o conteúdo daquela tela e chama o ajuste de escala só dela;
- mudança de layout, matriz ou rótulos → `render()` completo (como hoje);
- atualizações de dados ao vivo (v0.3) continuam chegando pelo mesmo mecanismo, pois os widgets mantêm `data-page` e `data-id`.

##### 5.4 Páginas externas (iframe) em playlists

Trocar o conteúdo da tela recria o iframe e força o recarregamento do painel externo (Power BI, Grafana) a cada volta.

**Decisão:** quando uma playlist tiver um item do tipo página externa, os itens da tela são montados uma vez e alternados por visibilidade (exibe/oculta), com limite de 4 itens montados por tela. Acima disso, volta ao comportamento de recriar.

##### 5.5 Atualização parcial e tempo por caminho (DataHub)

Para suportar MQTT, o `DataHub` passa a aceitar atualizações parciais além do payload completo:

| Função nova | Uso |
|---|---|
| `merge(sourceId, path, value, ts, quality)` | Grava o valor em um ponto da árvore sem substituir o restante |
| `stamp(sourceId, path)` | Retorna horário e qualidade da última atualização daquele caminho (ou do caminho pai mais próximo) |

- REST e WebSocket continuam substituindo o payload inteiro (comportamento da v0.3).
- MQTT e gateway OPC UA usam `merge`.
- O selo do widget passa a usar o tempo **do caminho vinculado**; se não houver registro do caminho, usa o tempo da fonte (comportamento atual).
- **Agrupamento de mensagens:** mensagens recebidas são acumuladas e entregues aos widgets no máximo a cada 250 ms. Isso evita redesenhar a tela a cada mensagem quando o broker publica dezenas de valores por segundo.
- **Limites por fonte:** até 2.000 valores (folhas) na árvore e 256 KB por mensagem. Acima disso, a mensagem é descartada e a fonte mostra o aviso.

#### 6. Conectividade industrial

##### 6.1 Fonte MQTT (navegador)

**Implementação:** cliente MQTT 3.1.1 próprio na seção `MQTT` do `index.html`, sobre WebSocket com subprotocolo `mqtt`, sem bibliotecas externas (mantém a premissa de zero dependências). Escopo **somente leitura**:

| Pacote MQTT | Uso |
|---|---|
| CONNECT / CONNACK | Conexão com sessão limpa, keep-alive de 30 s, `clientId` gerado (`coi-forge-<aleatório>`) |
| SUBSCRIBE / SUBACK | Assinatura dos filtros configurados com QoS 1 (o broker pode conceder 0) |
| PUBLISH (recebido) | Leitura de mensagens QoS 0 e 1; envio de PUBACK para QoS 1 |
| PINGREQ / PINGRESP | Manutenção da conexão; sem resposta em 2 keep-alives → reconecta |
| DISCONNECT | Ao desativar ou excluir a fonte |

O cliente **não publica** mensagens. Se o desenvolvimento do cliente próprio se mostrar inviável, a alternativa é a biblioteca MQTT.js incluída localmente como arquivo `mqtt.min.js` na raiz (sem CDN), registrada como exceção à premissa de arquivo único e zero dependências.

**Conversão de tópicos em JSON** (com `baseTopic: "coi/unidade-a"`):

```text
coi/unidade-a/operacao/disponibilidade   98.7
coi/unidade-a/silo03/temperatura         {"value": 23.4, "quality": "good"}
coi/unidade-a/alarmes                    [{"nivel":"critical","descricao":"..."}]
```

```json
{
  "operacao": { "disponibilidade": 98.7 },
  "silo03":   { "temperatura": { "value": 23.4, "quality": "good" } },
  "alarmes":  [ { "nivel": "critical", "descricao": "..." } ]
}
```

O vínculo do widget continua igual ao da v0.3: fonte + caminho (ex.: `silo03.temperatura`).

**Comportamentos:**
- **Mensagens retidas** do broker preenchem os widgets logo após conectar.
- **Mensagem vazia** em um tópico retido remove aquele valor da árvore (convenção MQTT para limpar retidos).
- Níveis de tópico com caracteres que conflitam com o caminho (`.`, `[`, `]`) são convertidos para `_`.
- **Ver dados** mostra também a lista de tópicos recebidos, com horário e quantidade de mensagens.
- Reconexão com espera progressiva de 1 s a 30 s, como no WebSocket da v0.3.

**Requisitos do broker:** listener WebSocket com TLS (`wss://`); usuário específico do COI com permissão **apenas de leitura** e restrita aos tópicos do COI (ACL); se o COI Forge estiver no GitHub Pages ou em outro domínio, o broker deve aceitar a origem.

##### 6.2 Gateway OPC UA (`bridge/`)

Serviço Node.js **separado da aplicação**, executado em um servidor com acesso à rede de automação. É o único componente do projeto com dependência externa (`node-opcua`), isolada na pasta `bridge/` com `package.json` próprio. A aplicação web continua sem dependências.

**Fluxo:**

```text
Servidor OPC UA ──(opc.tcp, assinatura de variáveis)──► Gateway ──► WebSocket /ws   (fonte "OPC UA via gateway")
                                                               ├──► REST /api/snapshot  (fonte REST)
                                                               └──► MQTT (opcional)     (fonte MQTT)
```

**Arquivo de mapeamento** `bridge/opcua-map.json`:

```json
{
  "endpoint": "opc.tcp://scada-unidade-a:4840",
  "securityMode": "SignAndEncrypt",
  "securityPolicy": "Basic256Sha256",
  "publishInterval": 1000,
  "items": [
    { "nodeId": "ns=2;s=Silo03.Temperatura", "path": "silo03.temperatura", "samplingInterval": 1000 },
    { "nodeId": "ns=2;s=Linha01.Producao",   "path": "operacao.producaoAtual", "samplingInterval": 1000 },
    { "nodeId": "ns=2;s=Linha01.Disponibilidade", "path": "operacao.disponibilidade", "samplingInterval": 5000 }
  ],
  "outputs": {
    "websocket": { "port": 8790 },
    "rest": { "port": 8790 },
    "mqtt": { "url": "mqtts://broker:8883", "baseTopic": "coi/unidade-a" }
  }
}
```

Usuário e senha do OPC UA e do broker ficam em **variáveis de ambiente** (`.env`), nunca no arquivo de mapeamento. A pasta `bridge/` terá um `.gitignore` próprio para impedir o commit do `.env` e dos certificados.

**Funcionalidades do gateway:**

| Função | Detalhe |
|---|---|
| Assinatura (subscription) | Uma assinatura com itens monitorados; só envia o que mudou |
| Formato de saída | Cada valor como `{ "value", "quality", "ts" }`; qualidade derivada do StatusCode OPC UA (`good`, `uncertain`, `bad`) |
| Instantâneo inicial | Ao conectar, o cliente WebSocket recebe o estado completo; depois, apenas mudanças agrupadas por `publishInterval` |
| Saúde do gateway | Campo `_gateway` em cada mensagem: status da conexão OPC UA, endpoint, último erro, itens com qualidade ruim |
| Reconexão | Reconexão automática ao servidor OPC UA e recriação da assinatura |
| Descoberta de variáveis | `node bridge/opcua-bridge.mjs --browse <nodeId>` lista os nós e gera um rascunho de `opcua-map.json` |
| Segurança | `None` permitido **apenas** com `--lab`; certificados do cliente gerados na primeira execução e confiados no servidor OPC UA pelo administrador |
| Somente leitura | Nenhuma chamada de escrita ou de método no servidor OPC UA |
| Conteinerização | `bridge/Dockerfile` para execução como serviço |

##### 6.3 Fonte “OPC UA (via gateway)” no navegador

Tecnicamente é uma conexão WebSocket ao gateway, com tratamento próprio:

- Card da fonte mostra **duas saúdes**: navegador ↔ gateway e gateway ↔ servidor OPC UA (lida do campo `_gateway`).
- Se o gateway estiver conectado mas o servidor OPC UA cair, os widgets mostram “Sem dados do OPC UA”, e não “Ao vivo”.
- **Ver dados** mostra o `nodeId` de origem de cada caminho, quando enviado pelo gateway.
- Usa `merge` e tempo por caminho (seção 5.5).

**OPC UA PubSub sobre MQTT:** servidores que já publicam OPC UA PubSub com codificação **JSON** em um broker podem ser lidos pela fonte MQTT, sem gateway. O caminho do widget segue a estrutura da mensagem publicada (ex.: `Messages.0.Payload.Temperatura.Value`). Não há tratamento específico nesta versão.

##### 6.4 Credenciais no navegador

Brokers MQTT normalmente exigem usuário e senha, mas a configuração do COI Forge fica no navegador e é exportada para o repositório.

**Decisão:**
- `username` pode ficar na configuração; **a senha não**.
- A senha é pedida ao conectar e guardada **somente neste navegador**, em uma chave separada (`coi-forge:secrets`), opcionalmente (“Lembrar neste navegador” — necessário para o computador do videowall).
- Exportar JSON **nunca** inclui senhas; importar um JSON com `password` é recusado.
- O validador recusa `password`, `token` e similares em qualquer fonte.
- Recomendação: usuário dedicado do COI no broker, **somente leitura**, restrito aos tópicos do COI. Para ambientes que não aceitam senha no navegador, usar o gateway com autenticação pela rede corporativa (proxy ou SSO).

##### 6.5 Qualidade do dado

| Qualidade recebida | Selo do widget | Aparência |
|---|---|---|
| `good` ou ausente | Ao vivo | Normal |
| `uncertain` | Qualidade incerta | Borda amarela, valor mantido |
| `bad` | Qualidade ruim | Borda vermelha, valor esmaecido |

- Reconhecida quando o valor é um objeto com `quality`/`qualidade` (formato do gateway) ou `status` numérico OPC UA (0 = bom).
- Funciona para qualquer fonte que envie esse formato, inclusive REST e WebSocket.
- A qualidade não altera a regra de tempo: um valor pode estar “ao vivo” e com qualidade ruim.

##### 6.6 Ambiente de laboratório (`bridge/lab/`)

`docker compose up` sobe:

| Serviço | Imagem | Uso |
|---|---|---|
| Broker MQTT | `eclipse-mosquitto` | Porta 1883 (TCP) e 9001 (WebSocket), usuário somente leitura de exemplo |
| Simulador OPC UA | simulador OPC PLC (`mcr.microsoft.com/iotedge/opc-plc`) | Variáveis com valores variando, para testar o gateway |
| Gateway | `bridge/Dockerfile` | Lê o simulador e publica no WebSocket e no broker |

Mais o comando `node coi-tools.mjs exemplo lab`, que gera a configuração do COI Forge já apontando para o broker e o gateway do laboratório. O ambiente de laboratório usa `ws://localhost` e `SecurityMode None` e **não deve ser usado em produção**.

#### 7. Interface

##### 7.1 Videowall

```text
┌──────────────────────────────────────────────────────────────────────────┐
│ Layout: [Operação normal ▾]  ＋ Novo  Duplicar  Renomear  Excluir        │
│ Matriz: [2]×[3]  ☑ Identificar telas  Modelos: 2×2 3×2 3×3 4×2 4×3  ▶ TV │
├──────────────────────────────────────────────────────────────────────────┤
│ ┌ TV 01 · Operação ─── 1/2 · 18 s ┐ ┌ TV 02 ───────────┐ ┌ TV 03 ───────┐ │
│ │                                  │ │                  │ │              │ │
│ │▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔ (progresso) │ │                  │ │              │ │
│ └──────────────────── [⚙ Playlist]┘ └──────────────────┘ └──────────────┘ │
└──────────────────────────────────────────────────────────────────────────┘
```

- **Seletor de layout:** troca imediata; o layout ativo fica salvo.
- **Modelos:** ao aplicar um modelo em um layout já preenchido, pede confirmação; telas que continuam existindo mantêm a playlist.
- **Tela com playlist:** rótulo mostra posição e tempo restante; barra fina de progresso na base (oculta no modo TV, configurável).
- **⚙ Playlist** (painel lateral): lista de itens com fonte, duração, mover para cima/baixo, remover e “＋ Adicionar conteúdo”.
- O seletor rápido atual (um `select` por tela) é mantido para telas de item único.

##### 7.2 Dashboard — rotação de páginas

- Em **Configurações → Rotação de páginas**: ativar, escolher páginas (caixas de seleção), intervalo e tempo para retomar.
- Durante a rotação: indicador discreto na barra superior (“Rotação · Executivo em 12 s”) com botão pausar/retomar.
- Qualquer clique, rolagem ou tecla pausa a rotação; ela volta sozinha após `resumeAfter` segundos sem interação.
- A rotação não funciona no modo de edição.

##### 7.3 Modo TV por link

| Parâmetro | Efeito |
|---|---|
| `?tv=1` | Abre o videowall do layout ativo ocupando a janela, sem menu, barra superior ou seletores |
| `&layout=<id>` | Abre um layout específico (sem alterar o layout ativo salvo) |
| `?view=dashboard&rotate=1` | Abre o dashboard em modo apresentação com rotação ligada |

- Pressionar `Esc` ou mover o mouse mostra por 3 s um botão discreto “Sair do modo TV”.
- O navegador não permite entrar em tela cheia sem clique. Para o computador do videowall, a recomendação é abrir o navegador em modo quiosque, por exemplo:

```bash
chrome --kiosk "https://<usuario>.github.io/coi/?tv=1&layout=operacao-normal"
```

- **Tela sempre ligada:** no modo TV, solicitar `navigator.wakeLock.request("screen")`; refazer o pedido quando a aba voltar a ficar visível. Se o navegador não suportar, seguir normalmente (sem erro).

##### 7.4 Configuração no computador do videowall

A configuração continua salva por navegador. Para o computador do videowall usar o mesmo layout:

1. Montar o layout em uma estação e **Exportar JSON**.
2. Salvar o arquivo no repositório (ex.: `coi-videowall.json` na raiz) e validar com `node coi-tools.mjs validar coi-videowall.json`.
3. No computador do videowall, **Importar JSON** uma vez.

Carregar a configuração direto por URL (`?config=coi-videowall.json`) fica como item opcional (seção 10, tarefa T12), pois depende de definir regras de confiança para arquivos externos.

#### 8. Critérios de aceite

| # | Critério |
|---|---|
| A1 | Uma tela com 3 itens (10 s, 20 s, 30 s) alterna na ordem e volta ao primeiro após 60 s, com desvio máximo de 1 s |
| A2 | Com a aba em segundo plano por 2 min, ao voltar as telas mostram o item correto para o horário atual, sem acumular trocas |
| A3 | Trocar o item de uma tela não recarrega as demais telas nem a página |
| A4 | Widgets vinculados a fontes continuam mostrando “Ao vivo” dentro das playlists |
| A5 | Criar, duplicar, renomear, excluir e ativar layouts funciona e persiste após recarregar a página; não é possível excluir o último layout |
| A6 | Aplicar um modelo 3×3 em um layout 2×3 mantém as playlists das 6 telas existentes |
| A7 | `?tv=1&layout=<id>` abre direto o layout indicado, sem menu; id inexistente abre o layout ativo e mostra aviso |
| A8 | A rotação do dashboard pausa ao clicar e retoma após o tempo configurado |
| A9 | Uma configuração v3 (salva no navegador ou importada) é convertida sem perder telas, páginas, widgets nem fontes |
| A10 | `node coi-tools.mjs validar` aceita os exemplos v4 e acusa duração fora da faixa, layout ativo inexistente e item apontando para widget excluído |
| A11 | Sem erros no console em desktop (1440 px), celular (360 px), tema claro e escuro |
| A12 | Videowall 4×6 com playlists em todas as telas roda 10 min sem aumento contínuo de memória na aba |
| A13 | Fonte MQTT conecta em `wss://` (e `ws://localhost`), assina `coi/unidade-a/#` e preenche os widgets com as mensagens retidas em até 2 s |
| A14 | Um tópico que para de publicar deixa **apenas** os widgets ligados a ele como “Desatualizado”; os demais da mesma fonte seguem “Ao vivo” |
| A15 | Com 200 mensagens por segundo no broker, a tela continua responsiva e redesenha no máximo 4 vezes por segundo |
| A16 | Queda do broker → selo de erro e reconexão automática; ao voltar, os valores retidos são recuperados |
| A17 | A senha MQTT não aparece no JSON exportado nem no `localStorage` da configuração; JSON com `password` é recusado na importação e no validador |
| A18 | Gateway lê 50 variáveis do simulador OPC UA e o navegador mostra os valores com atraso menor que 2 s em relação ao intervalo de amostragem |
| A19 | Desligar o simulador OPC UA com o gateway ativo: o card da fonte mostra “Gateway online · OPC UA desconectado” e os widgets saem de “Ao vivo” |
| A20 | Variável com StatusCode ruim aparece com selo “Qualidade ruim” e valor esmaecido |
| A21 | Gateway recusa `SecurityMode None` sem a opção `--lab` |
| A22 | Nenhuma escrita é enviada ao broker (nenhum PUBLISH do navegador) nem ao servidor OPC UA, verificado no log do broker e do gateway |

#### 9. Plano de testes

| Tipo | Como |
|---|---|
| Sintaxe | `node --check coi-tools.mjs` e abertura do `index.html` sem erros no console |
| Configuração | `node coi-tools.mjs verificar` (padrão do `index.html` e exemplos gerados), incluindo um caso v3 de regressão |
| Cálculo da playlist | Casos de `Wall.current()` com tempos fixos (início, meio, virada, várias voltas, item único, duração inválida) — comando `node coi-tools.mjs testar wall`, sem navegador |
| Manual — videowall | Roteiro dos critérios A1–A8 com `node coi-tools.mjs servidor` |
| Manual — MQTT | Critérios A13–A17 no ambiente de laboratório (Mosquitto) |
| Manual — regressão v0.3 | Fontes REST/WebSocket, “Desatualizado”, editor de widgets, arrastar e redimensionar |
| Desempenho | A12 com a ferramenta de desempenho do navegador (memória da aba) |
| Cliente MQTT | Casos de codificação/decodificação de pacotes (CONNECT, SUBSCRIBE, PUBLISH com tamanho variável, PUBACK) e de correspondência de curingas `+`/`#` — comando `node coi-tools.mjs testar mqtt` |
| Árvore de tópicos | Conversão tópico → caminho, `baseTopic`, mensagem vazia removendo valor, limites de tamanho |
| Gateway OPC UA | Execução contra o simulador do laboratório (A18–A22) |
| Laboratório | `docker compose up` em `bridge/lab/` + `node coi-tools.mjs exemplo lab` |

Nenhum arquivo novo de teste: os casos entram como comandos `testar wall` e `testar mqtt` do `coi-tools.mjs` e passam a fazer parte de `node coi-tools.mjs verificar`, que deve ser executado antes de cada commit. O gateway é testado à parte, pois depende do simulador. Se for necessário bloquear commits com erro, um workflow do GitHub Actions pode ser reativado chamando `verificar` (opcional).

#### 10. Tarefas

Tamanho: **P** (pequena), **M** (média), **G** (grande).

| # | Tarefa | Arquivos | Tamanho | Depende de |
|---|---|---|---|---|
| T1 | Modelo v4, normalização e migração v3→v4 | `Store`, `#coi-defaults` | M | — |
| T2 | Validador v4 e exemplos atualizados | `coi-tools.mjs` | P | T1 |
| T3 | Seção `Wall` (cálculo da playlist, modelos, rotação) | `Wall` | M | T1 |
| T4 | Testes de cálculo da playlist (`testar wall`) | `coi-tools.mjs` | P | T3 |
| T5 | Atualização seletiva das telas e ajuste de escala por tela | `App`, `Views` | M | T3 |
| T6 | Barra de layouts e modelos de matriz | `Views`, `App`, estilos | M | T1 |
| T7 | Editor de playlist e indicadores de progresso | `Views`, `App`, estilos | G | T5 |
| T8 | Iframes mantidos montados em playlists | `App`, `Views` | M | T5 |
| T9 | Rotação de páginas do dashboard | `Wall`, `App`, `Views` | M | T3 |
| T10 | Modo TV por link e botão de saída | `App`, estilos | M | T5 |
| T11 | Tela sempre ligada (Wake Lock) | `App` | P | T10 |
| T12 | *(Opcional)* Carregar configuração por URL | `App`, `Store` | M | T1 |
| T14 | `DataHub`: `merge`, tempo por caminho, agrupamento de mensagens e limites | `DataHub`, `App` | M | T1 |
| T15 | Cliente MQTT 3.1.1 sobre WebSocket (somente leitura) + testes (`testar mqtt`) | `MQTT`, `coi-tools.mjs` | G | — |
| T16 | Fonte MQTT: formulário, árvore de tópicos, “Ver dados” com tópicos | `DataHub`, `App`, `Views` | M | T14, T15 |
| T17 | Senhas fora da configuração (`coi-forge:secrets`) e bloqueio na importação/validador | `Store`, `App`, `coi-tools.mjs` | P | T16 |
| T18 | Qualidade do dado nos widgets | `Widgets`, `App`, estilos | P | T14 |
| T19 | Gateway OPC UA: conexão, assinatura, saídas WebSocket/REST/MQTT, saúde, `--browse` | `bridge/` | G | — |
| T20 | Fonte “OPC UA (via gateway)” com dupla saúde | `DataHub`, `Views` | P | T14, T19 |
| T21 | Ambiente de laboratório (Mosquitto, simulador OPC UA, gateway) e exemplo de configuração (`exemplo lab`) | `bridge/lab/`, `coi-tools.mjs` | M | T19 |
| T22 | Garantir que `bridge/` não publique nada sensível no GitHub Pages (publicação pela branch envia todos os arquivos): sem `.env`, certificados ou mapeamentos reais versionados; `.gitignore` dentro de `bridge/` | `bridge/` | P | T19 |
| T13 | Documentação, changelog e versão `v0.4.0` (novas seções “Conectividade industrial” e “Videowall” no README) | `README.md`, `index.html` | P | todas |

##### Sequência sugerida

As etapas 4 e 5 não dependem do videowall (etapas 2 e 3) e podem ser feitas em paralelo. T15 (cliente MQTT) e T19 (gateway) também podem começar logo no início.

```text
Etapa 1 — base         T1 → T2 → T3 → T4
Etapa 2 — videowall    T5 → T6 → T7 → T8
Etapa 3 — operação     T9 → T10 → T11
Etapa 4 — MQTT         T14 → T15 → T16 → T17 → T18
Etapa 5 — OPC UA       T19 → T20 → T21 → T22
Etapa 6 — fechamento   (T12) → T13 → testes de aceite
```

**Divisão opcional da entrega:** com MQTT e OPC UA o escopo praticamente dobra. Se for necessário entregar o videowall antes, as etapas 1–3 podem ser publicadas como **v0.4.0** e as etapas 4–5 como **v0.4.1** (MQTT) e **v0.4.2** (OPC UA), sem alterar o modelo de dados, que já nasce na v4 com os novos tipos de fonte.

Cada etapa deve terminar com a aplicação funcionando e pode virar um commit próprio:

- `feat(config): modelo v4 com layouts e playlists`
- `feat(wall): playlists por tela e layouts salvos`
- `feat(tv): modo TV por link, rotação de páginas e tela sempre ligada`
- `feat(mqtt): fonte MQTT sobre WebSocket com tempo por tópico`
- `feat(opcua): gateway OPC UA e fonte via gateway`
- `docs: v0.4.0`

#### 11. Riscos e mitigações

| Risco | Impacto | Mitigação |
|---|---|---|
| Navegador atrasa temporizadores em segundo plano | Telas fora de sincronia | Cálculo por horário (seção 5.1), não por contador |
| Recarregamento de painéis externos a cada troca | Tela em branco e consumo de rede | Manter iframes montados (seção 5.4) |
| Muitas telas com páginas inteiras escaladas | Lentidão no computador do videowall | Atualizar só a tela que mudou; medir com A12; recomendar widgets em vez de páginas inteiras em matrizes grandes |
| Tela cheia exige clique | Videowall não abre sozinho | Modo quiosque do navegador + `?tv=1` |
| Tela apaga por economia de energia | Videowall desligado | Wake Lock + orientar configuração de energia do sistema operacional |
| Configuração diferente em cada navegador | Videowall desatualizado | Processo de exportar/versionar/importar (seção 7.4); T12 opcional |
| Migração com dados inesperados | Perda de layout | Migração conservadora, caso v3 de regressão no `verificar`, critério A9 |
| Exposição da rede de automação | Incidente de segurança OT | Broker e gateway em DMZ; só WSS/HTTPS liberado para as estações; integração somente leitura; alinhamento com a área de TI/OT e com a ISA/IEC 62443 antes de produção |
| Senha do broker no navegador | Vazamento de credencial | Seção 6.4: senha fora da configuração e da exportação; usuário somente leitura com ACL restrita |
| Broker sem listener WebSocket ou sem TLS | Fonte MQTT não conecta (o GitHub Pages exige `wss://`) | Requisito documentado; laboratório mostra a configuração; alternativa: gateway publicando WebSocket |
| Volume alto de mensagens | Navegador lento no videowall | Agrupamento a cada 250 ms, limite de 2.000 valores por fonte, filtros de tópico específicos (sem `#` isolado) |
| Certificados OPC UA | Gateway não conecta ao servidor | Certificado gerado na primeira execução; passo a passo de confiança no servidor na seção “Conectividade industrial” do README |
| Dependência `node-opcua` | Manutenção e vulnerabilidades | Isolada em `bridge/`, versão fixada, revisão de atualizações a cada versão; aplicação web continua sem dependências |
| Cliente MQTT próprio com falhas | Mensagens perdidas ou desconexões | Escopo mínimo (3.1.1, somente leitura), testes de pacotes (`testar mqtt`), alternativa MQTT.js local (seção 6.1) |
| Escopo maior que a capacidade | Atraso da v0.4 | Divisão opcional em v0.4.0 / v0.4.1 / v0.4.2 (seção 10) |

#### 12. Definição de pronto

- Critérios A1–A22 atendidos.
- `node coi-tools.mjs verificar` passando (validador, testes da playlist e do cliente MQTT).
- Gateway OPC UA validado no ambiente de laboratório.
- Nova seção “Conectividade industrial” no README com requisitos do broker, configuração do gateway, certificados OPC UA, ACL de leitura e arquitetura de rede recomendada.
- README atualizado (arquitetura, roadmap, changelog) e nova seção “Videowall” com o guia de operação (layouts, playlists, modo TV, quiosque).
- Configuração padrão e exemplos em `version: 4`.
- Versão `v0.4.0` exibida na interface.

</details>

<details>
<summary><strong>Changelog</strong></summary>

#### [0.3.0] — 2026-10-28

Versão focada em **dados ao vivo**: os widgets passam a ser alimentados por fontes externas (REST e WebSocket) ou pelo simulador e mostram se a informação está atualizada.

##### Destaques
- Nova tela **Fontes de dados** para cadastrar e acompanhar conectores.
- Vínculo de cada widget a uma fonte e a um caminho no JSON.
- Selos **Ao vivo** / **Desatualizado** e destaque visual quando a fonte para de atualizar.
- Servidor local de teste com REST e WebSocket, sem dependências.
- Formato de configuração `version: 3`, com migração automática da v2.
- Repositório consolidado em **4 arquivos**: `index.html`, `coi-tools.mjs`, `README.md` e `LICENSE`.

##### Adicionado

###### Camada de dados (seção `DataHub`)
- Módulo `DataHub`, responsável por iniciar, parar e monitorar as fontes.
- Conector **REST (polling)**:
  - consulta a URL no intervalo configurado (1 a 3.600 s);
  - tempo limite de 8 s por requisição;
  - não dispara nova consulta enquanto a anterior estiver em andamento;
  - mensagens de erro em português (HTTP, JSON inválido, tempo esgotado, falha de conexão/CORS).
- Conector **WebSocket**:
  - cada mensagem recebida deve ser um JSON completo;
  - reconexão automática com espera progressiva de 1 s até 30 s.
- Conector **Simulador**: gera disponibilidade, eficiência, capacidade, produção, alarmes, status de integrações e paradas por área.
- Status por fonte: conectando, online, erro, pausada, desativada, com última atualização, número de leituras, latência e último erro.
- Regra de dado desatualizado: valor configurável por fonte; no modo automático, 3× o intervalo (mínimo de 15 s) para REST/simulador e 30 s para WebSocket.
- Teste de conexão sem afetar a fonte em execução.
- Leitura de caminhos no JSON com ponto e índice (`operacao.disponibilidade`, `alarmes.0.descricao`, `alarmes[0].descricao`) e listagem de até 300 caminhos disponíveis.

###### Tela “Fontes de dados”
- Novo item **Fontes de dados** no menu lateral.
- Resumo com fontes cadastradas, online, com erro ou sem atualização e widgets vinculados.
- Card por fonte com tipo, URL, status, última atualização, leituras, latência, limite de desatualização e widgets vinculados.
- Chave para ativar ou desativar cada fonte.
- Ações: **Ver dados**, **Testar**, **Editar** e **Excluir**.
- **Ver dados**: tabela de caminhos e valores e a última leitura completa em JSON.
- Formulário de fonte com nome, tipo, URL, intervalo, limite de desatualização e ativação, além de **Testar conexão** antes de salvar.
- Seção “Como vincular um widget” com o passo a passo.
- Atualização dos indicadores da tela a cada segundo.

###### Vínculo de widgets
- Seção **Fonte de dados** no editor do widget, com escolha da fonte, campo de caminho com sugestões e pré-visualização do valor atual.
- Mensagens de diagnóstico no editor: aguardando leitura, caminho não encontrado e formato incompatível.
- Conversões por tipo de widget:
  | Widget | Atualiza | Aceita |
  |---|---|---|
  | KPI, Medidor | valor | número ou objeto com `value`/`valor` |
  | Linha | série | lista de números (até 48) ou número (adiciona ponto, mantém 24) |
  | Barras | categorias e valores | lista de objetos, objeto `{categoria: número}` ou lista de números |
  | Alarmes | itens | lista de objetos `{nivel, descricao, hora}` (até 50) ou texto `nível|descrição|hora` |
  | Status | sistemas | lista de objetos `{sistema, status}` ou objeto `{sistema: status}` |
  | Tabela | linhas | lista de objetos (até 200) ou lista de listas |
  | Texto | conteúdo | texto ou número |
- Reconhecimento de nomes de campo em português e inglês (`nivel`/`level`, `descricao`/`text`, `sistema`/`name` etc.).
- Normalização de níveis de alarme (ex.: `alta`, `high` → crítico) e de status (ex.: `ok`, `ativo` → online; `falha`, `down` → offline).
- Horários em formato ISO convertidos para `hh:mm`.

###### Indicadores ao vivo
- Selo no cabeçalho de cada widget vinculado: **Ao vivo**, **Aguardando**, **Desatualizado**, **Sem conexão**, **Pausada**, **Fonte desativada** ou **Fonte removida**, com detalhes ao passar o mouse.
- Widget desatualizado fica com borda amarela e conteúdo esmaecido.
- Em cards estreitos, o selo mostra apenas “Desatualizado”, sem o tempo.
- No modo de edição, o selo mostra apenas o indicador colorido.
- Indicador **“X/Y fontes online”** na barra superior; ao clicar, abre a tela de fontes.

###### Ferramentas (`coi-tools.mjs`)
- `servidor [porta]` — serve a aplicação, `GET /api/coi` (com CORS) e `ws://localhost:8787/ws` (mensagem a cada 2 s); escuta apenas em `127.0.0.1`.
- `validar [arquivo.json]` — valida uma configuração exportada ou, sem arquivo, a configuração padrão embutida no `index.html`.
- `exemplo mock|3x3 [saida.json] [porta]` — gera configurações de exemplo para importar (servidor de teste; videowall 3 × 3).
- `verificar` — confere a sintaxe do código do `index.html` (substitui a checagem do antigo workflow), a configuração padrão e os exemplos, em memória; usar antes de cada commit.
- Mensagens de erro claras para arquivo inexistente, porta inválida ou já em uso.

##### Alterado
- **Formato da configuração:** `version: 3`, com `sources[]` e `binding` (`source`, `path`) nos widgets.
- **Configuração padrão:** fonte “Simulador COI” (3 s) com 12 widgets vinculados (9 na página Operação, 3 na página Executivo). O simulador também gera volume do mês, custo por tonelada e volume por unidade.
- KPI **Sistemas integrados** passa de `8/10` para `3/5`, coerente com as 5 integrações do exemplo.
- Widgets vinculados deixam de usar a variação local (“Simular variação”); o valor passa a vir da fonte.
- O botão **Simulação ativa/pausada** também pausa as fontes do tipo Simulador; REST e WebSocket continuam ativos.
- Texto da seção **Dados** em Configurações atualizado para explicar esse comportamento.
- Importar ou restaurar a configuração reinicia as fontes e limpa os estados ao vivo.
- Interface: novo item de menu, indicador de fontes na barra superior e versão `v0.3.0`.
- Estilos: estilos de fontes, selos, chave liga/desliga, formulários e JSON; regra global para `[hidden]`; no celular, o indicador mostra só o ponto colorido e o botão de tela cheia é ocultado.
- Validador: aceita v2 (com aviso) e v3; valida fontes, tipos, URLs, intervalos, ids duplicados, vínculos e tipos de widget vinculáveis.

##### Estrutura do repositório
- Repositório reduzido de 33 para 4 arquivos, sem perda de funcionalidade:

  | Antes | Agora |
  |---|---|
  | `index.html`, `assets/css/styles.css`, `assets/js/*.js` (6 arquivos), `assets/favicon.svg` | `index.html` (estilos, ícone, configuração padrão e código em seções) |
  | `assets/js/config.js`, `configs/default.json` | Bloco JSON `#coi-defaults` dentro do `index.html` |
  | `scripts/mock-server.mjs`, `scripts/validate-config.mjs`, `examples/*.json` | `coi-tools.mjs` (comandos `servidor`, `validar`, `exemplo`, `verificar`) |
  | `data/sample-live.json` e fonte “Arquivo de exemplo” | Dados equivalentes gerados pelo Simulador |
  | `docs/*.md`, `CHANGELOG.md`, `CONTRIBUTING.md`, `SECURITY.md`, `SOURCES.md`, READMEs de pastas | Seções do `README.md` |
  | `.github/workflows/pages.yml`, `.nojekyll`, `.gitignore` | Publicação pela branch (Settings → Pages → Deploy from a branch); `node coi-tools.mjs verificar` antes do commit |
- A aplicação passa a funcionar por completo ao abrir o `index.html` direto do disco, pois não depende mais de leitura de arquivo JSON.
- Configurações salvas no navegador que usavam a fonte “Arquivo de exemplo” são convertidas: a fonte é removida e os widgets passam para o Simulador.

##### Segurança
- Fontes aceitam apenas `https://`, `wss://`, caminhos relativos ou `localhost` para testes; esquemas como `javascript:` são bloqueados.
- Validador recusa URLs com parâmetros como `token=`, `key=`, `apikey=`, `password=`, `senha=` ou `secret=`.
- Formulário de fonte orienta a não incluir credenciais e a usar proxy para APIs autenticadas.
- Valores recebidos das fontes passam pelo mesmo escape de HTML do restante da aplicação.
- Nome e URL das fontes têm tamanho máximo (40 e 500 caracteres) e intervalos são limitados.
- Servidor de teste bloqueia acesso a arquivos fora da pasta do projeto.

##### Migração
- Configurações v2 salvas no navegador são lidas e convertidas automaticamente para v3.
- Arquivos v2 importados também são convertidos; recebem as fontes padrão, sem vínculos.
- Vínculos que apontam para fontes inexistentes são removidos.
- Excluir uma fonte desvincula os widgets, que mantêm os últimos valores recebidos.
- Nova chave de armazenamento: `coi-forge:state:v3`.

##### Documentação
- README único com: uso, ferramentas, integração (tipos de fonte, formato do payload, requisitos da API, autenticação, teste local), arquitetura e fluxo de dados, catálogo de widgets e formatos aceitos, roadmap, changelog, contribuição, segurança e referências.
- Plano técnico da v0.4 incluído no README: playlists por tela, layouts de videowall salvos, rotação de páginas, modo TV por link, tela sempre ligada, configuração v4, fonte MQTT sobre WebSocket, gateway OPC UA, qualidade do dado e ambiente de laboratório.

##### Limitações conhecidas
- Ao abrir `index.html` direto do disco (`file://`), fontes REST com caminho relativo não funcionam (bloqueio do navegador). O Simulador funciona normalmente; para REST e WebSocket use GitHub Pages ou `node coi-tools.mjs servidor`.
- Não há conexão direta com OPC UA, Modbus, MQTT ou CLPs; é necessária uma camada de integração que entregue JSON.
- Não há autenticação nas fontes; APIs protegidas exigem um proxy.
- Páginas em HTTPS não acessam fontes `http://` ou `ws://` externas (conteúdo misto).
- A latência é medida apenas em REST; no WebSocket aparece “—”.
- A configuração continua salva por navegador; para compartilhar, é necessário exportar o JSON.

##### Como atualizar
1. Enviar os 4 arquivos para a raiz do repositório.
2. Em **Settings → Pages**, escolher **Deploy from a branch**, branch `main`, pasta `/ (root)`.
3. Quem já usava a v0.2 no navegador terá a configuração migrada ao abrir o site.
4. Para testar dados ao vivo: `node coi-tools.mjs servidor`, `node coi-tools.mjs exemplo mock coi-mock.json`, acessar `http://localhost:8787` e importar o arquivo gerado.

#### [0.2.0] — 2026-10-28

##### Adicionado
- Biblioteca com 11 widgets: KPI, linha, barras, medidor, alarmes, status, tabela, texto, relógio, câmera e página externa.
- Editor visual: adicionar, configurar, duplicar, excluir, arrastar para reordenar e redimensionar widgets.
- Múltiplas páginas de dashboard (Operação, Executivo e Segurança como exemplo).
- Videowall configurável até 4 × 6 telas, com fonte por tela e modo TV em tela cheia.
- Tela de arquitetura com mapa de integração por camada e inventário editável.
- Tela de infraestrutura com inventário editável de equipamentos.
- Configurações de identidade, tema, cor de destaque e simulação.
- Importação e exportação da configuração em JSON.
- Validador `scripts/validate-config.mjs` e publicação automática no GitHub Pages.

##### Alterado
- Código separado em módulos (`config`, `store`, `widgets`, `views`, `app`).
- Novo layout com tema escuro padrão, adequado para salas de controle.

#### [0.1.0]

- Shell inicial com dashboard estático, tema claro/escuro e edição de títulos.

</details>

<details>
<summary><strong>Contribuição</strong></summary>

#### Fluxo

1. Crie uma branch a partir de `main` (`feat/nome-da-melhoria` ou `fix/descricao`).
2. Faça alterações pequenas e com um objetivo claro.
3. Teste no navegador: desktop, tela estreita (≤ 600 px), tema claro e escuro, modo de edição e videowall.
   Para mudanças em fontes de dados, rode `node coi-tools.mjs servidor` e valide REST, WebSocket e o estado “Desatualizado”.
4. Rode `node coi-tools.mjs verificar` (valida a configuração padrão do `index.html` e os exemplos).
5. Abra um Pull Request descrevendo o impacto visual e funcional, com captura de tela quando houver mudança de layout.

#### Padrões

- HTML, CSS e JavaScript sem frameworks ou dependências externas.
- Textos da interface em português.
- Todo conteúdo informado pelo usuário deve passar por `U.esc()` antes de ir para o HTML.
- Cores sempre via variáveis CSS (`--accent`, `--good`, `--warn`, `--bad`).

#### Commits

Utilize o padrão Conventional Commits: `feat:`, `fix:`, `docs:`, `style:`, `refactor:`, `chore:`.

</details>

<details>
<summary><strong>Segurança</strong></summary>

#### O que não deve ser versionado

- Credenciais, tokens, chaves de API e senhas.
- Endereços IP internos, nomes de servidores e topologia de rede real.
- URLs de câmeras ou sistemas internos.
- URLs de fontes de dados com tokens, chaves ou senhas (o validador bloqueia parâmetros como `token=` e `password=`).
- Dados operacionais reais, dados pessoais ou informações de clientes.

As configurações exportadas (JSON) devem ser revisadas antes do commit.

#### Medidas adotadas na aplicação

- Escape de todo texto informado pelo usuário.
- Apenas URLs `https://` são aceitas em câmeras e páginas externas; iframes usam `sandbox`.
- Fontes de dados aceitam apenas `https://`, `wss://`, caminhos relativos ou `localhost`; valores recebidos são escapados antes da exibição.
- O servidor de teste (`node coi-tools.mjs servidor`) escuta apenas em `127.0.0.1` e é exclusivo para desenvolvimento.
- A aplicação não envia dados para servidores; o estado fica no navegador do usuário.

#### Reporte de vulnerabilidades

Não abra issue pública. Entre em contato com os mantenedores por canal privado, descrevendo o problema e como reproduzi-lo.

</details>

<details>
<summary><strong>Referências</strong></summary>

Registre aqui as referências utilizadas em requisitos, arquitetura, equipamentos, padrões e benchmarks do projeto, com data de consulta.

| Tema | Referência | Uso no projeto | Consulta |
|---|---|---|---|
| Interoperabilidade industrial | OPC Foundation — especificação OPC UA | Protocolo de integração entre automação e camada de dados | — |
| Protocolos de campo | Modbus Organization — especificação Modbus | Leitura de sensores e controladores | — |
| Mensageria IoT | OASIS — MQTT Version 3.1.1 | Fonte MQTT sobre WebSocket (v0.4) | — |
| OPC UA PubSub | OPC Foundation — OPC UA Part 14: PubSub | Leitura de PubSub JSON via MQTT (v0.4) | — |
| Cliente OPC UA | node-opcua (biblioteca Node.js) | Gateway OPC UA em `bridge/` (v0.4) | — |
| Segurança OT | ISA/IEC 62443 | Segregação de redes e requisitos de segurança | — |
| Gestão de alarmes | ISA-18.2 / IEC 62682 | Priorização e racionalização de alarmes | — |
| Ergonomia de salas de controle | ISO 11064 | Layout de sala, videowall e estações | — |
| Interfaces de operação | ISA-101 | Princípios de HMI de alto desempenho | — |

</details>

## Licença

Distribuído sob a licença MIT. Consulte [`LICENSE`](LICENSE).
