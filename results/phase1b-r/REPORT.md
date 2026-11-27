# Fase 1b-r · coordenação por arquivo no fechamento multicanal

> **Relatório interno, sem revisão independente.** *Internal report, not independently reviewed.* Valores em US$ foram retirados na versão aberta.

Relatório interno de 26/11/2026. O campo compartilhado (B) e a coordenação por arquivo do conector 0.3 (C) executaram a mesma tarefa em quatro sementes inéditas. C levou mais tempo e consumiu mais tokens ponderados nos quatro pares. Restringir a espera às escritas dirigidas permitiu aos agentes continuar em outros arquivos, mas não recuperou o tempo nem preservou a resolução precoce de todas as disputas.

## Hipóteses

- **R-01 · economia de tokens por aceite — inconclusiva.** C gastou mais nos quatro pares ([US$ redacted] contra [US$ redacted] no total dos trabalhadores), mas teve custo por aceite ligeiramente menor ([US$ redacted] contra [US$ redacted]) porque o juiz decidiu um aceite líquido a mais para C (3/4 contra 2/4). A regra exigia concordância entre custo por aceite e gasto pareado em pelo menos três sementes. A análise que inclui incidentes dá o mesmo veredito.
- **R-02 · tempo — refutada.** C terminou mais tarde em quatro de quatro pares. A mediana de B menos C foi −120,5 s. A parede observada é a união dos intervalos de trabalho dos agentes. Somados os quatro casos, foram 1.366,7 s em B e 1.877,4 s em C. Os tempos totais, que incluem as demais etapas da tentativa, somaram 1.584,2 s e 2.102,6 s, respectivamente.
- **R-03 · qualidade — inconclusiva.** Só C foi aceito em duas sementes, só B em uma, e ambos em uma. A regra de superioridade admitia duas vitórias exclusivas e nenhuma derrota exclusiva. As oito entregas passaram em cada um dos três critérios automáticos: saldos, exceções e cifras do memorando. O quarto critério, o parecer cego sobre o memorando, decidiu todos os aceites e recusas.

## Pares

Tempo em segundos de parede observada e custo equivalente dos trabalhadores pela tabela fixa. As diferenças são B menos C. A última coluna mostra disputas e conflitos dirigidos ainda em falha após a primeira onda, na ordem indicada.

| Semente | Ordem | Tempo B / C | Diferença (s) | Custo B / C (US$) | Diferença (US$) | Aceite B / C | Ondas B / C | Disputas + dirigidos B / C |
|---|---|---:|---:|---:|---:|---|---:|---|
| 5011 | BC | 412,9 / 429,0 | -16,0 | [redacted] | [redacted] | não / sim | 4 / 3 | 0+2 / 1+1 |
| 5023 | CB | 406,6 / 660,4 | -253,8 | [redacted] | [redacted] | não / sim | 4 / 6 | 0+2 / 1+1 |
| 5039 | BC | 271,6 / 395,2 | -123,5 | [redacted] | [redacted] | sim / não | 4 / 4 | 0+1 / 0+1 |
| 5051 | CB | 275,5 / 392,9 | -117,4 | [redacted] | [redacted] | sim / sim | 3 / 4 | 0+0 / 1+0 |

## O que aconteceu nas ondas

A fração média de trabalho do agente mais carregado foi praticamente igual, 45,2% em B e 45,4% em C. Essa medida não explica a demora de C. Os outros dois agentes aguardaram, em média, 36,5 s em B e 42,5 s em C até o fechamento da onda. O tempo entre uma recusa e a próxima ação pode conter trabalho útil. O registro não permite atribuir toda a diferença de tempo à espera por rastro.

A contagem bruta de recusas continuou próxima da anterior: 19 escritas recusadas e correlacionadas em quatro tentativas C da 1b-r, frente a 22 bloqueios de espera em seis C da 1b. As categorias e os denominadores diferem. Na 1b-r, os eventos de regra em C incluem sete esperas por rastro, seis cessões, quatro recusas por arquivo tomado e três por falta de atribuição. Uma decisão não pôde ser ligada a uma chamada; houve ainda uma escrita bloqueada sem decisão correlacionada e zero correlações ambíguas. Após recusas, os agentes concluíram 40 escritas em outros arquivos no mesmo turno. B e C trocaram zero mensagens pela ponte. C publicou 57 requisitos e seis marcas de cessão; não houve reatribuição registrada.

**Regressão observada no desempate.** Na 1b, C com a 0.2 zerou as disputas após a primeira onda nas seis sementes. Na 1b-r, C deixou três disputas em aberto, uma em cada uma de três sementes. B deixou zero. C também usou 17 ondas contra 15 em B. A comparação entre versões usa sementes e amostras diferentes; ela identifica a perda da propriedade observada, sem isolar a causa no código.

## Custo e integridade

Os oito índices produziram recibos comparáveis, sem incidentes, HTTP 429 ou repetição. O manifesto, a integridade e os três fatos do conector passaram na revisão instalada. Cada mapa tinha cinco disputas e cinco conflitos dirigidos. O juiz Luna medium, calibrado em 64/64, recebeu os oito memorandos mascarados e emitiu oito pareceres válidos em oito chamadas.

| Componente | US$ equivalentes |
|---|---:|
| Trabalhadores | [redacted] |
| Sondagens de pré-voo | [redacted] |
| Juiz | [redacted] |
| Fatos locais e incidentes | [redacted] |
| **Total** | **5,768786** |

O teto era [US$ redacted] Os valores aplicam os pesos pré-registrados às quatro categorias de tokens da assinatura. O estudo não mediu cobrança marginal em dinheiro.

## Decisão sobre o FT1 e alcance

**O FT1 permanece em espera.** Falharam três condições: C foi pelo menos tão rápido quanto B em zero pares (mínimo de três), deixou disputas após a primeira onda e precisou de mais ondas no total. Aceites e custo por aceite atenderam seus limites. A Pesquisa suspendeu o uso de ambas as versões no FT1. Separar o efeito do agendamento exigiria outro desenho e autorização da liderança.

São quatro pares descritivos em uma tarefa sintética de minutos, com um modelo de trabalhadores (gpt-6.1-sol medium), um juiz da mesma família e um agendador de ondas síncronas. Mesmo quatro diferenças no mesmo sentido dão p = 0,125 no teste bilateral de sinais sem empates. Os resultados ficam no laboratório.

Revisão executada no servidor da bancada: `993b7de2698942531fd9b59f090b23755e2d4184`. A Pesquisa recalculou os três vereditos a partir do agregado, cujo SHA-256 é `db0cd4edd7097449331e4e048d7b4cabb6855eeddeb1922a3d8be1cffb514d4a`. O arquivo inclui contagens por semente, categorias de tokens e hashes dos recibos. [Agregado sanitizado](AMOSTRA.json) · [Regras congeladas](PREREG.md) · [Diagnóstico da 1b](DIAGNOSTICO.md)
