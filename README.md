# COI Videowall Forge

Base técnica para planejar, dimensionar, instalar, configurar, testar e operar um videowall de Centro de Operações Integradas (COI).

## Objetivo

Transformar a implantação do videowall em um processo reproduzível: requisitos -> arquitetura -> layout -> infraestrutura -> instalação -> configuração -> comissionamento -> operação.

## Estrutura

- `docs/01-requisitos.md` - levantamento inicial
- `docs/02-dimensionamento.md` - matriz, resolução, fontes e visualização
- `docs/03-bom.md` - Bill of Materials de referência
- `docs/architecture/` - arquitetura AV, rede e energia
- `docs/design/` - layouts e critérios para conteúdo
- `docs/installation/` - instalação e comissionamento
- `docs/operations/` - SOP, manutenção e incidentes
- `configs/` - exemplos de configuração
- `examples/` - layouts de operação
- `scripts/` - utilitários locais

## Princípio de projeto

Não escolher a tela antes de definir sala, postos de operação, distância de visualização, fontes simultâneas, criticidade, regime de operação e layouts necessários. O projeto executivo deve ser validado pelo integrador AV e pelos fabricantes dos equipamentos escolhidos.

## Fluxo recomendado

1. Preencher `docs/01-requisitos.md`.
2. Definir arquitetura em `docs/architecture/architecture.md`.
3. Dimensionar o wall em `docs/02-dimensionamento.md`.
4. Montar a BOM em `docs/03-bom.md`.
5. Definir layouts em `docs/design/layouts.md`.
6. Executar checklist de instalação.
7. Registrar testes no plano de comissionamento.
8. Entregar SOP e rotina de manutenção para Operações.

## Segurança

Não versionar senhas, tokens, IPs produtivos, diagramas de rede sensíveis, credenciais, dados de clientes ou capturas contendo informação confidencial. Use dados sintéticos nos exemplos.
