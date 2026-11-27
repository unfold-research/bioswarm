# Fase 1a · integridade da bancada e linha de base

**Esta fase não constitui evidência de economia do BioSwarm nem de eficácia de stigwait-tiebreak.** A versão 0.1 recebe os parâmetros de espera por rastro e desempate, mas só aplica os limites de mensagens. O estudo verifica a integridade da medição e caracteriza a linha de base. A Fase 1b exigirá outro pré-registro com espera, desempate e recuperação de estagnação implementados e verificados no loop do conector 0.2.

## Tratamentos e controle

A é Pi sem coordenação BioSwarm. B é Pi com as regras comunitárias. C é Pi com a política remota stigwait-tiebreak. O mesmo instrumento neutro de orçamento roda nos três braços. Não registra ferramentas de coordenação. O freio é de [US$ redacted] estimados por turno por agente e [US$ redacted] estimados por tentativa para o trio. Cada resposta do modelo atualiza o custo usado pelo Pi. Ao ultrapassar qualquer limite, a próxima ferramenta é bloqueada; chamadas já em voo podem superar o valor. Os três braços usam só a mesma conta de assinatura, sem fallback pago. O teto autorizado de [US$ redacted] da fase não autoriza chamadas pagas neste protocolo.

Mesmos três agentes, modelo openai/gpt-6.1-sol, esforço medium, bytes de entrada e limite de 90 minutos por tentativa. Três exportações de lojas fictícias precisam ser conciliadas: vendas corrigidas, créditos e depósitos parciais. Cada caso contém 7.200 pedidos. A sequência é A/B/C para 419, B/C/A para 733, C/A/B para 947. Uma execução por vez; novos chats, diretório, campo, cache e livro de custos a cada tentativa. Os três agentes devem ter uso registrado. O protocolo congela o instrumento, o limiar de duração e os critérios antes da primeira chamada de modelo. Toda mudança posterior será uma emenda datada, com SHA anterior, motivo e efeitos sobre as medições.

## Ativação e duração

Fora da amostra, executar primeiro o smoke real. Os três agentes devem carregar o conector e receber a política correta, escrever no campo, comprovar leitura entre agentes e reconhecer o nome da ponte real. No mesmo turno do líder, exigir marca antes do primeiro envio, primeiro envio permitido, segundo envio recusado pelo teto, nova marca de requisito, leitura e arquivo de progresso produzido após a recusa. Exigir recibo dos três agentes com o freio comum. Se uma condição falhar, interromper. Uma simulação Pi não libera esse gate.

Em seguida executar A uma vez por semente para calibrar duração (três ativações, fora da amostra). Tempo de parede observado é a união dos intervalos dos turnos concluídos do trio, sem fila, sem lacunas entre turnos e sem somar sobreposição. Não inserir sleeps nos agentes. **A mediana de A na ativação precisa ser ≥ 1.800 s**. Se for menor, aumentar a complexidade acoplada do caso por emenda antes de fechar a amostra, repetir a calibração e submeter a versão à revisão. O SHA aprovado, os três recibos de calibração e a identidade do revisor cego definida pelo dono são condições para iniciar as nove tentativas. Confirmar também o limiar na amostra de A. Se falhar, reportar o estudo como curto. Informar horas-agente separadamente (soma dos turnos); a meta do lote é ≥ 3 horas-agente.

## Aceite e cegamento

O verificador compara igualdade exata dos dois CSVs por chave, cardinalidade, ausência de duplicatas, categoria e sinal de cada diferença. O memorando deve associar corretamente os quatro totais anuais e o número de exceções, além de indicar ação pertinente para cada um dos três motivos de exceção. O verificador confere a presença dos cinco números. O adjudicador cego confere suas associações e as três ações. Quatro critérios binários: saldos, exceções, números no memorando, parecer cego. Aceite exige 4/4. Tentativa terminada com aprovação alegada pelos agentes e qualquer critério falho é falso sucesso.

