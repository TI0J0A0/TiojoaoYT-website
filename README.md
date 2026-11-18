# TiojoaoYT-website

Site do Tiojoao — [tiojoaoyt.com](https://tiojoaoyt.com)

Página única (`index.html`) com status das lives, vídeos e Shorts do YouTube, comunidade do Discord e redes.

## Estrutura

| Caminho | O que é |
|---|---|
| `index.html` | O site (HTML, CSS e JS num arquivo só). Links e conteúdos editáveis no objeto `CONFIG`, no fim do arquivo. |
| `assets/` | Imagens otimizadas usadas no site. |
| `api/live.js` | Função de servidor: status ao vivo da Twitch. |
| `api/videos.js` | Função de servidor: últimos vídeos/Shorts do YouTube (RSS, cache de 30 min). |
| `data/videos.json` | Reserva dos vídeos, caso a função falhe (`python scripts/update_videos.py`). |
| `scripts/dev-server.mjs` | Servidor local que roda o site + `/api`. |

## Rodar no computador

1. Copie `.env.example` para `.env.local` e preencha as chaves.
2. `npm run dev` e abra http://localhost:5173

## Publicação (Vercel)

Cada push na branch `main` publica automaticamente. Variáveis de ambiente em
**Vercel → Settings → Environment Variables**: `TWITCH_CLIENT_ID`, `TWITCH_CLIENT_SECRET`, `TWITCH_LOGIN`.

> Nunca envie `.env.local` nem chaves para o repositório.
