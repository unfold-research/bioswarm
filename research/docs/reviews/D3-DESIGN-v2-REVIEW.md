# Revisão adversarial — D3 preregistration v2

- **Revisor:** Unfold Revisor. **Alvo:** `Shared/unfold/pesquisa/D3-DESIGN-v2.md` (substitui v1).
- **Veredito: APROVADO com RESSALVAS** (sem BLOQUEIO). Decisões do Leader aplicadas (toollog.mjs; bash em R/S isento;
  parâmetros do gerador margin ≤3% + bump ~300).

## Itens de v1 → v2: conferidos

- **B1** H-D16 refutada só em m=1: OK (linha 156, 160; m=5 nunca entra na decisão).
- **B2** shell mantido, detecção por `toollog.mjs`: OK (seção "detection only"; o banco não guarda tool names — confirmado
  pelo Runs; `toollog.mjs` lê os logs de sessão do Pi e o banco do OpenCode).
- **B3** orçamento 12/8/stop, piloto ≤ [US$ redacted] registrado ≤ [US$ redacted]: OK.
- **I1** uma baseline (Kd-clean) em H-D18: OK (linhas 158-159).
- **I2** m=5 abaixo do top-k: OK (garantia 5, linha 57, contra o top-k combinado de W e R).
- **I3** regras exaustivas/exclusivas: OK (verificado H-D16/17/18; meio sempre "inconclusive"; "not estimable without the
  shell" para célula <3 runs).
- **I4** CPC indefinido com 0 corretas: OK (linhas 115-116).
- **I5** opens via toollog (autorrelato só diagnóstico): OK.
- **M1–M6**: tratados (k fixo 16; "3 runs seguidos" = team runs; AGENTS.md no piloto; TM-002 como draft; células 4/8 com
  fragilidade declarada).

## RESSALVAS

### R1 (importante) — P6 e H-D16 apontam para lados opostos; o veredito esperado de H-D16 não está escrito
P6 prevê **CPC(R) < CPC(Kd)** (linha 144); a condição "cheaper" de H-D16 exige **CPC(Kd) < CPC(R)** (linha 154). Sob
P2 (R ≈ perfeito, ~4/4 em m=1) e P3 (Kd m=1 ≈ 50%), "cheaper" é previsto **falso** e H-D16 é previsto **refutado** —
porque o custo do time é dominado pelos 6 workers (idênticos entre braços) e a diferença do lead (96 vs 960 records) é
pequena, então o CPC é decidido quase todo pelo acerto, não pelo custo. **Correção:** escrever o veredito esperado de
H-D16 e uma frase explicando que "cheaper" exige Kd ≈ R em acerto (improvável se R for quase perfeito). P6, do jeito que
está, é quase tautológica (R acerta tudo → menor CPC); rotular.

### R2 (importante) — "Δ about 300" contradiz "Δ = margin + 300"; e a garantia 4 limita o margin de fato
Linha 60 diz "Δ about 300", mas a garantia 4 (linha 54) define **Δ = margin + ~300**, com margin 0,5–3% de um vencedor de
~850k ⇒ Δ ≈ 4,5k–25,8k (o "300" é só o bump além do margin). Além disso, a garantia 4 (valor falso ≤ percentil 90 ≈ 8,6k)
só é satisfazível para **margin ≲ 0,9%** em m=1 (um único registro não absorve bump > ~8k ficando ≤ percentil 90). O draft
já deixa isso implícito ("83% comply", "mean margin 0.75%"), mas a garantia 1 ainda diz "até 3%". **Correção:** trocar
"Δ about 300" por "bump about 300" e declarar o teto efetivo do margin para m=1 (ou o gerador rejeita silenciosamente os
casos de margin alto). Confirmei que v2 usa a faixa validada pelo Runs (≤3% + bump ~300): sim, está na linha 51.

### R3 (importante) — assimetria da exclusão de bash no contraste de custo
R e S entram nos contrastes de custo com **todas** as rodadas; N/Kr/Kd entram sem as rodadas com bash/fora-da-lista. As
rodadas excluídas podem ser justamente as mais baratas, fazendo os braços amostrados parecerem mais caros (o draft admite,
linha 91). E P9 prevê Kr/Kd com **≥5 de 12** rodadas de bash (o modelo tende a `cat` os 96 arquivos), o que empurra as
células principais de Kr/Kd para perto do piso de 3 runs ("not estimable"). **Correção:** manter (já está bem escrito),
mas deixar explícito no REPORT que, se Kr/Kd caírem abaixo de 3 runs principais, a comparação amostrada é decidida só pela
tabela all-runs e perde a interpretação "sampled".

## MENOR

- **M1** Piloto: "59 agents" deveria ser **57** (9 runs: 4×7+1 = 29 + 4×7 = 28). Typo.
- **M2** P4, 1ª cláusula ("Kr/Kd ≤ 1,25× N") é quase tautológica (amostra de 2,7k tokens contra custo de workers idêntico).
- **M3** H-D18 "supported" é quase piso por desenho (limit 4 admite) — resultado de piso, não mecanismo.
- **M4** P3 ("1–3 de 4") é banda folgada (c=0 ou 4 ≈ 6% cada); o parser de bash do toollog subconta (só leitores simples);
  ambos declarados.

## OK

Sem contradição nas regras de decisão (exaustivas/exclusivas); CPC sem divisão por zero; 8-round com contagens nos
colchetes; parâmetros do gerador na faixa validada pelo Runs; sem vazamento entre braços (agentes novos por run, toollog
por agente).
