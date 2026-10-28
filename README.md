# COI Videowall Forge

**Reference framework for Integrated Operations Center videowall design, deployment and operation.**

Uma base estruturada para orientar a concepção de videowalls em **Centros de Operações Integradas (COI)**, conectando necessidades operacionais, arquitetura audiovisual, infraestrutura, visualização da informação, comissionamento e governança em uma abordagem única e reutilizável.

> **Objetivo:** apoiar projetos de COI desde a definição dos requisitos até a entrada em operação do videowall, reduzindo decisões isoladas de tecnologia e promovendo uma visão integrada entre operação, ambiente físico, dados e infraestrutura.

---

## Visão executiva

O videowall é um componente de **consciência situacional e suporte à decisão** dentro do COI. Seu desenho deve partir da operação e das informações que precisam estar disponíveis para operadores, supervisores e gestores, e não somente da escolha de displays.

O **COI Videowall Forge** organiza essa jornada em oito frentes:

| Frente | Resultado esperado |
|---|---|
| **1. Requisitos** | Necessidades da operação, sala, usuários e disponibilidade definidas |
| **2. Dimensionamento** | Tecnologia, matriz, resolução e capacidade visual dimensionadas |
| **3. Arquitetura** | Fluxo entre fontes, transporte AV, processamento, rede e displays estruturado |
| **4. Infraestrutura** | Energia, UPS, climatização, cabeamento e suporte físico especificados |
| **5. Experiência operacional** | Hierarquia de informação, layouts e presets definidos por cenário |
| **6. Implantação** | Instalação física e lógica conduzida por checklist |
| **7. Comissionamento** | Critérios de aceite, desempenho, contingência e recuperação testados |
| **8. Operação e manutenção** | Procedimentos, responsabilidades e rotinas de sustentação estabelecidos |

---

## Proposta de valor

Este repositório foi estruturado para funcionar como um **acelerador de projeto**, permitindo reutilizar componentes e critérios entre diferentes ambientes de COI sem transformar uma solução específica em padrão obrigatório.

### O framework busca apoiar

- definição do videowall a partir de **casos de uso e necessidades operacionais**;
- consolidação de fontes como **SCADA, CFTV/VMS, dashboards, GIS, aplicações web e estações de operação**;
- avaliação de alternativas como **LCD narrow-bezel e Direct View LED**;
- desenho da cadeia de vídeo, incluindo processamento, matriz AV, extensores ou **AV-over-IP**;
- definição de presets para **operação normal, incidentes, crises e manutenção**;
- especificação preliminar de energia, UPS, rede, climatização e manutenção;
- elaboração da **Bill of Materials (BOM)**;
- planejamento de testes, comissionamento, contingência e aceite operacional;
- documentação da operação para sustentação posterior.

---

## Arquitetura de referência

```text
Fontes Operacionais e Corporativas
SCADA | CFTV | BI | GIS | Web | PCs | Outros sistemas
                       │
                       ▼
              Captura e Transporte AV
       HDMI / DP / Fibra / Matriz / AV-over-IP
                       │
                       ▼
             Processamento do Videowall
       Composição | Scaling | Presets | Controle
                       │
                       ▼
                   Videowall
             LCD ou Direct View LED
                       │
                       ▼
              Operação Integrada
 Operação Normal | Incidente | Crise | Manutenção
```

A arquitetura apresentada é conceitual. Tecnologias, fabricantes, capacidades, redundâncias e interfaces devem ser definidos conforme os requisitos e a criticidade de cada implantação.

---

## Jornada de estruturação

### 01 | Entender a operação

Antes de selecionar qualquer display, devem ser conhecidos:

- dimensões da sala e posições dos operadores;
- distâncias e ângulos de visualização;
- regime de funcionamento, incluindo eventual operação 24x7;
- quantidade e criticidade das fontes;
- informações que precisam permanecer visíveis simultaneamente;
- cenários de incidente e crise;
- requisitos de disponibilidade e recuperação.

**Artefato:** [`docs/01-requisitos.md`](docs/01-requisitos.md)

### 02 | Dimensionar a solução

A etapa de dimensionamento transforma os requisitos em parâmetros para avaliação de:

- configuração física do wall;
- quantidade de displays ou módulos;
- resolução e canvas total;
- LCD narrow-bezel versus Direct View LED;
- legibilidade do conteúdo;
- manutenção e possibilidade de expansão.

**Artefato:** [`docs/02-dimensionamento.md`](docs/02-dimensionamento.md)

### 03 | Definir a arquitetura

Estruturação do caminho entre sistemas de origem e o videowall, considerando captura, transporte, processamento, controle, rede, energia e contingência.

**Artefatos:** [`docs/architecture/`](docs/architecture/)

### 04 | Planejar conteúdos e layouts

O videowall deve apresentar a informação adequada ao contexto operacional. O framework prevê quatro estados iniciais:

- **Operação Normal**: acompanhamento contínuo da operação;
- **Incidente**: priorização da ocorrência e das fontes associadas;
- **Crise**: visão situacional comum para coordenação e decisão;
- **Manutenção**: diagnóstico da própria infraestrutura e das fontes.

**Artefato:** [`docs/design/layouts.md`](docs/design/layouts.md)

### 05 | Especificar os componentes

A BOM consolida os principais grupos necessários para implantação, incluindo displays, suportes, processamento, transporte AV, rede, energia, cabeamento, climatização e sobressalentes.

**Artefato:** [`docs/03-bom.md`](docs/03-bom.md)

