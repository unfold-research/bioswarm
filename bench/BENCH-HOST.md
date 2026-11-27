# Host servidor da bancada · adaptador de saúde e contrato do launcher

Aplica `results/phase1b/PROPOSTA-BENCH-HOST.md` aos entry points live da 1a (`bench/direct-1a.mjs smoke`) e da 1b (`bench/phase1b/run.mjs facts | calibrate | run`). A seleção é por `BIOSWARM_STUDY_HOST=benchhost`. Sem a variável, só o macOS assume `mac` (20 GB para iniciar, pausa abaixo de 10 GB); em qualquer outro sistema o pré-voo recusa. O código está em `bench/host-bench.mjs` (regras puras) e `bench/direct-host-health.mjs` (mesma interface para 1a e 1b). O adaptador não acessa Docker, não muda serviços e não chama modelo.

## O que o adaptador decide

| Regra | Onde mede | Falha |
|---|---|---|
| Ocupação de `/` no máximo 70% para iniciar | `statfs('/')`, mesma conta do `df` | `root_above_70` |
| Parar com 75% em `/` ou ao zerar a área com cota | folga = mín(bytes até 75% de `/`, livre de `dataFs`); amostrador a cada 5 s, pausa com folga < 1 | fim `disk` na 1b, `diskPaused` na 1a |
| Não tocar 04:00–08:00 UTC, contando 90 min de timeout | relógio do processo | `maintenance_window` |
| Nenhum outro estudo ativo (filtro da Bench Engineer, 26/11) | toda a árvore `/sys/fs/cgroup`: `bioswarm-study-*.service` ou `.scope` em qualquer slice, exceto o próprio, e `bench-*.service` da bancada (todo estágio LI, GN, CY e R0 roda numa delas). Não contam: `bench-snapshot`, `research-bench`, slices `r0*`, contêineres e CI (`wp_*`, `ci-governor`), que entra como covariável. Árvore ilegível recusa | `active_study`, `studies_unknown` |
| Limites efetivos do próprio cgroup | `cpu.max` = `150000 100000`, `memory.max` = `4294967296` | `cgroup_limits` |
| Recibo de pré-voo atual do launcher | arquivo em `BIOSWARM_PREFLIGHT_RECEIPT` | `receipt_*` |
| Qualquer leitura impossível | | recusa (falha fechada); amostrador pausa |

Covariáveis gravadas no início e no fim de cada tentativa: ocupação e livre de `/`, livre da área com cota, carga 1/5/15 min, processos e `pids.current` do próprio cgroup (os processos de outros usuários ficam ocultos dentro da unidade), `cpu.max`, `memory.max`, `memory.swap.max`, `pids.max`, `memory.current`, `memory.peak`, throttling de CPU e jobs ativos de CI no início (do recibo) e o resultado do pré-voo do launcher sem caminhos (`pass`, `unit`, `activeStudies`, `ciActiveJobs`). 429 e repetições continuam por `countProviderEvent`.

## Contrato v1 do recibo (acordado com a Colony Infra Engineer em 26/11)

O launcher roda o runner como serviço transitório `bioswarm-study-<id>.service` em `bioswarm.slice` (CPUQuota=150%, MemoryMax=4G, MemorySwapMax=0, TasksMax=512) e define `BIOSWARM_STUDY_HOST=benchhost`, `BIOSWARM_PREFLIGHT_RECEIPT`, `BIOSWARM_CONTROL_URL` (IP atual da Control na rede `bioswarm-phase1_control_net`) e `TMPDIR=/srv/bench/data/tmp`. Recibo em `/srv/bench/data/results/<id>/preflight.json`, dono `svc-op`, modo 0600:

```json
{
  "version": 1, "host": "benchhost", "createdAt": "<ISO UTC>",
  "bootId": "<de /proc/sys/kernel/random/boot_id>",
  "unit": "bioswarm-study-<id>.service",
  "cgroup": "/bioswarm.slice/bioswarm-study-<id>.service",
  "limits": { "cpuQuotaPercent": 150, "memoryMaxBytes": 4294967296 },
  "dataFs": { "path": "/srv/bench/data", "fsType": "ext4", "sizeBytes": 0 },
  "activeStudies": 0, "ciActiveJobs": 0,
  "network": { "pass": true }, "pass": true
}
```

O adaptador recusa quando: o arquivo falta, não é legível ou não está em 0600; `version` não é 1 ou `host` não é `benchhost`; `pass` ou `network.pass` não são `true`; o recibo tem mais de 15 min ou data futura; `bootId` difere; `cgroup` não é a linha `0::` do próprio processo; os limites declarados diferem; `activeStudies` ≠ 0; `ciActiveJobs` não é inteiro ≥ 0; a pasta de trabalho está fora de `dataFs.path`. `sizeBytes` e `fsType` são registrados, não exigidos. Depois que o runner sai, o launcher grava `<recibo>.end.json` com `endedAt` e `ciActiveJobs` (contêineres `wp_*`).

## Control

Na 1a, `BIOSWARM_CONTROL_URL` é obrigatória no servidor da bancada e precisa ser `http` em loopback ou em 172.16.0.0/12 (rede Docker), sem credenciais na URL. No Mac continua o túnel em `127.0.0.1`. A 1b já usa `CONTROL_URL`, que o launcher deve preencher com o mesmo valor. Só o usuário do runner (`svc-op`) alcança a Control; os comandos de ferramenta rodam como `svc-wk`, sem rede.

## Estado

Nada disto rodou num launcher real: o launcher ainda não existe no servidor da bancada. Os testes (`bench/host-bench.test.mjs`) usam um host simulado.
