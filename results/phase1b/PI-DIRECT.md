# Ativação do Pi direto · conector 0.2

Em 25/11/2026, três workspaces Pi separados usaram gpt-6.1-sol com autenticação OAuth local. O runner técnico verificou dois arquivos de status fictícios. No primeiro caso o dono tentou gravar antes do requisito e o arquivo conservou o valor inicial. O candidato preterido pelo hash deixou uma marca, enviou o requisito endereçado, e o vencedor passou a gravar. No segundo caso o verificador observou a mesma falha após duas oportunidades de trabalho; na terceira onda o participante externo recebeu a atribuição e uma marca dirigida a ele, e corrigiu o arquivo. As três verificações do runner passaram.

| Medida | Observação |
|---|---:|
| Agentes / pedidos Pi / respostas de modelo | 3 / 7 / 15 |
| Entrada / leitura de cache / criação de cache / saída | 10.275 / 7.168 / 0 / 616 tokens |
| Tempo de parede do smoke completo | 37,282 s |
| Custo estimado pelo Pi | [US$ redacted] |

A política foi configurada localmente para exercitar o loop do Pi. O smoke não usou OpenBot nem a Control API. Não mediu custo faturado, ganho econômico, velocidade comparativa ou qualidade de tarefa longa. Os dados são anteriores e externos à amostra 1b. Comando: `node bench/pi-direct.mjs`.
