# Fase 1a no Pi direto · runner e ponte local

**Estado em 25/11: coleta 0.1 fechada.** Por ordem do líder, no 0.1 roda somente a ativação técnica (`smoke`), fora da amostra. `activate` e `run` continuam implementados e testados, mas a entrada normal os recusa; não há calibração de duração nem as nove tentativas 1a. O ensaio de eficácia com trabalhadores fica na Fase 1b, no 0.2. Nenhum trabalhador inicia no Mac com menos de 20 GB livres.

Instrumento da emenda de host (`0f5e158`) e dos controles do host compartilhado (`8cc2144`). Três sessões Pi persistentes por tentativa, no Mac que já hospeda o Pi autenticado; sem OpenBot. Nenhum comando abaixo, exceto `smoke`, `activate` e `run`, chama modelo.

## Peças

| Arquivo | Papel |
|---|---|
| `bench/direct-1a.mjs` | Runner: `plan`, `freeze`, `status`, `smoke`, `activate <0..2>`, `run <0..8>` |
| `bench/direct-1a-core.mjs` | Agendador do trio, medição por turno, veredito do smoke e portão da amostra |
| `bench/pi-bridge/index.js` | Ferramenta `send_message`, igual nos três braços |
| `bench/bridge-queue.mjs` | Fila durável em SQLite (WAL, `synchronous=FULL`), uma por tentativa |
| `bench/direct-1a.test.mjs` | Testes determinísticos com um Pi simulado (`bench/fixtures/fake-pi.mjs`) |

**Sessões.** Cada agente roda `pi -p --mode json --session-dir <tentativa>/sessions/<id> --session-id <uuid>` na própria pasta, com `openai/gpt-6.1-sol`, `--thinking medium`, `--no-extensions --no-mcp --no-skills --no-context-files` e extensões explícitas: orçamento comum, ponte e, em B e C, o conector 0.1. Cada turno retoma a mesma sessão. A tentativa seguinte começa com pastas, sessões, campo, fila e livro de custos novos.

**Ponte.** `send_message {to, message}` grava a mensagem na fila antes de responder ao agente. O runner entrega as mensagens pendentes, em ordem, como o próximo turno do destinatário, com no máximo um turno por agente e os três agentes em paralelo. A tentativa termina quando ninguém trabalha e nada espera na fila, aos 90 min (smoke: 10 min) ou abaixo de 10 GB livres. Em B e C o conector bloqueia a chamada antes da ponte quando o teto age. A telemetria guarda chamadas aceitas por papel, recusas da ponte por motivo e eventos de teto do conector, sem texto.

**Conector 0.1.** `freeze` extrai `index.js`, `policy.js` e `package.json` de `2d1dd01` para `.bench/connector-0.1/` (ignorado pelo git). Toda execução confere os três blobs git antes de começar.

**Medidas por tentativa.** Tokens nas quatro categorias e custo pela tabela fixa (`study.mjs`), custo estimado pelo Pi, tempo de parede observado (união dos turnos), tempo de fila, tempo total, horas-agente, máximo de trabalhadores simultâneos, turnos por papel, HTTP 429 e repetições do Pi, disco inicial, mínimo e final, carga e processos de provedores (`direct-host-health.mjs`), política recebida, recusas no teto e marcas após a recusa, checks do verificador. O pacote cego segue `run.mjs` e `bench/judge-batch.mjs`: `results/blind/<uuid>.md` mascarado e `<uuid>.json` só com os cinco números; a chave fica em `blind-key.jsonl`.

**Portões.** `smoke` exige três identidades remotas do conector, escrita dos três no campo, leitura cruzada, o nome `send_message` nas ferramentas, uma mensagem aceita e, no turno do líder, marca → primeiro envio → recusa no teto → nova marca, leitura e `progress.ok`. `activate` e `run` exigem o smoke aprovado com o mesmo tratamento (Pi, modelo, conector, digest do instrumento e commit do runner). `run` exige ainda três ativações A comparáveis com mediana ≥ 1.800 s, `results/phase1/JUDGE-CALIBRATION.json` com 64/64 e `research-approval.json` com `approved`, `reviewer: "Research Leader"`, `blindReviewerConfirmed` e `revision` igual ao commit do runner.

## Contenção do smoke

`bench/pi-jail/index.js` carrega primeiro e só existe no smoke. O Pi recebe `--tools read,write,leave_mark,read_marks,send_message`: sem `bash`, `edit`, `find`, `grep` ou `ls`. O jail recusa por conta própria qualquer outra ferramenta. `read` alcança só a pasta do caso e o campo; `write` alcança só a pasta do caso. Os caminhos passam pelo resolvedor do próprio Pi 1.5.2 (`@`, `~`, `file://`, relativos à pasta do agente) e pelas variantes de nome que o `read` do Pi tenta. Pastas com link simbólico são seguidas até o caminho real; um link simbólico como arquivo final, ou um caminho que não dá para conferir, é recusado. Ficam fora do alcance a pasta do agente (marcadores e fila), as sessões, `PHASE1A_RESULTS`, o repositório e as credenciais em `~`.

Prova sem modelo: `bench/pi-jail.test.mjs` cobre o fluxo permitido e as recusas. Com as flags do smoke, o Pi 1.5.2 real expôs exatamente essas cinco ferramentas (sondado por `getActiveTools()` em modo RPC, sem prompt); sem `--tools`, apareceriam `bash` e `edit`.

## Dependências no servidor da bancada

- Control `bioswarm-phase1-control-1` saudável na rede `bioswarm-phase1_control_net`, sem porta publicada.
- Túnel privado no Mac: `ssh -N -L 127.0.0.1:18787:<IP da Control>:8787 benchhost`; o IP sai de `docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' bioswarm-phase1-control-1` (172.26.0.2 em 25/11).
- Chave da bancada: cópia de `~/bioswarm-phase1/private/control-key` em arquivo local com modo 0600, apontado por `BIOSWARM_CONTROL_KEY_FILE`. B e C recebem a política por `PUT /v1/policy` com o id do agente; o conector a busca com `BIOSWARM_API_URL` e `BIOSWARM_API_KEY`.

## Comandos

```sh
node --test bench/direct-1a.test.mjs
node bench/direct-1a.mjs freeze
PHASE1A_RESULTS=<pasta privada> node bench/direct-1a.mjs status
# com túnel, chave, 20 GB livres e autorização para chamadas de modelo:
PHASE1A_RESULTS=... BIOSWARM_CONTROL_KEY_FILE=... node bench/direct-1a.mjs smoke
PHASE1A_RESULTS=... BIOSWARM_CONTROL_KEY_FILE=... node bench/direct-1a.mjs activate 0   # 1, 2
PHASE1A_RESULTS=... BIOSWARM_CONTROL_KEY_FILE=... node bench/direct-1a.mjs run 0        # .. 8
```

`PHASE1A_WORK` escolhe o volume de trabalho (padrão: o diretório temporário). O runner recusa começar com o runner sujo, menos de 20 GB livres, outra tentativa pendente, Pi diferente de 1.5.2 ou entrada sem OAuth.

## Limites conhecidos

- Fora do smoke, o Pi direto não isola o shell dos agentes. Por isso a coleta 0.1 está fechada e nenhum modo além do smoke recebe ferramentas de shell.
- O prompt de sistema acrescentado (nome, equipe, uso de `send_message`) substitui a identidade que o OpenBot dava; é igual nos três braços.
- O smoke e as ativações ainda não rodaram com o modelo real; a persistência de sessão e o nome da ponte só ficam comprovados no smoke.
