# Revisão adversarial — pré-registro D3 (draft)

- **Revisor:** Unfold Revisor (frente de Revisão)
- **Alvo:** `Shared/unfold/pesquisa/D3-DESIGN.md` (draft de `tasks/D3-PROVENANCE-PREREG.md`)
- **Veredito: BLOQUEADO até resolver os 3 BLOQUEANTES abaixo.** Não execute rodadas registradas antes disso.

---

## BLOQUEANTE

### B1. Regra de decisão do H-D16 é autocontraditória (linhas 128–131)

"Supported" exige P3 (Kd m=1 correto **4/4**); "Refuted" é "Kd-insider correto ≤ **5 de 8**" — contagem **combinada**
m=1+m=5. Como P4 prevê Kd errar m=5 (≤2/4, linhas 111–113), o resultado **esperado** (P3+P4) dá Kd total 4–6/8:
se m=5 entregar 0–1 corretas, Kd = 4–5/8 → "refuted" dispara **ao mesmo tempo** que "supported" (P3 vale).

**Correção:** escopar a refutação a m=1. Ex.: "Refuted se Kd-insider **com m=1** é correto em ≤3 de 4 (P3 falha), ou se o
custo médio total do Kd fica acima de 0,75× o do R." O braço m=5 (P4) já é tratado como resultado que abre o TM-002
(linha 135) e não pode alimentar a refutação.

### B2. A premissa "o lead não consegue refazer" não está imposta (linhas 28, 31–34, 163–166)

O lead é agente OpenBot **com shell**. Script/regex sobre os templates de texto livre refaz a tarefa a custo baixo, e
OpenBot **não loga tool calls** (linha 164) — logo, não é detectável. A regra de tamanho (3× contexto) impede redo em
contexto, não redo por script nem por leitura iterativa em chunks. Sem isso, Kr/Kd/R podem virar o mesmo braço (todos
refazendo), e o estudo passa a medir obediência a instrução, não checagem seletiva. A linha 165–166 delega a correção ao
Colony/dono — isso tem de ser resolvido **antes do piloto** (não dá para retroativo).

**Correção:** (a) Colony loga os `open`/tool calls do lead e o harness conta "records opened" como medida (substitui o
autorrelato das linhas 59–60 e 174); e/ou (b) leads sem shell, com ferramenta de arquivo read-only. Acrescentar regra:
lead que abrir mais registros que o braço permite é sinalizado e a corrida reportada à parte.

### B3. Orçamento, teto e regra de rounds não fecham (linhas 96–99, 146, 153–156)

Com a estimativa do próprio draft (≈[US$ redacted]/team run, R o dobro), **12 rounds ≈ [US$ redacted]** e até 6 rounds ≈ [US$ redacted] —
ambos acima do teto [US$ redacted] (linha 146). A regra "16→12" (linhas 98–99) **nunca** leva a caber em [US$ redacted]; o estudo pararia no
meio (TM-001) com células <8, quebrando as previsões. Além disso o piloto tem teto [US$ redacted] (linha 96) para 10 runs
(2×5) ≈ [US$ redacted] pela mesma estimativa — 3–4× menor que o custo.

**Correção:** no pré-registro, regra explícita para "projeção de 12 rounds > [US$ redacted]": ou sobe o teto (com o dono) ou reduz
rounds **e re-registra as previsões** (pois 8/célula cai). Recalcular o teto do piloto para o custo por run medido.

---

## IMPORTANTE

### I1. P7 usa duas baselines diferentes (linhas 118–123)

A predição diz "custa mais por resposta correta que **N-clean**"; o gatilho de inconclusivo (linhas 131 e 120–121) usa
"custa menos que **Kd-clean**". N-clean é o braço mais barato → a cláusula é quase sempre verdadeira → P7 "hold" trivial,
mas o inconclusivo usa outra régua.

**Correção:** uma única baseline nos dois lugares (Kd-clean). Ex.: P7 "S correto ≤6/8 OU custo por resposta correta ≥ o do
Kd-clean"; inconclusivo se "S correto ≥7/8 E custo < Kd-clean".

