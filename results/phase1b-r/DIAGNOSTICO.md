# 1b · diagnóstico retrospectivo das ondas

As 19 ondas de C demoraram em média 141,3 s. Nas 26 ondas de B, a média foi 93,1 s. Dos 48,2 s de diferença por onda, **34,4 s correspondem a mais tempo médio dentro dos turnos e 13,8 s a mais tempo com capacidade ociosa da equipe**. A decomposição usa os recibos do executor. Para cada braço, dividimos os segundos-agente pela soma de ondas e pelos três agentes. Subtraímos essa média da média de parede observada. Uma onda termina quando o último agente acaba. As ondas são etapas de quantidades de trabalho diferentes, e C terminou o caso em menos etapas. A decomposição descreve como o tempo se distribuiu.

| Segundos por onda | B | C |
|---|---:|---:|
| Parede observada | 93,1 | 141,3 |
| Dentro dos turnos, por agente | 65,8 | 100,2 |
| Fora dos turnos, por agente | 27,3 | 41,1 |

Na Control recuperamos os 57 pares início/fim de C e 75 dos 78 de B. Por isso, a tabela detalhada abaixo usa C e a comparação dos braços usa as medidas completas do executor. Em C, 19 das 22 recusas por falta de rastro e as cinco cessões ocorreram na primeira onda. **As 22 recusas foram seguidas por outra chamada de ferramenta no mesmo turno.** Os intervalos até a chamada seguinte somaram 110,7 segundos-agente. Esses intervalos podem incluir inferência e planejamento. O conector da 0.2 recusa uma escrita imediatamente e não suspende o relógio do agente.

O evento de recusa da 0.2 omite o identificador do check. Reconstituímos o conjunto de arquivos que aquele agente estava autorizado a escrever naquela onda, usando o mapa, a lista de falhas e a atribuição exata da 0.2. Uma recusa só é compatível com um desses arquivos. **Entre 2 e 15 das 22 recusas podem ser atribuídas a tarefas de dono único sem dependência externa** (classe own). Duas são certas. Não há tempo de espera causal identificável por arquivo. Uma atribuição exata dos 48,2 s à política exigiria observações que a 1b não recolheu.

Na segunda onda da semente 3163 não houve recusa por rastro. Ainda assim, Rui ficou 158,9 s à espera do fim da onda e Teo 156,0 s. Isso mostra por que é preciso separar a espera pelo agente mais demorado da recusa de uma ferramenta.

## Cada onda de C

Em cada célula de agente, os números são **segundos dentro do turno / segundos após o seu fim até o último colega / recusas por rastro / cessões**. O tempo dentro do turno inclui chamadas ao provedor e às ferramentas. A diferença inicial entre despachos nos 57 turnos somou 0,066 s. O JSON acompanha os intervalos pós-recusa em milissegundos e os limites por classe para cada agente.

| Semente | Onda | Parede na Control (s) | Lia | Rui | Teo |
|---|---:|---:|---|---|---|
| 3109 | 1 | 150,3 | 136,2 / 14,1 / 1 / 0 | 118,4 / 31,9 / 0 / 1 | 150,3 / 0,0 / 1 / 0 |
| 3109 | 2 | 211,0 | 211,0 / 0,0 / 1 / 0 | 39,5 / 171,5 / 0 / 0 | 64,4 / 146,6 / 0 / 0 |
| 3109 | 3 | 69,4 | 69,4 / 0,0 / 0 / 0 | 65,3 / 4,1 / 0 / 0 | 55,5 / 14,0 / 0 / 0 |
| 3163 | 1 | 140,9 | 140,9 / 0,0 / 1 / 0 | 108,8 / 32,1 / 1 / 1 | 137,4 / 3,5 / 1 / 0 |
| 3163 | 2 | 199,1 | 199,1 / 0,0 / 0 / 0 | 40,2 / 158,9 / 0 / 0 | 43,1 / 156,0 / 0 / 0 |
| 3163 | 3 | 44,4 | 31,1 / 13,3 / 0 / 0 | 32,3 / 12,1 / 0 / 0 | 44,4 / 0,0 / 0 / 0 |
| 3217 | 1 | 187,6 | 187,6 / 0,0 / 1 / 0 | 130,1 / 57,5 / 1 / 1 | 176,4 / 11,3 / 1 / 0 |
| 3217 | 2 | 165,1 | 165,1 / 0,0 / 0 / 0 | 54,7 / 110,4 / 0 / 0 | 52,1 / 112,9 / 0 / 0 |
| 3217 | 3 | 107,0 | 107,0 / 0,0 / 0 / 0 | 42,2 / 64,7 / 0 / 0 | 31,6 / 75,4 / 0 / 0 |
| 3217 | 4 | 132,6 | 132,6 / 0,0 / 0 / 0 | 74,8 / 57,8 / 0 / 0 | 106,2 / 26,4 / 0 / 0 |
| 3271 | 1 | 184,5 | 169,2 / 15,3 / 1 / 1 | 130,4 / 54,2 / 1 / 0 | 184,5 / 0,0 / 1 / 0 |
| 3271 | 2 | 120,3 | 120,3 / 0,0 / 0 / 0 | 99,9 / 20,4 / 0 / 0 | 48,2 / 72,1 / 0 / 0 |
| 3271 | 3 | 48,7 | 35,7 / 13,0 / 0 / 0 | 28,6 / 20,1 / 0 / 0 | 48,7 / 0,0 / 0 / 0 |
| 3323 | 1 | 171,6 | 171,6 / 0,0 / 2 / 0 | 133,5 / 38,0 / 1 / 1 | 145,2 / 26,4 / 1 / 0 |
| 3323 | 2 | 122,4 | 122,4 / 0,0 / 0 / 0 | 34,6 / 87,8 / 0 / 0 | 70,1 / 52,3 / 1 / 0 |
| 3323 | 3 | 210,1 | 210,1 / 0,0 / 0 / 0 | 84,3 / 125,8 / 0 / 0 | 23,0 / 187,1 / 0 / 0 |
| 3371 | 1 | 201,5 | 201,5 / 0,0 / 2 / 0 | 111,5 / 90,0 / 1 / 0 | 131,5 / 69,9 / 1 / 0 |
| 3371 | 2 | 177,7 | 177,7 / 0,0 / 0 / 0 | 76,5 / 101,3 / 0 / 0 | 97,1 / 80,6 / 1 / 0 |
| 3371 | 3 | 39,3 | 29,6 / 9,8 / 0 / 0 | 39,3 / 0,0 / 0 / 0 | 35,7 / 3,6 / 0 / 0 |

**Desenho da 0.3.** Aplicar espera endereçada apenas a dependência dirigida no arquivo em questão. Em disputa simétrica, selecionar um único escritor e registrar a cessão do outro candidato. Em trabalho próprio, o rastro é informativo e pode indicar prioridade. O agente pode seguir com os outros arquivos no mesmo turno. Preservar as regras da 0.2 para hosts que ainda publicam ondas sem classes. O experimento em sementes inéditas verificará custo, tempo, qualidade e disputas abertas. Zero disputas e menos ondas são resultados a medir novamente.

Fonte interna: recibos de 18 tentativas e eventos da Control associados por janela do executor, agente e sequência de início/fim. O coletor confere por semente as 22 recusas e as cinco cessões contra os recibos de C. [Medições sanitizadas](DIAGNOSTICO-ONDAS.json) · [Coletor offline](../../scripts/phase1b-wave-diagnosis.mjs) · [Relatório original](../phase1b/REPORT.md)
