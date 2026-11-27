# LI19 — revisão independente (2026-11-18)

Reviewer: gpt-6-luna (fora da família Claude), com código, dados e pré-registro; sem APIs pagas.

| Severity | Finding | Response |
|---|---|---|
| MAJOR | Resultados primários confirmam forte vantagem de stigwait sobre manager, mas o experimento não discrimina stigwait de routed: ambos chegam a zero falhas finais em 15/16 casos; um caso de 120 módulos permanece com 2 falhas em routed. | — |
| MAJOR | Holdout confirma 16/16 stigwait contra 0/16 manager. Routed passa em 8/16; suas falhas frescas estão apenas em checks direcionados, em 2 casos k80 e 6 casos k120. | — |
| MAJOR | Evidência de escala é estreita: somente 8 sementes por tamanho, mesma família/modelo Haiku, tarefas sintéticas geradas e execução num único ciclo. Generalização além deste benchmark é incerta. | — |
| MINOR | O holdout é pós-execução e testa 40 entradas/check, não estava listado como hipótese registrada separada do resultado final; julgamento deve continuar limitado a essas entradas frescas. | — |
| MINOR | Auditoria operacional: waves 0–6 estão presentes em ambos tamanhos e os estados confirmam round 0 idêntico/compartilhado. Manager usa chamadas de plano na alternância e cumpre waveBudget; não há sinal de interrupção ou cap. Custos reais dos batches: [US$ redacted] (k80) + [US$ redacted] (k120), abaixo dos caps individuais de [US$ redacted]/12 e do ledger total de [US$ redacted] | — |

## Números rederivados

- **k80:** stigwait 8/8 resolvidos, soma final de falhas 0, holdout 8/8; manager 0/8, 278 falhas finais, holdout 0/8; routed 8/8, 0 falhas finais, holdout 6/8; oracle 8/8.
- **k120:** stigwait 8/8, 0 falhas, holdout 8/8; manager 0/8, 449 falhas, holdout 0/8; routed 7/8, 2 falhas finais, holdout 2/8; oracle 8/8.
- **Total:** H-LI58 stigwait vs manager: 16 casos melhores, 0 piores, p=0,0000305176, apoiada. H-LI59: 16 melhores, 0 piores, mesmo p; Holm p=0,0000610352, apoiada. H-LI60 vs routed: 1 melhor, 0 pior, p=1, inconclusiva. Holdout: stigwait 16/16, manager 0/16, routed 8/16, oracle 16/16.
- Refiz `node observatory/batch2/rc/verdict.mjs observatory/batch2/rc/sweeps/LI19.json`; saída reproduz `results/li19/verdicts.json` byte a byte. Amostras das requisições confirmam member calls com instruções e `max_tokens:8000`; resultados observados são compatíveis com stigwait e roteamento reivindicados.

Não reexecutei o sweep nem chamadas externas; contabilidade validada pelos journals locais e custos realizados nos batches. Não auditei individualmente todas as dezenas de milhares de linhas de requests/results.
