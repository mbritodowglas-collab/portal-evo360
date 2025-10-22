# portal-evo360
App web estático (GitHub Pages) com progressão por níveis, PWA instalável e ferramentas locais.

## Como usar
1. Rode `python3 scripts/gen_slugs.py` para gerar páginas privadas com slugs aleatórios e manifests por nível.
2. Faça commit/push no GitHub. Ative Pages (branch main / root).

## O que inclui
- PWA por nível (botão **Baixar o App**) e SW offline básico
- Drip diário (conteúdo gotejado)
- Habit Tracker, Recompensas e Visualização Mental
- **Check-in Diário Inteligente** com resposta automática (intensidade e atividade sugerida)
- Dados exemplo: `_data/fundacao.json` (7 dias)

## Importante
- `_private/mapa-portais.json` contém os códigos dos links privados (não é publicado).
- Todos os caminhos são relativos (compatível com project site do GitHub Pages).
