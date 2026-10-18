# Tabelando

Futebol ao vivo: jogos do dia, placares em tempo real, tabelas (com tabela ao vivo), artilharia, mata-mata, agenda, escalações com fotos e onde assistir.

- `index.html` — o app (instalável no celular).
- `data.json` — agenda, canais, escalações, tabelas, artilharia e chaveamentos. **Atualizado de hora em hora pela automação** do Claude; o site relê este arquivo a cada 10 min.
- `players/` — fotos dos jogadores.
- Placar e lances ao vivo vêm direto da ESPN no navegador (a cada 30 s).

Publicado no Netlify (projeto `tabelando`), que faz deploy automático a cada commit na `main`.
