# Abracadabra — sequência econômica de LAB-007

Data: 2026-11-10. Esta nota organiza a continuação dos LABs sob teto cumulativo de [US$ redacted] Não altera protocolos antigos, seus hashes, resultados ou gates. O cap global inclui os compromissos LAB-007 anteriores; não há cap monetário por batch novo.

## Estado e lote iniciado

O lote original `msgbatch_01LSzoreLHhpkHffu6x9CGH7` terminou com 240/240 respostas bem-sucedidas e zero erro, cancelamento ou expiração. O runner original terminou em `calibration-gate-failed`; a calibração registrada marcou acurácia limpa 0,7083 e 0/3 tipos de ataque aprovados. Isso não é evidência de eficácia ou ineficácia de uma defesa; bloqueia a comparação de defesas prevista no draft original, que não pode ser retunado retroativamente.

O único lote adicional elegível foi a auditoria instrumental limpa, protocolo novo e sem ataque, em `tasks/LAB-007-INSTRUMENT-AUDIT-PREREG.md`. Config hash `068e9d7d7bbe8b77f78145c33a005c5321af8e67b540718101d1db75734dbc24`; 432 respostas em duas ondas (288 round 0 e 144 dependentes no round 1), 24 state-trials em 8 verdades × 3 repetições e 72 trajetórias pareadas. R0 `msgbatch_01JHmtGrVHqRB85trM3QgHkY`: 288/288 sucesso, [US$ redacted] R1 `msgbatch_014RR5xAg7MDQpoRHjUQPX8i`: 144/144 sucesso, [US$ redacted] Uso novo total [US$ redacted]; custo global reconciliado, incluindo todo o LAB-007 anterior, [US$ redacted]/[US$ redacted] Ambas ondas foram reconciliadas e não há reserva pendente.

**Resultado do gate novo: `instrument-insufficient`.** LOCAL: regra de evidência parcial satisfeita em 144/144; FULL: 144/144 respostas corretas. RING: 115/144 corretas, 29 abstenções, zero decisões erradas. Todas as 144 solicitações R1 continham evidência suficiente para os três indicadores; as 144 respostas R0 preservaram o único fato local correto. Ainda assim, só 59/144 saídas RING emitiram três valores e apenas 38/144 emitiram todos os valores com referências rastreáveis. A análise pós-run encontrou 32 fatos emitidos sem citação de uma entrada que suporte exatamente o valor. O script de gate congelado só contou valores não nulos, embora o pré-registro exija referências rastreáveis; a auditoria estrita é um adendo, sem retocar hash, gate ou resultado. Relatório: `norevia/results/lab007-instrument-audit/POSTRUN-AUDIT.md`.

Naquele ponto, não havia outro lote pago elegível: o gate original falhou e a auditoria de citação no canal de pares era insuficiente. A comparação `NOSHARE`/`FIXED`/`ISO`/`IMM-lite` e os ataques factuais ou de autoridade foram bloqueados. O protocolo arquitetural novo descrito abaixo foi registrado com seeds novas; seu resultado não ajusta os dados antigos nem demonstra propagação. A comparação de defesas e a calibração de ataque continuam bloqueadas até validação adicional do instrumento e evidência de ataque observável.

## Arquitetura de agregação v1 — concluída

Como diagnóstico sem ataque, foi congelado um protocolo novo: `tasks/LAB-007-AGGREGATION-AUDIT-PREREG.md`, hash `8d9007a6cfbf354bb2cb418495a0600661f1d7a0eb43c7e36fbda5842f4465fc`. Ele pareia a apresentação textual atual com fatos JSON contendo IDs imutáveis em 24 casos novos (oito padrões × três seeds) e calcula um controle determinístico local sem consultar a verdade oculta nem preferir origens. Há 48 chamadas independentes Haiku e 24 resultados determinísticos locais; decisão, completude de fatos, suporte de citação e exatidão das fontes são endpoints separados. Os seis testes offline passaram, incluindo citação ausente/errada, parcialidade, conflito e política de teto total sem cap por batch.

Batch único `msgbatch_01ERqdXfUM6Yq8wyMqvDdGLA`, 48 pedidos, terminou 48/48; reserva pessimista [US$ redacted] foi reconciliada para uso estimado de [US$ redacted] O total global final é [US$ redacted]/50, sem reserva pendente. TEXT e STRUCTURED foram perfeitos em conjunto de fatos e citações nos 24 casos; decisão por evidência foi 23/24 e 24/24, respectivamente. O controle determinístico também acertou 24/24 regras de evidência, sem inferência. Isso valida apenas o screen sintético de agregação; não há ataque, topologia, propagação ou comparação de defesa. Manifesto, resultados e retomada em `norevia/results/lab007-aggregation-audit/`; interpretação em `POSTRUN-INTERPRETATION.md`.

Manifestos exatos e lock: `norevia/results/lab007-instrument-audit/manifests/`, `plan.json` e `frozen-lock.json`. Journal, estado e ledger: `norevia/results/lab007-instrument-audit/`. O runner faz reserva atômica das duas ondas no ledger global, recusa IDs/hashes diferentes, nunca reenvia um POST incerto e libera a reserva de R1 se a validação de R0 parar.

