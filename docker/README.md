# Bancada interna

O Compose usa a imagem oficial de OpenBot e compila somente a Control API no próprio host. Nenhum serviço publica porta. A Control só participa da rede interna. O OpenBot tem saída para a conta e o provider. O volume de estado do OpenBot contém sessões privadas.

No diretório de operação da bancada, reserve `control-data/` para UID 1000 e um arquivo de chave aleatória legível apenas pelo UID 1000. Configure `CONTROL_CONTEXT` para o checkout da API, `CONTROL_DATA`, `CONTROL_KEY_FILE` e `CONNECTOR_ROOT` com caminhos absolutos. O último é o checkout do conector com suas dependências instaladas para Linux. Obtenha `docker/seccomp.json` na tag da imagem oficial e defina `OPENBOT_SECCOMP` com seu caminho absoluto. Na versão 0.78.0 o SHA-256 do perfil é `665289e6a1c41045f55166d0b01993c929f71df78e3a3b264f3252bb8e0b3d9e`.

```sh
docker compose -f docker/compose.yaml config --quiet
docker compose -f docker/compose.yaml up -d --wait
docker compose -f docker/compose.yaml exec openbot openbot status
```

Conecte a conta pelo fluxo oficial no contêiner. A variante do instalador para Linux instala um serviço systemd no host. No Docker use o login de contêiner, que aceita a mesma credencial descartável por stdin. Crie três agentes exclusivos, selecione Pi e a mesma conta de assinatura e habilite Local scripts nas permissões dos três pelo cliente de proprietário. Instale a extensão com `node /opt/bioswarm/packages/connector-pi/bin/bioswarm-pi.mjs install` como usuário do OpenBot. O runner abre chats novos após mudar o marcador. O Compose fornece ao runtime a chave exclusiva desta bancada. O braço A não registra a extensão. B e C usam atribuições individuais da mesma API, respectivamente com a regra comunitária e a regra remota. O teste de carregamento exige resposta do host, marca escrita e leitura por outro agente.

| Serviço | CPU máxima | RAM máxima | Processos |
|---|---:|---:|---:|
| OpenBot | 1,5 | 4 GiB (inclui uso de memória compartilhada) | 768 |
| Control API | 0,25 | 192 MiB | 96 |

Meça consumo observado com `docker stats --no-stream`. Limites configurados e capacidade livre não medem consumo em execução. Para parar esta bancada, use `docker compose -f docker/compose.yaml stop` no mesmo projeto e diretório. Os volumes persistem. Não use operações globais no daemon.

[Imagem oficial e operação em Docker](https://github.com/nightly-labs/openbot/blob/v0.78.0/docs/docker.md) · [Local scripts](https://github.com/nightly-labs/openbot/blob/v0.78.0/docs/automation.md)

## Rodar o ensaio

Monte `BENCH_RESULTS` como um diretório privado do host gravável pelo UID 1000, fora dos volumes dos agentes. O runner em contêiner separado compartilha o loopback do OpenBot, consulta SQLite em leitura e mantém o verificador fora do workspace dos agentes. Em `BENCH_RESULTS/team.json` defina os três IDs dedicados na ordem líder/colega/colega, o modelo, a conta Pi autenticada por assinatura, `billing` e a versão efetivamente instalada. Exemplo de formato:

```json
{"ids":["agent-LEAD","agent-SECOND","agent-THIRD"],"model":"openai/gpt-6.1-sol","account":"default","billing":"subscription","hostVersion":"0.78.0"}
```

Confira a autenticação por assinatura no próprio host antes de definir esse campo. Não configure fallback para uma API faturada. Na bancada, instale dependências Linux com `npm ci --ignore-scripts` no checkout montado, incluindo as de desenvolvimento usadas pelos testes do Pi.

```sh
export CONNECTOR_REVISION="$(git rev-parse HEAD)"
docker compose -f docker/compose.yaml run --rm -e CONNECTOR_REVISION runner plan
docker compose -f docker/compose.yaml run --rm -e CONNECTOR_REVISION runner smoke
docker compose -f docker/compose.yaml run --rm -e CONNECTOR_REVISION runner run 0
```

Passe os índices 0 a 8 na ordem do plano. Após cada execução concluída os arquivos da tarefa saem do volume compartilhado para a pasta privada da tentativa. O registro `active-attempt.json` impede uma nova corrida após interrupção. Nessa situação, confira as filas, meça as três sessões, preserve os artefatos e a causa da falha antes de liberar a próxima tentativa. Não classifique ausência de uso registrado como custo zero. Envie ao revisor cego apenas o memorando com identificação aleatória e os totais de referência. No relatório, incorpore a adjudicação cega do modelo antes de contabilizar um aceite.

## Gate de release

A configuração Woodpecker roda a integração em tags e aceita o evento semanal de cron do próprio Woodpecker. O endpoint de teste deve estar configurado com os segredos `bioswarm_bench_target`, `bioswarm_bench_key` e `bioswarm_bench_known_hosts`, acessíveis somente à esteira de release. Instale o validador docker/forced-smoke.sh em caminho de operador e configure o endpoint com chave SSH de comando restrito (`restrict,command=...`). Ele aceita somente `smoke <versão> <sha>`, chama `docker/release-smoke.sh` com esses dois argumentos e não oferece um shell. O host da bancada precisa ter `flock`, Git, Node 22 e Docker Compose. O perfil de execução fornece `BIOSWARM_RELEASE_ROOT` e `BIOSWARM_COMPOSE`. Dentro de cada diretório de versão, `bench.env` exporta os caminhos da bancada, o nome do projeto Compose, a versão e as configurações de volume. Para pinned e latest diferentes use projetos e volumes de conta distintos.

Prepare a cópia da revisão de release com suas dependências Linux antes do teste. O script compara SHA, arquivos montados e versão da imagem com a release solicitada. O gate exige três agentes reais e uma mensagem reconhecida na ponte, além de escrita, leitura e política. Uma linha pendente no COMPAT falha no modo `--release`. Com a mesma versão em pinned e latest, a matriz reaproveita uma execução. A esteira gera o relatório no checkout do job e imprime a matriz no log. Ao preparar o PR de release, gere `COMPAT.md` com o mesmo comando e guarde os recibos privados no host.

O ensaio de contrato sem conta em `docker/pi-contract.mjs` usa três sessões reais do Pi, um modelo determinístico, uma ponte simulada e a Control API do Compose. Rode em Node 22 com o checkout, suas dependências Linux e o segredo montados, na rede interna da Control. Ele não substitui o gate de release no OpenBot.

Na Fase 1a, o runner instala no Pi um freio neutro nas três condições ([US$ redacted] por turno e [US$ redacted] por tentativa de equipe). O smoke exige que o trabalho continue após a recusa de mensagem. Execute em seguida `runner activate 0`, `runner activate 1` e `runner activate 2` pelo mesmo comando Compose e com a mesma revisão. O estudo requer mediana de pelo menos 30 minutos de parede observada nas ativações A. O operador arquiva no diretório privado de resultados a aprovação real do Research Leader em `research-approval.json` (revision, reviewer, approved e blindReviewerConfirmed) após aprovação da emenda pela Pesquisa e verificação da conta, modelo e esforço do adjudicador; o runner lê esse registro. Os detalhes metodológicos e a tabela fixa estão em `results/phase1/PREREG.md`.
