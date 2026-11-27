# Fase 1b · caso v2 (especificação do instrumento para revisão conjunta)

Dona do instrumento: Bancada. Estado: **implementado e desligado**. A v2 só roda com `PHASE1B_CASE=v2` e, nos modos ao vivo, com `case-v2-approval.json` (Research Leader, mesma revisão) na pasta de resultados v2. Nenhuma chamada de modelo, calibração v2 ou amostra antes da revisão conjunta da Pesquisa e da emenda. A v1, seu manifesto e seus recibos ficam congelados: `PHASE1B_CASE=v1` continua o padrão, e os resultados v1 permanecem na pasta de sempre. A emenda no PREREG, o juiz (decisão do o dono: `gpt-6-luna`, esforço medium, pela assinatura) e o portão novo do run.mjs ficam com o Colony Plugin Engineer.

## Motivo

Na calibração anterior à emenda de escopo, o protocolo exigia mediana ≥1.800 s de parede observada em A. A v1 mediu 274,6 s (2011), 233,0 s (2027) e 233,045 s de mediana: cinco módulos curtos, uma regra cada. A v2 cresce em regras acopladas entre os três papéis, não em volume nem em espera: cada pendência nova vem de uma dependência real entre contratos e módulos. A meta original era ultrapassar 30 min. A mediana observada foi 321,701 s.

## Preservado

Modelo e esforço dos trabalhadores, assinatura sem fallback pago, freios de [US$ redacted] por turno e [US$ redacted] por tentativa, timeout de 90 min, ondas, paridade A/B/C de observações, ferramentas e ponte, regras do conector 0.2 (C com `fallbackAfter: 3` vindo da Control), os quatro critérios, o pacote cego com as mesmas cinco cifras, as emendas de 26/11 (inatividade de 6 ondas, lista de atividade, oportunidade a partir da onda 1, portão de leitura) e o contrato de incidentes. Agentes: lia (vendas), rui (créditos) e teo (repasses).

## Domínio e fontes

Fechamento anual de 2026 de um varejista com nove lojas, três marketplaces (MKA, MKB, MKC) e duas adquirentes (ACQ1, ACQ2).

| Papel | Insumos |
|---|---|
| lia | `mka_orders.csv` (`;`, reais com vírgula, dd/mm/aaaa, `versao`), `mkb_orders.csv` (centavos, ISO, `rev`), `mkc_orders.txt` (`\|`, linhas `sku:qtd:preço`, `seq`), `catalog.csv`, `migration.csv`, `contracts.md`, `vendas.notes.md` |
| rui | `returns.csv` (parciais, revisões, outro período), `chargebacks.csv`, `creditos.notes.md` |
| teo | `acq1_settlements.csv` (centavos, lote), `acq2_settlements.txt` (reais, sem lote, antecipação), `deposits.csv`, `acquirers.md`, `repasses.notes.md` |

Volume por semente (medido): 12.000 pedidos, ~23.900 linhas, ~80 mil liquidações, ~1.700 devoluções e chargebacks, ~790 lotes e depósitos, ~6,8 MB de insumos. A verificação leva ~2,5 s por onda.

Regras (parâmetros sorteados por semente):
- **Comissão por contrato:** MKA com base, categoria especial, mínimo, teto e estorno proporcional; MKB com faixa mensal por loja (limite perto da mediana do volume mensal MKB por loja, para morder dos dois lados) e sem estorno; MKC com taxa mais fixo, categoria especial e estorno só da parte percentual.
- **Categoria:** vem do catálogo vigente na data da venda.
- **Taxas de adquirente:** ACQ1 por faixa de parcelas; ACQ2 com taxa fixa mais antecipação por parcela.
- **Troca de adquirente:** três lojas trocam numa data, e a ACQ1 manda reprocessamentos (`REPROC`) que não são pagos.
- **Migração de SKUs:** com recategorização.
- **Devoluções e chargebacks:** contam no mês do evento.
- **Lotes e depósitos:** lotes sem depósito e reenvios, ao menos dois de cada por semente.

## Mapa de checks (12 por semente)

**Conflitos dirigidos (6 candidatos; cada semente ativa 5 ou 6).** Quando ativo, o requisito está só nas notas de outro papel. Quando inativo, o fenômeno não ocorre ou a regra fica na fonte do próprio dono (classe `own`).

