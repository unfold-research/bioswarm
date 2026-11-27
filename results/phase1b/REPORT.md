# Fase 1b · tarefa média (caso multicanal v2)

> **Relatório interno, sem revisão independente.** *Internal report, not independently reviewed.* Valores em US$ foram retirados na versão aberta.

**O pacote de espera e desempate deixou menos conflitos em aberto, mas terminou mais tarde em quatro das seis sementes.** O braço C teve custo estimado por entrega aceita de [US$ redacted] contra [US$ redacted] em B, porque obteve cinco aceites contra quatro, embora seu gasto total tenha sido maior ([US$ redacted] em C e [US$ redacted] em B). A hipótese de economia ficou inconclusiva.

Em 26/11/2026, três agentes no Pi nativo do servidor da bancada fizeram 18 fechamentos anuais simulados de varejo. A trabalhou com a ponte de mensagens. B pôde coordenar pelo campo compartilhado. C recebeu também espera por requisito endereçado, desempate e reatribuição após três observações sem progresso. B e C tiveram os mesmos limites. Os três braços usaram o mesmo modelo de trabalho, `gpt-6.1-sol` com esforço médio, pela assinatura. Cada semente passou pelos três braços em ordem balanceada. A comparação principal é C contra B. A comparação com A é exploratória porque muda as regras e o canal usado pela equipe. [Pré-registro na revisão executada](https://github.com/unfold-research/bioswarm/blob/75c5bc4fb066c39be11d3299dfa29df003b12110/results/phase1b/PREREG.md)

## Resultados nas seis sementes

| Hipótese | Veredito | Resultado pareado de C contra B |
|---|---|---|
| H1b-01 · Menor custo por aceite | **Inconclusiva** | C gastou menos tokens ponderados em 4/6 pares. A regra exigia pelo menos 5/6, além do menor custo por aceite. |
| H1b-02 · Menor tempo de trabalho | **Refutada** | C foi mais rápido em 2/6 pares. A mediana de B menos C foi −42,3 s. Quatro pares com C igual ou mais lento atendem à regra de refutação. |
| H1b-03 · Maior qualidade | **Inconclusiva** | Na escala de 0 a 4 critérios, C superou B em duas sementes, perdeu em uma e empatou em três. O risco de teto já constava do pré-registro. |

A mediana de trabalho observado em A foi **349,794 s** (5 min 50 s), acima do piso descritivo de 180 s. Todas as sementes apresentaram cinco disputas simétricas e cinco conflitos dirigidos no mapa e em A. A inclusão das seis foi fechada antes de abrir os resultados de B e C. Cada braço teve uma tentativa comparável por semente. A análise de sensibilidade que inclui custos de incidentes reproduziu o resultado primário, pois houve zero incidentes. [Recibos sanitizados, contagens e hashes](AMOSTRA-V2.json)

### Tempo, gasto e qualidade por semente

Em cada célula A/B/C aparecem **segundos de trabalho observado · gasto estimado em US$ · critérios cumpridos de 4**. Uma entrega aceita cumpriu os quatro critérios e encerrou como completa. As duas colunas à direita subtraem C de B. Uma diferença positiva favorece C em tempo ou gasto.

| Semente | A | B | C | B−C (s) | B−C (US$) |
|---:|---:|---:|---:|---:|---:|
| 3109 | 331,8 · [US$ redacted] · 2/4 | 491,9 · [US$ redacted] · 4/4 | 430,9 · [US$ redacted] · 4/4 | 61,0 | [redacted] |
| 3163 | 298,7 · [US$ redacted] · 4/4 | 392,5 · [US$ redacted] · 4/4 | 384,6 · [US$ redacted] · 3/4 | 7,9 | [redacted] |
| 3217 | 367,8 · [US$ redacted] · 3/4 | 407,8 · [US$ redacted] · 3/4 | 592,4 · [US$ redacted] · 4/4 | -184,7 | [redacted] |
| 3271 | 317,4 · [US$ redacted] · 3/4 | 290,7 · [US$ redacted] · 3/4 | 353,7 · [US$ redacted] · 4/4 | -63,0 | [redacted] |
| 3323 | 487,4 · [US$ redacted] · 4/4 | 466,5 · [US$ redacted] · 4/4 | 504,3 · [US$ redacted] · 4/4 | -37,8 | [redacted] |
| 3371 | 478,6 · [US$ redacted] · 4/4 | 371,9 · [US$ redacted] · 4/4 | 418,8 · [US$ redacted] · 4/4 | -46,9 | [redacted] |

C/3217 foi a tentativa mais cara e mais lenta da amostra ([US$ redacted] e 592,4 s) e teve aceite onde B perdeu. O mesmo sentido de aceite ocorreu em 3271. Em 3163 ocorreu o inverso. Só o juiz reprovou cinco entregas que passaram nos três critérios automáticos (duas em A, duas em B e uma em C). Como o saldo C−B é de apenas um aceite, a comparação de qualidade e o denominador do custo por aceite dependem do julgamento do modelo.

| Braço | Aceites | Gasto estimado (US$) | US$/aceite | Entrada sem cache | Leitura de cache | Escrita de cache | Saída | Mediana total (s) |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| A | 3 | [redacted] | [redacted] | 580.892 | 8.332.416 | 0 | 141.273 | 445,4 |
| B | 4 | [redacted] | [redacted] | 894.984 | 10.260.096 | 0 | 147.019 | 450,4 |
| C | 5 | [redacted] | [redacted] | 833.746 | 13.173.888 | 0 | 157.275 | 468,7 |

Os custos são estimativas pela tabela fixa em US$ por milhão de tokens (2,00 de entrada sem cache, 0,10 de leitura de cache, 2,50 de escrita de cache e 10,00 de saída). O custo por aceite inclui o gasto de todas as seis tentativas do braço. A assinatura não forneceu custo faturado por tentativa. A parede observada mede a união dos períodos de trabalho dos agentes. O tempo total inclui preparação e verificações internas. A fila externa ficou sem medição.

### O que aconteceu dentro das ondas

Todos os braços receberam **5 disputas e 5 conflitos dirigidos por semente**. A tabela mostra quantos ainda estavam em falha depois de uma onda de trabalho, como **disputas / dirigidos**. Esse segundo contador descreve a aplicação das regras e não decide inclusão.

| Semente | A | B | C | Ondas A / B / C |
|---:|---:|---:|---:|---:|
| 3109 | 3 / 3 | 1 / 2 | 0 / 1 | 12 / 5 / 3 |
| 3163 | 0 / 1 | 1 / 1 | 0 / 1 | 3 / 4 / 3 |
| 3217 | 1 / 1 | 2 / 1 | 0 / 3 | 4 / 4 / 4 |
| 3271 | 0 / 1 | 1 / 3 | 0 / 1 | 4 / 3 / 3 |
| 3323 | 1 / 3 | 1 / 2 | 0 / 1 | 5 / 5 / 3 |
| 3371 | 1 / 3 | 1 / 3 | 0 / 1 | 6 / 5 / 3 |

Depois da primeira onda, C deixou **zero disputas em aberto nas seis sementes**, contra sete em B, e oito conflitos dirigidos, contra doze em B. Os recibos de C registraram 22 bloqueios de espera por rastro e cinco cessões de lugar no desempate. A reatribuição ficou configurada em três observações e não houve recuperação na amostra. Como poucos conflitos sobreviveram à primeira onda, os seis pares têm sensibilidade limitada para detectar pequenas diferenças de custo ou tempo.

C fechou em três ondas em cinco sementes. No conjunto, B usou 26 ondas e C usou 19. Dividindo a soma do tempo observado pelo número de ondas, foram **93,1 s por onda em B e 141,3 s em C**. Menos ondas, portanto, coexistiram com maior tempo em quatro pares. A ponte entregou **193 mensagens em A e zero em B e C**. Nestes dois braços a equipe coordenou apenas pelo campo.

### Adjudicação e condições de execução

O Luna recebeu só o memorando mascarado, os cinco totais e o identificador aleatório. Após 64/64 acertos nos controles, emitiu 18 pareceres válidos em 18 chamadas, sem repetição. O juiz e os trabalhadores são modelos diferentes do mesmo fornecedor, o que limita a independência do julgamento. A semente A/3109 parou por inatividade com dois critérios cumpridos. Todas as outras tentativas chegaram ao fim normal. Destas, cinco ficaram abaixo de 4/4 pelo parecer do juiz. [Protocolo cego](../phase1/BLIND-REVIEW.md)

O novo teste de integridade no SHA executado confirmou os quatro mecanismos previstos, as 18 recusas de acesso ao manifesto e as seis leituras de controle. Nos três braços, a bancada registrou zero HTTP 429, zero repetições do provedor, zero estouros do orçamento e zero jobs de CI no início e no fim das tentativas. Os limites foram de 1,5 CPU e 4 GiB, com uma equipe por vez. Os recibos trazem horários, carga, horas-agente, leituras, falhas, custo estimado pelo host e custo das sondagens prévias por braço. O SDK não isolou os tokens consumidos na leitura dos insumos. [Dados por tentativa e braço](AMOSTRA-V2.json)

**Alcance da evidência.** São seis pares descritivos, um caso sintético de cerca de seis minutos, um modelo de trabalho e um juiz da mesma família de modelos. A comparação mede o pacote de regras nesse fechamento multicanal no Pi. A economia em trabalhos de maior duração e a instalação no OpenBot continuam fora do escopo. Uso interno em repositório privado. A Pesquisa reproduziu os três vereditos e aprovou o registro interno. A entrada no FINDINGS exigiria replicação e revisão independente do relatório. Não há autorização para divulgação pública ou a investidores.

## Calibração do caso multicanal v2 · 26/11/2026

Três equipes do braço A executaram em série o fechamento anual com contratos de três marketplaces e duas adquirentes. Cada equipe teve três agentes no Pi nativo do servidor da bancada, com `gpt-6.1-sol` e esforço médio pela assinatura. A revisão executada foi `bbef64ba71e6e6944586d61bb5e2bade7dc6496f`. A parede observada conta a união dos intervalos de trabalho dos agentes. O tempo total também inclui preparação e verificações. [Especificação aprovada](https://github.com/unfold-research/bioswarm/blob/bbef64ba71e6e6944586d61bb5e2bade7dc6496f/results/phase1b/CASO-V2.md)

| Semente | Parede observada (s) | Tempo total (s) | Custo estimado (US$) | Ondas | Mensagens aceitas | Disputas simétricas | Conflitos dirigidos |
|---|---:|---:|---:|---:|---:|---:|---:|
| 4019 | 321,701 | 374,547 | [redacted] | 4 | 31 | 5 | 5 |
| 4051 | 385,712 | 431,407 | [redacted] | 4 | 32 | 5 | 5 |
| 4073 | 321,328 | 361,538 | [redacted] | 3 | 20 | 5 | 6 |

O custo mediano pela tabela fixa foi **[US$ redacted]**, dentro do limite de [US$ redacted] O total estimado foi [US$ redacted] excluídas as sondagens de pré-voo. O custo faturado da assinatura ficou sem medição. As três sementes tiveram participação dos três agentes e cumpriram o mínimo de cinco oportunidades de cada classe no mapa e quatro observadas de cada classe a partir da onda 1. O verificador aprovou saldos, exceções e totais do memorando nas três tentativas. O quarto critério, parecer cego sobre as ações propostas no memorando, ficou reservado à amostra. [Recibos e hashes das tentativas](CALIBRATION-V2.json)

| Semente | Respostas do modelo | Entrada sem cache | Leitura de cache | Escrita de cache | Saída | Minutos-agente |
|---|---:|---:|---:|---:|---:|---:|
| 4019 | 110 | 115.296 | 1.457.408 | 0 | 23.595 | 12,76 |
| 4051 | 101 | 98.082 | 1.328.000 | 0 | 23.710 | 13,08 |
| 4073 | 75 | 107.053 | 736.128 | 0 | 18.290 | 9,77 |

As três calibrações somaram 35,61 minutos-agente e 83 mensagens aceitas, sem recusas. Como indicador de leitura de arquivos, os recibos originais registraram 64, 71 e 51 leituras aceitas, com 81.257, 86.524 e 61.140 caracteres, respectivamente. O SDK agrega os tokens dessas leituras com os demais tokens de contexto. Cada pré-voo gerou uma resposta adicional, com custo estimado somado de [US$ redacted] Nenhuma tentativa ultrapassou 75 minutos ou recebeu HTTP 429. Em 4073, o provedor registrou um erro e repetiu a chamada automaticamente. Nenhum turno falhou, e as três tentativas foram comparáveis.

As verificações anteriores à calibração passaram nos quatro testes funcionais. O teste do manifesto confirmou 18 leituras negadas e seis leituras de controle permitidas nos três braços. O disco estava em 69,7% no início das três tentativas. Havia zero estudos concorrentes no início e zero jobs de CI no início e no fim de cada uma.

**Decisão da Pesquisa.** A mediana aumentou de 233,045 s na v1 para 321,701 s na v2 (1,38×), mesmo com os contratos adicionais e os novos conflitos entre funções. A duração foi o único critério reprovado. As três calibrações pertencem à linha de base. Naquele momento havia 0/18 tentativas comparativas. A decisão posterior foi manter o caso como tarefa média. A emenda foi aprovada antes da amostra apresentada acima.

## Histórico do primeiro caso · v1

Cada equipe recebeu 7.200 pedidos e três exportações com revisões, estornos e repasses. Três sessões persistentes do Pi direto no servidor da bancada usaram a assinatura, o mesmo modelo `gpt-6.1-sol` e esforço médio efetivo na sessão. O braço A trabalhava sem BioSwarm. O prazo por tentativa era de 90 minutos. A bancada limitou o conjunto a 1,5 CPU e 4 GiB de memória. As medidas de parede abaixo contam a união dos intervalos em que os agentes trabalharam.

O desenho da 1b foi congelado em `e39ff30`. As regras aplicadas na calibração constam do pré-registro no commit `51e374fc07c3a36d361b1d994fed54cf28053132`, a mesma revisão instalada nos três casos. O aceite exigia saldos, exceções, totais no memorando e parecer cego sobre o memorando. Só as tentativas da amostra receberiam o quarto critério. [Pré-registro](PREREG.md) · [Análise de incidentes](INCIDENTES.md)

## Verificações técnicas

- Na 1a, a primeira conferência de identidade detectou uma revisão de política intermediária. Após corrigir a conferência, os três agentes receberam a mesma política remota, escreveram e leram o campo, reconheceram `send_message` e continuaram após a recusa por teto. A repetição durou 34,816 s, em 15 respostas, com 8.700 tokens de entrada sem cache, 12.288 de leitura de cache e 665 de saída. Custo estimado de [US$ redacted]
- Na primeira ativação da 0.2 a política chegou, mas o transporte HTTP do SDK não conseguiu alcançar o modelo pelo proxy. Nenhuma regra disparou. A repetição usou o transporte da CLI do Pi e passou nas quatro verificações em 12 turnos e 28 respostas, com zero erros de provedor. A equipe esperou pelo requisito endereçado, resolveu a disputa, continuou usando o campo após o teto e reatribuiu o trabalho na terceira observação do único item parado, na onda 4. A política fixou `fallbackAfter=3`. A estimativa desta ativação foi [US$ redacted]
- O teste de leitura passou nos três braços para soluções de referência, chave cega e credenciais. Uma verificação suplementar encontrou permissão Unix de grupo no manifesto, que contém hashes de insumos e o mapa de conflitos. A Infra restringiu o arquivo ao operador. O teste subsequente comprovou as 18 negações pelas ferramentas Pi e pelo usuário Unix, mantendo legível o arquivo de controle. O teste suplementar foi versionado separadamente dos trabalhadores em `f42a3c1`. [Recibo booleano](MANIFEST-ACCESS.json)
- O adjudicador cego, Claude Opus 5.5 com esforço médio, acertou 64 de 64 itens em oito memorandos sintéticos na calibração v2. Os controles eram mais simples que memorandos livres. O adjudicador é um modelo. [Calibração do juiz](../phase1/JUDGE-CALIBRATION.json)

## Calibração do braço A

| Semente | Parede (s) | Minutos-agente | Ondas | Mensagens aceitas | Entrada sem cache | Leitura de cache | Saída | Custo estimado (US$) |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| 2011 | 274,639 | 9,11 | 4 | 27 | 95.736 | 940.672 | 17.624 | [redacted] |
| 2027 | 233,045 | 7,49 | 3 | 23 | 60.626 | 419.840 | 15.145 | [redacted] |
| 2039 | 204,290 | 7,21 | 4 | 22 | 137.569 | 1.665.920 | 12.645 | [redacted] |

**Mediana de parede de 233,045 s (3min53s), ante o mínimo de 1.800 s.** As três calibrações somaram 23,81 minutos-agente, 72 mensagens aceitas e [US$ redacted] estimados. Todas terminaram com três participantes, duas disputas simétricas e dois conflitos dirigidos observados. As três passaram nos critérios automáticos de saldos, exceções e totais do memorando. O protocolo reservava a avaliação cega para a amostra.

Nenhuma calibração registrou criação de cache, mensagem recusada, HTTP 429 ou repetição do provedor. Os números de entrada, leitura e saída são contagens do SDK. Os dados disponíveis não separam tokens atribuíveis à leitura de arquivos dos demais tokens de contexto. A tabela fixa por milhão de tokens foi [US$ redacted] para entrada sem cache, [US$ redacted] para leitura de cache, [US$ redacted] para criação e [US$ redacted] para saída. O custo monetário faturado pela assinatura ficou sem medição. Os jobs de CI concorrentes no início/fim foram 0/0, 0/1 e 1/1, por ordem das sementes. [Dados agregados de cada tentativa, carga e hashes dos recibos](CALIBRATION-V1.json)

## Decisão após a v1 e preparação da v2

A duração foi o único critério de calibração que falhou. Os braços B e C ficaram com zero tentativas comparativas. As hipóteses de custo por aceite, tempo e qualidade ficaram sem avaliação. Os estudos sintéticos de coordenação descritos no pré-registro são antecedentes de pesquisa. Os tempos acima são medições locais do Pi na tarefa de calibração. A instalação e a ponte de mensagens do OpenBot continuam sem medição nesta bancada.

Na etapa de planejamento da v2, a revisão proposta acrescentava contratos diferentes por marketplace e adquirente, migrações e devoluções entre períodos. O desenho preservou a v1 e definiu novas sementes. A projeção de planejamento de 7–12 vezes o custo mediano da v1 dá [US$ redacted] por tentativa A. A medição das três sementes v2 consta no início deste relatório. A Pesquisa exigiu revisão do novo instrumento antes de executar a calibração e reteve a amostra se a mediana estimada de A ultrapassar [US$ redacted] metade do freio comum de [US$ redacted] Naquela etapa, o portão era de 30 minutos. Qualquer tentativa de calibração acima de 75 minutos requer revisão do risco de atingir o prazo antes da amostra.

**Mudança prospectiva para o caso multicanal v2, 26/11/2026 UTC.** O juiz designado é gpt-6-luna com esforço medium. Ele e os trabalhadores gpt-6.1-sol são modelos da OpenAI, o que limita a independência do quarto critério. Os 64 acertos do Claude acima são históricos. A nova calibração exige oito pareceres válidos e 64/64 acertos, com os mesmos controles, antes dos dados dos trabalhadores v2. [Protocolo do juiz](../phase1/BLIND-REVIEW.md)

**Escolha do juiz.** O primeiro juiz, Claude Opus 5.5, foi escolhido para ter um fornecedor diferente dos trabalhadores e acertou 64/64 no lote de controle histórico. O dono depois escolheu um modelo OpenAI diferente dos trabalhadores, pela assinatura. O Astra chegou a ser fixado no protocolo, mas recebeu zero memorandos. Antes de observar qualquer parecer OpenAI, o dono escolheu o Luna por ser mais leve para esta tarefa e já ser usado pela Pesquisa como revisor. O portão exige o resultado próprio do Luna.

### Calibração do Luna no Mac — 26/11/2026

O gpt-6-luna acertou **64 dos 64 itens** em oito memorandos sintéticos mascarados. Foram oito pareceres válidos, sem repetição nem HTTP 429. Os recibos somam 63,790 s, 4.450 tokens de entrada e 1.013 de saída, com zero tokens de leitura ou escrita em cache. As chamadas usaram a assinatura. O custo faturado não foi medido. O executor conferiu o modelo e o esforço medium no pedido enviado. O serviço não retornou identificação independente desses dois campos. [Contagens, configuração e hashes dos oito recibos](JUDGE-LUNA-CALIBRATION.json)

A revisão executada para o juiz e aprovada para os trabalhadores é `bbef64ba71e6e6944586d61bb5e2bade7dc6496f`. Os 64 itens pertencem ao controle do adjudicador. Nenhuma das 18 tentativas da amostra contribuiu para esse resultado. O teste suplementar de isolamento pode ser fornecido à unidade do servidor da bancada em stdin com `node scripts/phase1b-v2-manifest-probe.mjs`. Ele seleciona o manifesto multicanal no teste original congelado por hash. A revisão dos trabalhadores fica fixa para as três calibrações A.
