# TIOJOAO — Arquitetura, UX e wireframe

**Versão:** proposta conceitual / novembro de 2026  
**Objetivo:** site autoral para apresentar lives, organizar o acervo do canal, aproximar a comunidade e oferecer uma apresentação profissional a parceiros.

> O arquivo `tiojoao_prototipo.html` é uma maquete navegável responsiva. Não é um website publicado, nem tem autenticação, integrações ou banco de dados reais. Os dados de demonstração, inclusive status e capas abstratas, devem ser substituídos antes do lançamento.

## 1. Identidade visual

- **Conceito:** arquivo de histórias e jogos do Tiojoao, entre editorial cinematográfico e dashboard contemporâneo.
- **Tom:** pessoal, confiante e descontraído, sem aparência de portal genérico de e-sports.
- **Paleta:** fundo grafite `#080B10`, superfície `#111720`, texto claro `#F5F7F8`, apoio cinza-azulado `#96A3AE`, destaque verde-lima `#B9F56B`. Turquesa discreto como apoio.
- **Tipografia:** sans contemporânea, títulos pesados, letras próximas e bastante contraste hierárquico.
- **Componentes:** cards arredondados, bordas finas, thumbnails 16:9, chips de estado, filtros, carrossel horizontal, menu fixo com pouca altura.
- **Movimento:** microanimações de hover (150 a 220 ms); respeitar `prefers-reduced-motion`. Sem loops ou luzes piscando.
- **Conteúdo visual:** usar fotos suas e thumbs existentes depois. O protótipo emprega arte abstrata e dados ilustrativos para não simular métricas ou acontecimentos.

## 2. Sitemap público

```text
/                             HOME
/games                        BIBLIOTECA DE GAMES
/games/[slug]                 DETALHE DO JOGO
/videos                       CLIPES, VODS E VÍDEOS EDITADOS
/mural                        MURAL DE FOTOS E EVENTOS
/mural/[album]                ÁLBUM OU EVENTO
/comunidade                   ENQUETES + CÁPSULA DO TEMPO
/setup                        SETUP INTERATIVO
/parceiros                    MÍDIA KIT E CONTATO
/admin                        ÁREA PRIVADA, NÃO EXPOSTA NO MENU PÚBLICO
```

**Menu desktop:** Início | Biblioteca | Clipes & VODs | Mural | Comunidade | Setup | Parceiros. À direita, estado da live quando houver integração e um único CTA. **Mobile:** marca + menu compacto; CTAs grandes e grids de duas colunas quando houver espaço.

## 3. Homepage: composição em ordem

1. **Hero / primeira dobra**: marca TIOJOAO, frase que explica o site, status real da live ou “Offline”, botão primário para acompanhar a transmissão quando houver uma ativa, botão secundário para explorar os games e botões para as redes cadastradas. Arte com identidade própria.
2. **Clipes mais vistos**: carrossel com 3 itens visíveis no desktop, 1 a 1,2 no mobile. Ordenação por visualizações somente se houver dados confiáveis. Fallback para clipes escolhidos manualmente no painel.
3. **Minha jornada**: quatro cards de games, mix configurável entre finalizados e em andamento. Clicar abre página de jogo.
4. **A comunidade decide**: enquete ativa com data de encerramento. Caso não exista, trocar por agenda ou último resultado.
5. **Agenda**: próxima live confirmada, canal onde ocorrerá, horário no fuso do visitante e um link de calendário se desejado.
6. **Mural / destaques**: prévia de quatro fotos/álbuns com título curto e acesso ao mural completo.
7. **Rodapé**: redes, créditos, contato comercial, links de privacidade, acessibilidade e política de cookies se aplicável.

### Estados obrigatórios da Home

- **Ao vivo:** indicador somente depois de confirmação pela API, título, capa, jogo, link oficial, horário de início.
- **Offline:** próxima transmissão apenas se estiver agendada no painel; não inventar previsão.
- **Erro na integração:** estado neutro “Status temporariamente indisponível”, sem afirmar online/offline.
- **Sem conteúdo cadastrado:** mostrar destaques manuais e CTAs para as páginas já preenchidas.