### 06 | Instalar e comissionar

A instalação deve ser acompanhada por critérios formais de verificação, seguida por comissionamento funcional e operacional.

Entre os testes previstos estão:

- inicialização completa;
- disponibilidade das fontes;
- execução dos presets;
- legibilidade nos postos de operação;
- alinhamento e uniformidade visual;
- contingência e failover, quando previstos;
- comportamento diante de falha e retorno de energia;
- condições térmicas;
- backup e recuperação das configurações;
- operação prolongada antes do aceite.

**Artefatos:** [`docs/installation/`](docs/installation/)

### 07 | Sustentar a operação

Após o go-live, a solução deve possuir procedimentos claros de operação e manutenção, evitando que conhecimento técnico permaneça somente com o integrador ou com indivíduos específicos.

**Artefatos:** [`docs/operations/`](docs/operations/)

---

## Estrutura do repositório

```text
coi-videowall-forge/
├── README.md
├── CONTRIBUTING.md
├── SECURITY.md
├── SOURCES.md
│
├── docs/
│   ├── 01-requisitos.md
│   ├── 02-dimensionamento.md
│   ├── 03-bom.md
│   ├── architecture/
│   ├── design/
│   ├── installation/
│   └── operations/
│
├── configs/
│   ├── layouts.example.json
│   └── sources.example.yaml
│
├── examples/
│   ├── source-inventory.csv
│   └── acceptance-test.csv
│
├── scripts/
│   └── validate_layouts.py
│
└── assets/
```

---

## Principais entregáveis

Ao utilizar o framework integralmente, o projeto tende a consolidar os seguintes artefatos:

| Entregável | Finalidade |
|---|---|
| **Levantamento de requisitos** | Registrar necessidades operacionais e restrições |
| **Arquitetura de referência** | Representar a cadeia tecnológica do videowall |
| **Inventário de fontes** | Mapear sistemas e conteúdos que alimentarão o wall |
| **Estudo de dimensionamento** | Definir configuração física e capacidade da solução |
| **BOM** | Consolidar equipamentos e infraestrutura necessários |
| **Layouts operacionais** | Padronizar visualizações por contexto de operação |
| **Checklist de instalação** | Controlar requisitos antes e durante a implantação |
| **Plano de comissionamento** | Formalizar testes e critérios de aceite |
| **SOP operacional** | Padronizar utilização e resposta a falhas |
| **Plano de manutenção** | Estruturar sustentação preventiva e contingência |

---

## Princípios de desenho

### Operation-driven
A tecnologia deve responder às necessidades da operação, e não determinar o processo operacional.

### Situational awareness
A organização visual deve favorecer identificação de desvios, contexto e priorização das informações relevantes.

### Reliability by design
Disponibilidade, redundância, backup e recuperação devem ser avaliados conforme a criticidade do COI.

### Maintainability
A solução deve considerar acesso físico, substituição de componentes, documentação e disponibilidade de sobressalentes desde o projeto.

### Scalability
O desenho deve considerar crescimento de fontes, conteúdos, usuários e capacidade de processamento.

### Security by design
Interfaces administrativas, redes e endpoints devem seguir os controles de segurança aplicáveis ao ambiente.

### Vendor-aware, vendor-independent
O framework não determina fabricante. A definição final deve considerar compatibilidade técnica, suporte, ciclo de vida, requisitos operacionais e documentação dos fabricantes selecionados.

---

## Critérios de conclusão

Uma implantação não deve ser considerada concluída apenas porque o videowall está exibindo imagens. O encerramento deve considerar, no mínimo:

- fontes previstas integradas e validadas;
- presets operacionais testados;
- conteúdo crítico legível nos postos definidos;
- infraestrutura elétrica e térmica validada;
- cenários de recuperação executados conforme escopo;
- configurações documentadas e armazenadas adequadamente;
- documentação *as-built* disponível;
- equipe responsável orientada sobre operação e escalonamento;
- critérios de aceite formalmente registrados.

---

## Segurança e confidencialidade

Não devem ser versionados neste repositório:

- senhas, tokens, certificados ou chaves privadas;
- endereços IP e detalhes sensíveis de ambientes produtivos;
- diagramas que exponham controles de segurança;
- capturas de telas com dados confidenciais;
- bases de produção;
- informações de clientes sem autorização adequada.

Para demonstrações e desenvolvimento, utilize informações **sintéticas, anonimizadas ou especificamente autorizadas**.

Consulte [`SECURITY.md`](SECURITY.md) para as diretrizes do repositório.

---

## Referências

Os critérios deste framework devem ser complementados pelos **manuais oficiais dos fabricantes dos equipamentos selecionados**, pelo projeto do integrador AV e pelos requisitos específicos de cada ambiente.

As referências técnicas utilizadas como apoio podem ser encontradas em [`SOURCES.md`](SOURCES.md).

---

## Status

**Em evolução.**

O repositório foi estruturado como uma base modular. Novos componentes podem ser incorporados à medida que casos de uso, fabricantes, padrões de arquitetura e aprendizados de implantação forem consolidados.

---

## C&Ops Forge Lab

**COI Videowall Forge** é uma iniciativa voltada à estruturação de referências, ferramentas e aceleradores para ambientes de operações integradas.

---

## Autoria e colaboração

Desenvolvido com a colaboração de **andremellotech**.

> Para que a coautoria seja reconhecida oficialmente pelo GitHub, inclua também o trailer abaixo na mensagem do commit:
>
> `Co-authored-by: andremellotech <andremello@outlook.com>`
