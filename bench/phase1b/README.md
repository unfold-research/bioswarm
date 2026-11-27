# Instrumento da Fase 1b · Pi direto

Implementa o desenho de `results/phase1b/PREREG.md` sob a emenda de host Pi direto. Código e testes deterministas. Nada aqui chama modelo, a menos que um modo ao vivo seja iniciado com todas as aprovações.

| Arquivo | Papel |
|---|---|
| `case.mjs` | Gera as três exportações versionadas (7.200 pedidos, estornos, depósitos parciais) e as notas de cada fonte. Também produz o mapa de checks por semente e o pedido. |
| `verify.mjs`, `harness.mjs` | Verificador externo. Entre as ondas, roda cada módulo com o modelo de permissões do Node (leitura do próprio módulo, sem escrita nem subprocesso). Publica ID, arquivo, elegíveis, revisão derivada da divergência e sintoma só com contagens. Depois compõe `balances.csv` e `exceptions.csv` e pontua com o `score` da 1a. |
| `bridge.js` | Ponte local `send_message`: fila privada entregue na próxima onda do destinatário, igual nos três braços. Guarda só contagens. |
| `driver.mjs` | Sessões Pi pelo SDK do Pi. Uma sessão por agente dura a tentativa inteira e cada tentativa começa do zero. Mesmas ferramentas de leitura e edição nos três braços; B e C ganham as ferramentas do campo. Usa assinatura OAuth sem fallback pago, `gpt-6.1-sol`, esforço `medium`. |
| `runner.mjs` | Tentativa em ondas: verifica, publica, despacha os três com a mesma observação e espera todos. Termina ao completar, no timeout de 90 min, no freio de [US$ redacted] com disco abaixo de 10 GB ou após 6 ondas seguidas sem ação efetiva aceita (emenda de 26/11). |
| `facts.mjs` | As quatro verificações de integridade (i–iv), sobre a política recebida da Control e o mapa da 1b. Em (iv), registra as três observações consecutivas com o número absoluto da onda e a primeira troca efetiva de dono. Pela emenda aprovada (9ebd889), nas duas primeiras não há troca e, na terceira, assume o agente externo, com rastro endereçado. O relatório científico fica limitado a `fallbackAfter=3`. |
| `policy.mjs` | Atribui a estratégia de cada braço pela Control (C com `overrides: {fallbackAfter: 3}`). Confere o retorno do PUT e o GET dos três agentes e recusa a tentativa se algo divergir. |
| `integrity.mjs`, `localdriver.mjs` | Portão de leitura sem modelo remoto: a mesma pilha de ferramentas de cada braço roda com o provedor determinístico local do Pi, com a política real da Control em B e C. Os caminhos reais (gabarito, chave cega, credenciais) são checados só pela regra de decisão do sandbox, nas formas absoluta, relativa e por link simbólico, sem serem abertos. Canários fictícios com os mesmos modos são recusados de ponta a ponta, e nenhum texto deles aparece. O recibo guarda só booleanos. |
| `isolation.mjs` | No host do estudo, os módulos dos agentes rodam pelo `svc-tool` (`BIOSWARM_TOOL`) como outro usuário, sem rede e no mesmo cgroup. Define os modos da pasta e gera o recibo (só booleanos). |
| `gates.mjs` | Portões de oportunidades, calibração e tarefa longa; custo por aceite; H1b-01/02/03; teste do sinal ilustrativo. |
| `manifest.mjs`, `manifest.json` | Congelamento: SHA-256 dos seis insumos, mapa e totais por semente. |
| `run.mjs` | CLI. |

## Braços

| Braço | Estratégia da Control | Conector |
|---|---|---|
| A | nenhuma | ausente |
| B | `stigmergy` (1 mensagem por turno, 4 por sessão, 400 caracteres; sem espera nem desempate) | 0.2 |
| C | `stigwait-tiebreak` (os mesmos limites, `waitForTrace` e `tieBreak: hash`) | 0.2 |

Em C, a Control envia `fallbackAfter: 3` como override, e o runner também grava 3 em cada onda. Qualquer divergência interrompe a tentativa. O marcador local não leva override.

## Oportunidades por semente (mapa congelado)