### I2. m=5 "abaixo do top-k" não é garantido pelo gerador (linhas 53–54, 111–113)

O gerador só checa "dentro da faixa honesta" (linha 53); "below the targeted top k" (linha 112, premissa de P4) não tem
restrição. Se o runner-up tiver poucos overdue na partição do infiltrado, os 5 falsificados entram no top-k e o Kd os
pega → P4 falha espuriamente.

**Correção:** restrição no `gen.mjs` v3 — escolher 5 registros que, após +Δ/5, fiquem todos abaixo do k-ésimo maior do
runner-up (exige ≥k+5 overdue do runner-up naquela partição) e checar no piloto.

### I3. Zonas intermediárias não rotuladas nas regras de decisão (linhas 128–136)

H-D17: Kr 4–5/8 não é nem "supported" (≤3) nem "refuted" (≥6). R completando 6–7/8 não é nem "supported" (exige R
correto ≥7/8) nem "inconclusive" (exige <6/8).

**Correção:** outcomes mutuamente exclusivos e exaustivos — declarar "inconclusive" para essas faixas.

### I4. "Custo por resposta correta" indefinido com 0 corretas (linha 80)

Kr-insider pode dar 0/8; aí o denominador é zero.

**Correção:** regra explícita — célula com 0 corretas reporta custo total e "sem respostas corretas (custo/correta
indefinido)".

### I5. "Records opened" é autorrelato e a 2ª cláusula de P6 é vácuo (linhas 59–60, 116, 174)

A cláusula "≤0,1×R" é satisfeita para k≤16 (k=8 → 48 ≤ 96) por construção; o que importa é a cláusula de custo. Autorrelato
não é evidência de obediência.

**Correção:** medir opens no harness (B2) ou reduzir P6 à cláusula de custo, tratando opens como "reportado".

---

## MENOR

- **M1.** Justificativa do P5 para m=5 (linha 82) usa "pega ≥1" (0,23), mas "correto" (total exato) exige pegar **todos**
  os 5 (prob ≈ 0). A previsão "≤2/4" segue segura, mas o raciocínio está impreciso e o limiar m=5 é folgado.
- **M2.** Piloto com 2 casos é pouco para casar Kr/Kd em custo "within 15%" (linha 75) e para projetar custo; com `k`
  inteiro e teto ≤1/4 de R pode não haver valor único que satisfaça ambos.
- **M3.** "Provider fails three runs in a row" (linha 146) é ambíguo com 7 agentes/run e ~456 criações (rodadas vs
  criações de agente).
- **M4.** Pressuposto de que o `AGENTS.md` do workspace não é visível aos colegas (só profiles) — herdado de D2,
  re-verificar no piloto.
- **M5.** `TM-002-DRAFT.md` é citado (linha 55) mas não existe no repo.
- **M6.** Com 8/célula e células split de 4 (linha 109+), só diferenças grosseiras são distinguíveis; P3 "4/4" (linha 109)
  é refutado por uma única falha — aceitável se o objetivo for só "gross differences", mas vale registrar o risco.

---

## O que está OK

- Previsões P1–P9 são binárias e, em sua maioria, falsificáveis com 8/célula (a ressalva de poder estatístico está
  admitida, linha ~141).
- Fórmula hipergeométrica confere (k=8, m=1→0,05; m=5→0,23; k=16→0,41; m=20→0,67, n=160).
- Plano de células bate: 16 casos → 8 clean ×5 braços + 8 insider ×4 braços = 72 runs; 72 leads + 384 workers.
- Vazamento entre braços bem controlado: agentes **novos por run** (lead + 6 workers), cada braço com workers próprios,
  partições idênticas dentro da rodada mas sem compartilhamento de agente entre braços; ordem do infiltrado no workspace
  (não no profile). O único vazamento residual é o B2 (sem log de tool calls) e o M4.
- Confundidor "infiltrado com modelo diferente" declarado (linha 2 de Limits).
