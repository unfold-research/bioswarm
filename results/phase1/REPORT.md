# Fase 1 · relatório parcial de 25 de novembro de 2026

**Fase 1a mede integridade e linha de base. Não constitui evidência de economia do BioSwarm ou de eficácia de stigwait-tiebreak.**

**Situação.** A Control API está saudável no servidor da bancada e o contrato Pi → Control → Pi foi exercitado em Docker. Há zero execuções válidas do benchmark longo e zero horas-agente medidas nele. Custo por aceite, velocidade e qualidade comparada ainda não são estimáveis.

| Medida de bancada | Resultado observado | Escopo |
|---|---:|---|
| Sessões Pi com conector descoberto | 3/3 | Docker, modelo determinístico |
| Políticas remotas stigwait-tiebreak recebidas | 3/3 | API privada real |
| Agentes que escreveram no mesmo campo | 3 | leituras retornaram 1, 2 e 3 marcas |
| Chamadas da ponte simulada reconhecidas | 3 | nome de teste, prefixo MCP |
| Eventos na Control | 30 | 3 encerramentos, 3 agentes |
| Campos fora da lista no lote | 0 | inspeção da amostra armazenada |
| Eventos contendo o texto-canário | 0 | inspeção da amostra armazenada |
| RAM da Control em repouso | 14,6 MiB | uma amostra; 8 processos/threads, CPU 0,00% |
| API de modelo paga no teste de contrato | [US$ redacted] | provedor determinístico, sem chamada de modelo remota |

servidor da bancada disponibilizou 4 CPUs, 15.992 MiB de RAM total, 13.877 MiB disponíveis e 45 GiB de disco livre no pré-voo. Control ficou limitada a 0,25 CPU e 192 MiB, exclusivamente na rede Docker interna. Não foi medido o consumo da instância OpenBot em carga.

**Reprodução.** O teste está em `docker/pi-contract.mjs`. API privada na revisão `f1780fb49a4da508132d483cce6845ddca7a5167`. A licença e a configuração de conta do servidor OpenBot para a finalidade declarada aguardam confirmação. A validação com o nome de ponte do OpenBot instalado, o aceite do usuário e os resultados dos braços permanecem em aberto.