| Semente | Papel | Disputas | Conflitos dirigidos |
|---|---|---:|---:|
| 1103 | amostra | 2 | 3 |
| 1151 | amostra | 2 | 2 |
| 1201 | amostra | 2 | 2 |
| 1259 | amostra | 2 | 3 |
| 1301 | amostra | 2 | 3 |
| 1361 | amostra | 2 | 2 |
| 2011 | calibração | 2 | 2 |
| 2027 | calibração | 2 | 2 |
| 2039 | calibração | 2 | 2 |

As disputas são `balances.mjs` e `exceptions.mjs`, cada uma com dois elegíveis sorteados por semente. Os conflitos dirigidos ficam nos módulos de fonte e dependem de um requisito escrito nas notas da fonte de outro papel:

| Módulo | Requisito | Onde está escrito |
|---|---|---|
| `orders.mjs` | a loja S10 é liquidada como outra loja | notas de repasses |
| `refunds.mjs` | créditos `X*` são de homologação | notas de vendas |
| `payouts.mjs` | depósitos `T*` são devoluções | notas de créditos |

## Comandos

```sh
node --test bench/phase1b.test.mjs        # testes deterministas (provedor falso do Pi)
node bench/phase1b/run.mjs plan           # 18 tentativas: ABC, BCA, CAB, ACB, CBA, BAC
node bench/phase1b/run.mjs map            # totais por semente e portão de oportunidades
node bench/phase1b/run.mjs manifest       # confere insumos e mapa com o congelamento
# Ao vivo, somente no Mac do estudo e após as aprovações:
PHASE1B_LIVE=1 PHASE1B_RESULTS=<pasta privada> CONTROL_URL=... CONTROL_KEY_FILE=... BIOSWARM_API_KEY_FILE=... \
  node bench/phase1b/run.mjs integrity | facts | calibrate <0..2> | run <0..17>
```

Os modos ao vivo recusam a execução sem `bench/direct-host-health.mjs`, com checkout sujo ou com uma tentativa anterior não reconciliada. Antes da amostra, exigem também os quatro fatos aprovados nesta revisão, as três calibrações A aprovadas no portão, a aprovação da Pesquisa e o registro de calibração do juiz.

## Telemetria

O registro de cada tentativa guarda contagens, horários, hashes de revisão e IDs de check. Não guarda prompts, mensagens, textos de rastros, memorandos nem caminhos. O pacote cego tem o mesmo formato da 1a: `<uuid>.md` mascarado e `<uuid>.json` com os cinco totais. A chave fica em `blind-key.jsonl`, privada.

## Incidentes

Uma tentativa não comparável leva exatamente um `record.incident`: `policy_mismatch`, `wrong_account`, `wrong_model`, `wrong_effort`, `host_disk` ou `host_preflight`. Conta, modelo, esforço efetivo e política recebida são conferidos antes de despachar e depois de cada onda, antes do verificador. `policy_mismatch` grava `suspended.json` na pasta de resultados e trava todos os modos ao vivo até a investigação. Tentativas com incidente não geram pacote cego e mantêm custo e tempo. Se o memorando não existe ao fechar a tentativa, `review` fica `missing`.

### Manifest access before the sample

Run `bench/phase1b/manifest-access.mjs` through the servidor da bancada study launcher before approving the first sample attempt. Keep the frozen study checkout as the working directory. When the test was added after the worker revision was frozen, supply its reviewed source on stdin to `node --input-type=module` and record the test and worker revisions separately. Set `PHASE1B_WORK` and `CONTROL_KEY_FILE` as for the integrity gate.

The test uses the local deterministic provider and the actual Control policies. Each arm must read a harmless task file and deny the real manifest by absolute path, relative path and symlink, both through Pi and as the Unix worker. The Unix probe opens and closes file descriptors without reading bytes. Store the boolean receipt before requesting sample approval. Any false or missing result keeps the sample closed.

## Caso v2

`PHASE1B_CASE=v2` seleciona o caso v2 (`v2/`, especificação em `results/phase1b/CASO-V2.md`): 12 checks por semente, de 5 a 6 conflitos dirigidos e 5 disputas, sementes disjuntas da v1, manifesto em `v2/manifest.json`. Fica desligado por padrão. Os modos ao vivo exigem `case-v2-approval.json` na pasta `<PHASE1B_RESULTS>/v2`, e a v1 não muda.