| ID / módulo | Dono | Requisito (ativo) | Onde |
|---|---|---|---|
| `orders` | lia | o MKB fecha às 03:00 UTC; a competência é a hora de Brasília | notas de teo |
| `returns` | rui | devoluções pós-migração usam o SKU novo; levar ao SKU vendido | notas de lia |
| `settlements` | teo | linhas `CB` da adquirente são chargebacks, não repasse | notas de rui |
| `commissions` | lia | o valor do limite da faixa mensal do MKB | notas de teo |
| `fees` | teo | a regra de antecipação da ACQ2 | notas de lia |
| `deposits` | teo | o reenvio do banco: vale o primeiro depósito do lote | notas de rui |

**Disputas simétricas (5 por semente, pares sorteados):** `catalog`, `tiers` (volume MKB mensal por loja, de que depende a comissão), `batches`, `balances` e `exceptions`. Mais o `memo` (lia).

Totais por semente no manifesto: 5 ou 6 dirigidos e 5 disputas. Sementes: amostra 3109, 3163, 3217, 3271, 3323, 3371 (sequências ABC, BCA, CAB, ACB, CBA, BAC); calibração A 4019, 4051, 4073. Todas disjuntas da v1.

## Contratos dos módulos

O verificador roda cada módulo isolado com entradas de referência e, depois, a cadeia com os módulos dos agentes: catalog → orders → returns → settlements → tiers → commissions → fees → batches → deposits → balances e exceptions.

| Lugar | Entrada | Saída |
|---|---|---|
| `catalog.mjs` | `{ catalog, migration }` | `{ [sku]: { original, category } }` |
| `orders.mjs` | `{ mka, mkb, mkc, catalog }` | `{ [marketplace:pedido:sku]: { order, marketplace, shop, month, sku, category, qty, grossCents } }` |
| `returns.mjs` | `{ returns, chargebacks, catalog, orders }` | `{ [id]: { line, month, kind, refundCents } \| { unmatched: true, amountCents } }` |
| `settlements.mjs` | `{ acq1, acq2 }` | `{ [id]: { line, acquirer, batch, installment, installments, grossCents, chargedFeeCents, netCents, anticipated } }` |
| `tiers.mjs` | `{ orders }` | `{ [loja:mês]: grossCents MKB }` |
| `commissions.mjs` | `{ orders, returns, tiers }` | `{ lines, refunds }` |
| `fees.mjs` | `{ orders, settlements }` | `{ [id]: contractFeeCents }` |
| `batches.mjs` | `{ settlements }` | `{ [lote]: { acquirer, date, netCents } }` |
| `deposits.mjs` | `{ batches, deposits }` | `{ [depósito]: { batch, status } }` |
| `balances.mjs`, `exceptions.mjs` | todas as anteriores | textos de `balances.csv` e `exceptions.csv` |

## Aceite (os mesmos quatro critérios)

1. `balances.csv` exato: `month,shop,grossCents,refundCents,commissionCents,acquirerFeeCents,paidCents,differenceCents`, com `differenceCents = paidCents − (grossCents − acquirerFeeCents)`.
2. `exceptions.csv` exato: `ref,reason,amountCents`, com os motivos `fee_over`, `fee_under`, `missing_payout`, `duplicate_deposit` e `return_unmatched`.
3. Totais no memorando: `grossCents`, `refundCents`, `paidCents`, `differenceCents` e o número de exceções (as mesmas cinco cifras do pacote cego).
4. Memorando aceito pelo juiz. O pedido exige uma ação para três motivos, mapeados um a um: `missing_payout`→missing, `fee_over`→over, `fee_under`→under (opção (a) da revisão). A tabela CSV continua com os cinco motivos.

## Portões e regras congelados para a v2