O runner gera UUID v4 independente para a revisão de cada memorando. A chave que relaciona UUID à tentativa fica em arquivo privado do operador fora do diretório cego. Ao revisor serão entregues apenas os textos e os totais de referência com o UUID, em ordem de UUID, após retirar metadados de arquivo e verificar se o texto revela o braço. Qualquer quebra de cegamento é registrada. O revisor não recebe braço, semente, nomes dos agentes, logs, horários ou durações. Registrar o parecer antes de abrir a chave. A emenda de adjudicação abaixo registra a indicação do dono.

## Desfechos e decisão

Primário: registrar, por tentativa, tokens de entrada sem cache, leitura de cache, criação de cache e saída, e convertê-los em um único desfecho ponderado para H1a-01. Preços analíticos congelados em US$ por milhão, respectivamente 2,00 / 0,10 / 2,50 / 10,00 (tabela do estudo anterior, sem atualização retroativa). O valor é uma estimativa padronizada; o desembolso incremental pela assinatura e a estimativa própria do host são secundários. [Origem da tabela](https://github.com/unfold-research/bioswarm/blob/main/research/experiments/openbot-unfold-mode/study/config-2.json)

| Hipótese descritiva | Medida por caso | Melhor direção de C frente a A |
|---|---|---|
| H1a-01 | Custo estimado pela tabela fixa de tokens | Menor |
| H1a-02 | Tempo de parede observado | Menor |
| M1a-03 (checagem de manipulação) | Mensagens entre agentes, política e eventos de teto | Sem veredito de benefício |
| H1a-04 | Critérios de aceite satisfeitos (0–4) | Maior |
| H1a-05 | Desembolso incremental de modelo efetivamente faturado | Menor |

**Regra para H1a-01, H1a-02, H1a-04 e H1a-05.** Para cada semente calcular A−C quando menor é melhor e C−A quando maior é melhor. Usar a amplitude dos três valores de A (máximo menos mínimo, mesmas unidades) como variação entre casos. Sustentada somente com três diferenças positivas e mediana das diferenças estritamente maior que a amplitude de A. Refutada se C for igual ou pior em ao menos dois dos três pares. Demais resultados são inconclusivos. Pares faltantes, falha de integridade ou preço desconhecido deixam o desfecho inconclusivo. Desembolso exige confirmação do mecanismo de faturamento, sem inferir zero de uso ausente. **n=3 é descritivo**, sem inferência estatística ou extrapolação para investidores. Comparações com B são exploratórias.

Publicar também as quatro categorias de tokens sem ponderação, o tempo de fila, o tempo total decorrido, duração somada dos turnos, aceitações e custo total por aceite em cada braço. Incluir falhas atribuíveis ao braço no custo total; denominador de zero aceites é indefinido. Um timeout é falha de aceite; custo e uso observados são preservados. Uma falha operacional admite no máximo uma repetição por par caso/braço, com nova chave, sem atividade anterior e com o incidente e ambos os custos registrados.

## Emenda 1 · 25/11/2026 · antes das ativações e da amostra

SHA anterior: `56adf590f47fd03045e935bd54d22109be6a60ce`. Motivo: revisão metodológica do Research Leader. Somente três mudanças:

1. **H1a-04, qualidade.** Um par com 4/4 em ambos os braços recebe a anotação “empate no teto”. Se os dois braços atingirem o teto nos três casos ou empatarem em pelo menos dois pares, o veredito é **sem separação**. A regra de refutação por empate dos demais desfechos não se aplica nessa situação. Três pares completos continuam obrigatórios.
2. **M1a-03, mensagens.** A contagem mede a manipulação: C aplica um teto e A permite mensagens sem esse teto. Apresentar os números brutos, política recebida, tentativas recusadas e progresso após a recusa. Identificar quando o teto não chegou a atuar. Uma queda no número de mensagens não é um desfecho de benefício.
3. **Redação cega pré-fixada.** Antes da entrega, substituir por um marcador neutro as ocorrências de BioSwarm, OpenBot, stigwait, stigwait-tiebreak, tie-break/tiebreak, community/comunitária, baseline, rótulos braço/arm A, B ou C, campo(s), marca(s), rastro(s), ponte(s) e equivalentes ingleses field, mark(s), trace(s), bridge; também nomes e IDs dos três agentes, nomes das ferramentas de campo e envio, identificadores MCP do OpenBot e caminhos de arquivos absolutos ou relativos identificáveis. A correspondência ignora caixa. Aplicar a mesma lista em todos os braços. Registrar cada trecho substituído em arquivo privado com UUID, categoria, posição inicial e comprimento, sem copiar o texto. Fornecer ao revisor apenas a versão mascarada e a referência numérica. Se restar um identificador imprevisto, registrar a quebra e reter o pacote para emenda antes da avaliação; sem decidir novos critérios caso a caso.

### Emenda de 25/11/2026 · portão de aceite

Antes da amostra, fixamos o portão de aceite da extensão desligado nos braços A, B e C. Em A o conector está ausente. Em B e C o runner fixa `gate: null` no marcador local. Nenhum braço recebe um agente verificador independente como intervenção. A pontuação externa e a revisão cega continuam iguais para todos e não devolvem resultados à equipe durante a tentativa.

### Emenda de 25/11/2026 · adjudicador dos memorandos

O dono indicou o Claude `claude-opus-5-5`, esforço `medium`, pela conta do OpenBot. O prompt foi congelado no commit `dbf3e91994ce0af37375a6688bec155eeb0fd40c`. Aplicar o procedimento comum de pacote cego, chamada única, incidentes e limitações. [Emenda integral](BLIND-REVIEW.md)

**Complemento de 25/11, antes dos dados.** Rodar a calibração cega do adjudicador e exigir os 64 itens corretos nos oito memorandos congelados antes de iniciar tentativas. Um parecer indeterminado torna indeterminado o aceite da tentativa: seu par fica incompleto para custo por aceite e qualidade (H1a-01 e H1a-04). Se faltar qualquer par exigido, registrar ambos os desfechos como inconclusivos e não excluir a tentativa para recalcular o denominador. Preservar custo observado, tokens por categoria e tempo válido na descrição por tentativa. Na 1a, o custo estimado por tentativa permanece calculável mesmo quando não cabe um veredito pareado.

### Emenda de host · 25/11/2026

O dono definiu Pi direto no mesmo Mac para A, B e C. Esta decisão substitui a exigência anterior de host OpenBot, inclusive para a ativação. A Control continua no servidor da bancada. A ponte local e os relógios do runner serão verificados antes da amostra. O estudo mede o mecanismo no Pi. Instalação e ponte do OpenBot exigiriam outro ensaio. [Condições e controles da mudança de host](PROPOSTA-PI-DIRETO.md)

Iniciar somente com 20 GB livres e pausar abaixo de 10 GB. Medir disco, concorrência, carga, HTTP 429 e repetições por tentativa, conforme a emenda comum, e expor por braço junto de H1a-02.

**Emenda do prompt, 25/11/2026.** O lote v1 não passou no gate. Antes de qualquer tentativa de trabalhador, usar o prompt v2 e oito casos inéditos congelados em `d45298e7f0b455a1e3e48624fa29e7f559db5c40`. Manter a avaliação literal de JSON, o mesmo modelo, esforço, conta e critério de 64/64. [Gabaritos e regra](BLIND-REVIEW.md)

**Emenda de host · 26/11/2026 UTC.** O dono escolheu Pi nativo no servidor da bancada para os três braços e suas calibrações. A escolha substitui a indicação anterior do Mac como host dos trabalhadores. A Pesquisa aprovou o desenho condicional em `6204f04`. Antes de qualquer execução, exigir a reserva da Bancada, o login dedicado e os recibos de isolamento e capacidade. O juiz calibrado permanece no Mac. A fase 1a fica limitada ao smoke técnico do conector 0.1. [Condições do servidor da bancada](../phase1b/PROPOSTA-BENCH-HOST.md)