## 4. Biblioteca de games

**Listagem:** busca por título; filtros Todos / Finalizados / Jogando / Dropados / Na fila; futuramente por plataforma, gênero, ano e nota. Cards: imagem, título, status, nota apenas quando cadastrada.

**Página `/games/[slug]`:** hero do jogo; ficha básica; sua nota e review curta; review longa opcional; tags de opinião; episódios e playlists em ordem; filtro de VOD / clipes / vídeo editado; galeria de imagens; “Próxima aventura” para navegação. Para jogos dropados, abrir campo **“Por que abandonei?”** e eventual “Voltaria a jogar?”. Não atribuir notas automaticamente.

**Dados sugeridos:** `Game{id,slug,title,cover,developer,genre,platforms,status,rating,review,startedAt,finishedAt,playedHours,dropReason,featured,publishedAt}` e relação `GameContent{gameId,contentId,order}`.

## 5. Clipes & VODs

- Filtros por tipo (Clipe, VOD, Vídeo editado), jogo e plataforma. Mais vistos / recentes somente se disponíveis.
- Visualização com thumbnail, título, jogo, origem, duração e data.
- Player oficial em modal ou navegação para o vídeo original, sem copiar/remultiplexar o conteúdo desnecessariamente.
- VODs com episódio, ordem da série, descrição e links de plataforma. Uma playlist completa precisa ser alcançável em até dois cliques.
- O catálogo pode ser manual inicialmente. Importação por APIs oficiais apenas quando autorizada e disponível, com atualização de métricas em cache.

## 6. Mural de fotos e eventos

**Experiência:** grade masonry com fotos em alturas variadas, hover discreto, filtros Eventos / Bastidores / Setup / Comunidade e opção de visualização cronológica.

**Clique:** lightbox com foto ampliada, título, data, legenda, tags, álbum, fotos anterior/próxima e vídeo relacionado quando houver. Upload pelo admin com corte, ordenação e texto alternativo. Usar imagens otimizadas e carregamento progressivo.

**Dados:** `Album{id,title,slug,eventDate,description,cover,visibility}` + `Photo{id,albumId,fileUrl,alt,caption,sortOrder}`. Algumas fotos podem ser privadas ou não publicadas, preservando a privacidade de pessoas retratadas.

## 7. Comunidade + cápsula do tempo

**Votações:** pergunta, opções, imagem opcional, abertura/encerramento, estado (rascunho / aberta / encerrada), critério para participantes, resultados e auditoria de votos. Resultado visível de acordo com regra definida. Reforçar controle anti-abuso no backend. A demonstração em HTML armazena apenas uma escolha local, não é uma votação pública.

**Cápsula do tempo:** trilha anual com cards de marcos do canal; cada um pode associar fotos, VODs, comentários e datas reais. Pode haver destaque “neste mês de outros anos”. Datas não cadastradas devem ficar como rascunho, sem inventar conquistas.

## 8. Setup interativo

- Foto panorâmica real do espaço, com pontos clicáveis numerados ou discretamente realçados.
- Painel do equipamento selecionado: nome, marca, modelo, categoria, breve comentário, foto e link opcional.
- Seções por geração do setup, para mostrar evolução sem transformar a página em uma lista de afiliados.
- Conteúdo administrável: adicionar/mover hotspot, trocar foto, ocultar produto e definir ordem.

## 9. Mídia kit e parceiros

**Fase inicial:** página editorial “Mídia kit em construção”, quem é Tiojoao, formatos de colaboração, redes e contato comercial.

**Quando as integrações estiverem prontas:** audiência e alcance por plataforma e período; metodologia e fonte dos números; data da última atualização; demografia apenas em nível agregado permitido; formatos de entregas, trabalhos anteriores reais, contatos e PDF exportável. Nunca misturar métricas vitalícias com recortes de 28/30 dias sem rótulo explícito.

## 10. Admin privado

### Navegação administrativa

