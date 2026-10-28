# Arquitetura de referência

```text
[SCADA] [BI] [CFTV] [GIS] [PCs] [Web]
    \\    |    |     |     |    /
       [Captura / AV-over-IP]
                 |
       [Processador do Wall]
                 |
         [Canvas Videowall]
                 |
      [Operador / Presets]
```

## Blocos

### Fontes
Sistemas de operação, câmeras, dashboards, browsers, estações remotas e fontes corporativas autorizadas.

### Camada de transporte
Escolher entre cabeamento direto, matriz AV, extensores por fibra ou AV-over-IP conforme escala, distância e necessidade de expansão.

### Processamento
A controladora deve compor múltiplas fontes sobre um canvas, permitir resize/crop/posicionamento e armazenar presets operacionais.

### Gestão
A interface deve privilegiar ações simples e repetíveis. Alterações administrativas devem possuir controle de acesso.

## Redundância
Para COI crítico, avaliar redundância de controladora, rede, energia e caminhos de sinal. A redundância deve ser testável e documentada, não apenas adquirida.