- **Mapa:** ≥5 dirigidos ativos e ≥5 simétricos por semente (`run.mjs map`).
- **Observado** (desde a onda 1, regra de 26/11): ≥4 dirigidos e ≥4 simétricos em cada calibração A (`calibrationGate`).
- **Inclusão de sementes da amostra** (decisão do Research Leader de 26/11, `sampleOpportunityGate`): a semente entra nas hipóteses só com informação anterior ao tratamento.
  - (a) O mapa congelado tem ≥5+5.
  - (b) O braço A da mesma semente observa ≥4+4 a partir da onda 1.
  - Se (a) ou (b) falhar, a semente inteira (A, B e C) fica fora das hipóteses e é relatada. A decisão é tomada antes de abrir os resultados de B e C, sem trocar a semente: o par fica incompleto e o desfecho, inconclusivo.
  - As oportunidades observadas em B e C nunca excluem tentativas. Elas são checagem de manipulação, relatada por braço e por semente.
- **Duração da tarefa média, emenda de 26/11/2026:** registrar a mediana de parede das seis A comparáveis e assinalar valores inferiores a 180 s junto dos vereditos. O critério é descritivo. [Pré-registro e limites de interpretação](PREREG.md)
- **Pausa acima de 75 min** (`longRunHold`): depois de qualquer tentativa v2 acima de 75 min, calibração ou amostra, o run.mjs não inicia nenhuma outra, nem a próxima A, até a liberação expressa do Research Leader para aquela tentativa: `timeout-ack.json` com `reviewer: "Research Leader"`, a mesma revisão e o id da tentativa em `runs`.
- **Custo:** a mediana do custo estimado de A na calibração precisa ser ≤50% do freio ([US$ redacted]). Entre [US$ redacted] e [US$ redacted] não há amostra: o freio é emendado igual para A, B e C antes dos dados, ou o caso é reduzido mantendo os mínimos de conflitos e de duração.
- **Cota:** no pré-voo de cada tentativa, depois dos controles do host e antes de qualquer trabalhador, uma chamada mínima de teste pela mesma assinatura e modelo, igual em A/B/C, sem ferramentas, extensões nem ledger. O registro guarda hora, respostas, tokens, custo, erros, códigos HTTP e 429, à parte dos tokens da tentativa. Um 429 no pré-voo recusa a tentativa sem despachar (`provider_429`). Um 429 durante a tentativa vira incidente operacional `provider_429`, sem fallback pago. A CLI do Pi não informa saldo de assinatura; as três A/v1 tiveram zero 429.
- **Leitura de insumos:** `inputReadProxy` guarda a contagem de leituras aceitas e os caracteres devolvidos, sem texto. É um proxy, não tokens de leitura.

## Custo esperado

A/v1: [US$ redacted] de mediana (0,4618; 0,3147; 0,5682), ~[US$ redacted] de média pela tabela fixa. Com 7 a 12 vezes, a mediana A/v2 projetada fica em [US$ redacted] por tentativa, encostando no limite de [US$ redacted] Cenário das 18 tentativas: [US$ redacted] × 7–12 × 18 = [US$ redacted] em equivalência de tokens. B e C não foram medidos; os extremos não são garantias. O fator observado de 7,72× para chegar a 30 min indica mirar o topo da faixa.

## Controle solo (viabilidade, não executado)

Um agente sozinho com todos os arquivos, as mesmas ferramentas, o mesmo verificador e as mesmas ondas, fora da amostra, mede se o caso exige o time (crença 6 do FINDINGS). É viável no runner como equipe de um membro: todos os lugares elegíveis para esse agente, sem ponte e sem conector. Fica para decisão da Pesquisa, sem dados.

## Comandos e testes

- `PHASE1B_CASE=v2 node bench/phase1b/run.mjs plan|map|manifest`. O manifesto congelado da v2 está em `bench/phase1b/v2/manifest.json`, e a solução de teste em `bench/phase1b/v2/fixtures/solution/`. Os dois são privados como os da v1 (modos 0600/0700 no host) e entram no portão de leitura como gabarito.
- `node --test bench/phase1b-v2.test.mjs` cobre:
  - a seleção do caso e as sementes disjuntas;
  - o mapa ≥5+5 e o manifesto;
  - a solução independente passando os 12 checks nas 9 sementes;
  - cada dirigido ativo falhando só o seu check sem o requisito;
  - o requisito presente só nas notas do detentor;
  - os portões de oportunidade, custo e 75 min;
  - a tentativa completa nos braços A e C pelo provedor falso;
  - a chamada de pré-voo e o 429.