## O que os LABs anteriores ainda contribuem

| LAB | Evidência medida útil ao Abracadabra | Decisão para a sequência cyber |
|---|---|---|
| 001 | Revisão cega pode valer mais que coordenação; o outcome primário degenerou por falso sucesso em reparos. | Manter como referência de custo e revisão; não repetir arms de reparo como evidência de defesa. |
| 002 | Controller deixa conversa responsiva e threads absorvem espera; custo principal inconclusivo. | Reutilizar batching/threads só como engenharia do runner, não como contenção. |
| 003 | Partição por pacote ajuda em tarefas grandes; retry/recruit empatam; memória por tipo não ajudou na amostra. | Não repetir divisão/retry/memória em código para responder propagação de evidência. |
| 004 | Swarm real satura perto de N≈300; correlação torna voto arriscado; simulação cobre escala, sem transição de fase observada. | Reutilizar estimador de custo/correlação. Não gastar para repetir varredura de escala em microtarefas. |
| 005 | Cinco flags adicionais não mostraram efeito biológico próprio contra controles de engenharia. | Não reabrir esses flags sem hipótese cyber diferente e endpoint novo. |
| 006 | Allocator reduz custo em reparo de repositório em alguns regimes, mas perde para ORCH em aceitação agrupada e em bundles pequenos. | Reutilizar como mecanismo de alocação, não como defesa de integridade. |
| 007-E e explorações | Piloto teve saídas inválidas/truncadas; gate nativo posterior terminou sem sucesso. Exploração 768 respostas/64 trajetórias é pequena e não pareada, útil para instrumentar exposição/abstenção apenas. | Não juntar dados, seeds ou gates; não reivindicar propagação causal, nem comparar defesas. Usar a auditoria limpa separada e os novos IDs. |

## Próximos testes e dependências

1. **Auditoria limpa de instrumento — concluída:** R0 `msgbatch_01JHmtGrVHqRB85trM3QgHkY` e R1 `msgbatch_014RR5xAg7MDQpoRHjUQPX8i` terminaram e foram reconciliados. Resultado `instrument-insufficient`; os facts disponíveis não foram agregados/citados com consistência. O gate original permanece falho e intacto.
2. **Agregação arquitetural v1 — concluída:** batch independente `msgbatch_01ERqdXfUM6Yq8wyMqvDdGLA` compara formato textual, fatos estruturados e controle determinístico sem ataque. Ambos os formatos de modelo passaram o screen preregistrado; houve uma diferença descritiva (um erro de decisão no texto), insuficiente para alegar superioridade. O teste não reabre o gate original nem prova que ataques se propagam.
3. **Próxima etapa, ainda sem inferência:** antes de qualquer calibração de ataque, auditar a validade externa e ampliar o screen com casos autorais novos, pareados e previamente congelados; separar as suites de factualidade e autoridade/instrução, sem copiar ARGUS. Medir carrier, recepção, uptake, mudança errada, abstenção e utilidade benigna separadamente. Isso continua sendo calibração de endpoint, não comparação de defesa. Fixar casos e futilidade antes das respostas.
4. **Bloqueado no estado atual:** comparar `NOSHARE`, `FIXED`, isolamento convencional ou `IMM-lite`, topologias ou outras defesas. Reabrir só após instrumento íntegro e um ataque observável em dados novos; incluir utilidade benigna. O draft pareado antigo permanece um rascunho e tem regra monetária por batch obsoleta.
5. **Economia:** priorizar cobertura de casos/mecanismos e controles pareados antes de aumentar repetições. Toda proposta calcula `reserveFor` sobre manifesto exato, reserva total sob lock compartilhado e fica abaixo de [US$ redacted] com gastos/compromissos reais. Sem desconto de cache assumido; reconciliar pelos tokens retornados.

## Critérios de parada

- R0 com resposta faltante/inválida, mismatch de ID ou hash, truncamento acima do limite, custo não conciliável: parar; sem retry pago e sem R1.
- Gate limpo da auditoria falha: relatar instrumento insuficiente e preparar um protocolo separado, com novas seeds; não tunar nem reinterpretar os resultados prévios. O screen de agregação v1 foi concluído e passa seus critérios de usabilidade sintética, mas não altera o gate anterior nem autoriza inferência sobre propagação.
- Gate limpo passa, mas nova calibração de ataque não transmite/produz uptake observável: registrar futilidade daquele instrumento e não comparar defesas.
- Qualquer futura matriz acima do saldo do teto cumulativo: reduzir blocos pareados antes de congelar; não submeter parcialmente condições ou braços que destruam o pareamento.

## Fontes e limites

Reuso/lacunas: `norevia/library/defense/FOCUSED-DEFENSE-READING.md` (ARGUS/MisinfoTask como esquema conceitual sem licença presumida; Multi-CaMeL como separação de instrução/dado com limites de escopo; Prompt Infection para carrier vs sintomas; Agent Smith para carriage/recovery; AgentDojo para utilidade limpa/atacada e ASR separados). Este mapa é síntese de relatórios e notas locais, não uma nova validação humana dos papers. Os experimentos anteriores usam tarefas sintéticas/de código e não transferem diretamente para defesa cibernética real.