**Pesquisa anterior.** O primeiro estudo aceitou 27/27 tarefas sintéticas curtas e encontrou redução de mensagens com custo por aceite semelhante. No segundo, os dois braços Pi aceitaram 7/10 cada, com 40 mensagens no braço com regras e 64 sem elas. Esses números pertencem aos estudos anteriores. Fontes: [estudo 1](https://github.com/unfold-research/bioswarm/blob/main/research/results/harness-study-2026-11/REPORT.md) e [estudo 2](https://github.com/unfold-research/bioswarm/blob/main/research/results/harness-study-2-2026-11/REPORT.md).

**Próximo marco.** Conectar três agentes Pi de assinatura em OpenBot Docker, passar o smoke com credenciais e ponte reais, executar os nove casos na ordem congelada e revisar os memorandos às cegas. O ensaio de 0.1.0 só mede as regras já executadas nessa versão. [Pré-registro e critérios](PREREG.md).


**Congelamento antes da primeira chamada de modelo.** O pré-registro 1a e o runner foram congelados no commit `56adf590f47fd03045e935bd54d22109be6a60ce`. Houve zero ativações com modelo real e zero tentativas na amostra até este registro. A checagem de duração de 30 min permanece pendente. No congelamento inicial, a revisão da Pesquisa e a indicação do revisor pelo dono estavam pendentes. Registrar emenda datada para qualquer alteração após esse congelamento. [Revisão congelada](https://github.com/unfold-research/bioswarm/blob/56adf590f47fd03045e935bd54d22109be6a60ce/results/phase1/PREREG.md)

**Disco.** A Bench Engineer aprovou uma janela para uma única imagem OpenBot 0.78.0 amd64. A projeção com 12 GiB de reserva é 72,1% partindo da leitura de 66%. O início exige leitura de até 70%; evitar 01h–05h de Brasília, suspender novas corridas aos 75% e preservar os contêineres de retenção de imagens. A imagem da Control, já presente, tem 239 MB no inventário Docker, dos quais 60,29 kB exclusivos. A versão latest da matriz é uma instalação separada e exige nova verificação de espaço.


**Emenda 1, antes das ativações e da amostra.** O Research Leader aprovou o desenho da Fase 1a com três emendas obrigatórias. A revisão `b1504ff30bb133bb89f28ec1581140753213bb25` incorporou as três: classificação de empates de qualidade como sem separação, contagem de mensagens como checagem de manipulação e mascaramento pré-fixado do memorando com registro privado de cada remoção. Essa revisão registra a primeira emenda. Até este registro: zero chamadas de modelo na bancada OpenBot e zero tentativas medidas. [Pré-registro com a emenda](https://github.com/unfold-research/bioswarm/blob/b1504ff30bb133bb89f28ec1581140753213bb25/results/phase1/PREREG.md)

**Atualização de 25/11, após a homologação da Control.** O PR da API passou no Woodpecker e entrou na main em `a7c81f4406bd2e09a96ab2189272115d024221bd`. A bancada no servidor da bancada passou no health e retornou o catálogo autenticado com o aviso de conflitos dirigidos em stigwait. O hash SHA-256 de strategies.js dentro do contêiner coincide com o de main. Após a atualização, a Control usava 13,14 MiB de RAM em repouso e 12 KiB de dados, com o disco do host em 66%. CI da API verde.

**Emenda 2, antes das ativações e da amostra.** O portão de aceite fica desligado nos três braços. Para a Fase 1a, fixe o checkout 0.1 em `2d1dd01bc7401b7c6121449191b48bb2478c85e5`, que inclui a emenda e sua aplicação no runner. A pesquisa aprovou o desenho. A autorização de uso do host e a indicação do revisor cego continuam pendentes. Houve zero de nove tentativas OpenBot na 1a e zero de dezoito na 1b. O teste técnico do Pi direto levou 37,282 s e não integra essas amostras. [Pré-registro 1a atualizado](https://github.com/unfold-research/bioswarm/blob/2d1dd01bc7401b7c6121449191b48bb2478c85e5/results/phase1/PREREG.md) · [Medições do Pi direto](../phase1b/PI-DIRECT.md)

**Adjudicação definida em 25/11, antes da amostra.** O dono indicou o modelo Claude Opus 5.5, esforço medium, pela conta do OpenBot. O quarto critério depende da interpretação de um modelo e não mede concordância com uma pessoa. Essa limitação se aplica aos resultados de qualidade e ao custo por aceite. Zero memorandos adjudicados. Emenda aprovada pela Pesquisa na revisão `14f3ad9a9558686866b34edcee28112ee5092198`. A decisão sobre a licença do host segue pendente. [Procedimento e prompt fixo](BLIND-REVIEW.md)

**Calibração do juiz em 25/11/2026.** Gabarito e regra congelados antes da chamada em `88e7b1f40330ba7a65bbb1fde9d67baadf73eaa1`. O OpenBot lista claude-opus-5-5 com esforço medium. Usamos o runtime Claude gerenciado pelo OpenBot, com autenticação Claude Team da conta padrão. A primeira requisição recebeu HTTP 429 por limite semanal, com zero tokens de entrada e saída e sem parecer. Houve uma requisição, zero de oito pareceres e zero itens avaliados. A calibração de 64 itens está pendente. O recibo e o hash do pacote foram preservados em privado. Após a reposição da cota, repetir o mesmo pacote uma única vez e completar os sete restantes. Até passar a calibração, ambas as amostras permanecem fechadas.

**Decisão de host em 25/11.** O dono adiou a contratação da licença. A emenda de host estabelece Pi direto nos três braços da 1a e da 1b. As medições serão atribuídas ao mecanismo no Pi, sem inferência sobre a instalação OpenBot. O teste da ponte nativa do OpenBot continua sem execução.

**Resultado da calibração v1.** Após confirmar capacidade da conta Claude Team alternativa, executamos os oito controles com Opus 5.5 e esforço medium. Sete pareceres válidos acertaram os 56 itens avaliáveis. Um parecer com cerca Markdown deixou oito itens indeterminados. O lote falhou no gate de 64/64. Os oito memorandos permaneceram fora da amostra. O prompt v2 e os oito novos casos foram congelados em d45298e. O pré-voo do host recusou iniciar trabalhadores com 6,64 GB livres para o mínimo de 20 GB.

**Calibração v2 aprovada em 25/11/2026.** Após aprovação da Pesquisa e Woodpecker verde, o adjudicador devolveu oito pareceres válidos em oito chamadas, com **64/64 itens corretos** nos oito memorandos inéditos. O lote não registrou HTTP 429 nem repetição. A soma das durações informadas pelos recibos foi 16,700 s; a estimativa Claude foi [US$ redacted] No v1, nove requisições incluíram o 429 sem tokens; a soma das durações foi 14,074 s e a estimativa [US$ redacted] Esses valores pertencem ao juiz e não ao custo dos trabalhadores. A estimativa do runtime é distinta do faturamento da assinatura. Os controles seguem um modelo textual mais simples que memorandos reais. Informar por braço quantos memorandos da amostra falharam exclusivamente no critério do juiz. A calibração não mede qualidade para usuários. [Registro agregado e hashes dos recibos](JUDGE-CALIBRATION.json)

**Escopo do limiar na Fase 1b.** O braço C fixa `fallbackAfter=3` pela Control para os três trabalhadores. Qualquer estimativa da Fase 1b vale para esse limiar específico. A ativação registrará as duas primeiras observações sem transferência e a onda da primeira transferência ao terceiro agente. Até a ativação, não há resultado de bancada para esse mecanismo em tarefa longa.

### Pi nativo no servidor da bancada · primeiro smoke de 26/11/2026 UTC

O primeiro smoke executou o conector 0.1 congelado em `2d1dd01`, com o instrumento `ad73546`, pela assinatura ChatGPT. O SDK confirmou OAuth, o modelo `gpt-6.1-sol`, a assinatura e a saúde da Control dentro do escopo de execução. Os limites medidos foram 1,5 CPU e 4 GiB. O disco raiz estava em 68,0% no início. A amostra de eficácia continuava em 0/18.

| Medida observada no smoke 7cf5d208 | Valor |
|---|---:|
| Agentes que escreveram no campo | 3/3 |
| Identidades de política confirmadas pelo instrumento | 1/3 |
| Turnos / respostas de modelo | 4 / 15 |
| Mensagens aceitas / recusas no teto | 1 / 1 |
| Marcas escritas após o teto pelo agente que recebeu a recusa | 1 |
| Tempo observado de parede / segundos-agente | 32,088 / 41,374 |
| Tokens de entrada sem cache / leitura de cache / criação de cache / saída | 8.381 / 12.800 / 0 / 686 |
| Custo pela tabela fixa | [US$ redacted] |
| Respostas 429 / retries | 0 / 0 |

O teste **reprovou**. Houve leitura cruzada, reconhecimento de `send_message` e progresso após a recusa. A Control incrementa a revisão do workspace a cada PUT. O instrumento esperava as revisões intermediárias 4, 5 e 6 depois de atribuir o trio. O diagnóstico levou a uma correção prospectiva nos dois runners: validar as regras no PUT e no GET após a última atribuição e usar os IDs deste GET na conferência da política recebida. Um novo smoke deve comprovar a correção. O valor em dólares é estimado. Este teste curto não mede economia, qualidade ou velocidade comparada.

**Repetição do smoke no servidor da bancada em 26/11/2026.** Em `071cd51`, os três agentes passaram na verificação da mesma revisão de política, escreveram no campo, reconheceram `send_message` e continuaram após o teto. A execução durou 34,816 s de parede, em 44,871 segundos-agente e 15 respostas. A tabela fixa estimou [US$ redacted] A calibração posterior da 1b reprovou o caso inicial no critério de duração. [Resultados completos da calibração e limites](../phase1b/REPORT.md)