```text
/admin
├── Visão geral             cards de status, pendências, publicação recente
├── Jogos                   criar/editar, status, nota, review, capa, VODs
├── Clipes e VODs           links, destaque, plataforma, tags, episódios
├── Mural e eventos         álbum, fotos, upload, crop, legenda, ordem
├── Enquetes                criar, abrir, encerrar, resultados
├── Agenda                  data/hora, título, plataforma, estado
├── Cápsula do tempo        marcos, datas, anexos, publicação
├── Setup                   equipamentos, hotspot e histórico
├── Mídia kit               narrativa, contatos, métricas verificadas
└── Configurações           redes, SEO, permissões, integrações, domínio
```

**Fluxo de inclusão de jogo:** Entrar com login → Jogos → Adicionar → informar título → escolher status → subir capa → cadastrar avaliação (opcional) → colar playlist/VODs → pré-visualizar → Publicar. Para dropados, campo específico de motivo.

**Fluxo do mural:** Admin → Mural → Novo álbum → data e descrição → upload de fotos → ordenar → escrever texto alternativo → prévia mobile/desktop → Publicar.

**Segurança real:** rota `/admin` separada, sessão segura com autenticação e MFA quando disponível, controle de acesso no servidor, autorização em cada operação, armazenamento privado de rascunhos, validação de upload, rate limit e log de alterações. “Esconder o botão” não torna o painel privado.

## 11. Regras de responsividade e acessibilidade

| Largura | Comportamento |
|---|---|
| ≥ 1200 px | menu completo, hero em duas colunas, catálogo até 4 colunas |
| 768–1199 px | nav compacto, hero adaptado, cards em 2–3 colunas |
| ≤ 767 px | menu sanduíche, hero empilhado, cards em 1–2 colunas, filtros em quebra ou rolagem horizontal |

Requisitos: contraste legível, foco visível em teclado, alvos de toque confortáveis, textos alternativos em fotos reais, legendas para mídia quando disponíveis, navegação por teclado em modais e respeito à preferência por movimento reduzido.

## 12. Integrações e implementação sugeridas

| Camada | Proposta |
|---|---|
| Frontend | Next.js + React + TypeScript + CSS modular ou Tailwind |
| Dados e arquivos | Supabase PostgreSQL + Storage ou equivalente gerenciado |
| Autenticação | Supabase Auth + políticas de autorização/RLS, MFA para admin quando disponível |
| Vídeos | player oficial e URLs autorizadas das plataformas |
| Indicador de live | APIs oficiais por servidor, cache e fallback “indisponível” |
| Analytics | solução de analytics para visitas ao próprio site; métricas de plataformas separadas |
| Imagens | upload validado, otimização, CDN e texto alternativo |
| Deploy | hospedagem compatível com Next.js, variáveis de ambiente e HTTPS |

**Twitch:** usar API e embeds oficiais, com OAuth apropriado. Respeitar limites, escopos e termos; evitar robôs que interajam pela interface ou alternem sessões automaticamente.  
**YouTube:** APIs e players oficiais; dados disponíveis variam conforme autorização e proprietário do canal.  
**Kick:** verificar disponibilidade, escopos e políticas atuais antes de prometer integração automática.  
**Instagram/TikTok:** links e embeds quando permitidos; automação depende de acesso às APIs e permissões.

## 13. Entrega em fases

**MVP 1:** identidade, Home, biblioteca com páginas de jogo, galeria de clipes e VODs, mural, painel privado básico de jogos e fotos, responsividade e SEO.

**MVP 2:** enquete real, timeline, agenda, setup interativo, upload completo, automações de status e destaque editorial.

**MVP 3:** mídia kit com métricas verificadas, mais integrações, dashboards, estatísticas históricas e otimização contínua.

### Critérios de qualidade para publicação

- Tudo que estiver “Ao vivo” realmente foi verificado.
- Nenhuma nota, quantidade de views ou ranking foi preenchido de forma fictícia.
- Toda página de jogo tem um estado de conteúdo vazio bem desenhado.
- Admin só acessível a usuários autorizados, incluindo APIs e armazenamento.
- Site funciona e não apresenta rolagem horizontal acidental no celular.
- Links sociais, VODs e mídia kit passam por revisão antes da publicação.
