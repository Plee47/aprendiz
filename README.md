# Aprendiz

Jogo da velha contra uma IA que **começa sem saber nada**, nem que três em linha vence, e aprende
jogando contra você. A cada rodada ela fica mais difícil, e explica o que está pensando: por que
jogou onde jogou, o que aprendeu com a partida e o que já percebeu sobre o seu jeito de jogar.

**[Jogar no navegador](https://plee47.github.io/aprendiz/)**, sem instalar nada e também no celular.

## Destaques

- **Aprende de verdade, aos poucos.** Aprendizado por reforço, sem nada pré-programado: em
  partidas simuladas contra um jogador casual, ela perde cerca de 80% das 5 primeiras rodadas e
  cerca de 15% a partir da 20ª.
- **Explica cada lance com o que de fato calculou.** "Joguei no centro para bloquear uma linha
  sua. Aprendi isso na partida 3, e hoje vale +0,62 para mim."
- **Mostra a mente dela.** Antes de cada lance, um mapa de calor mostra a chance que ela dá a cada
  casa. A aba Conceitos mostra o peso de cada ideia que ela já aprendeu, e a aba Evolução, a curva
  de aprendizado.
- **Estuda você.** Ela anota como você responde em cada posição e, quando já viu você repetir um
  lance, olha uma jogada à frente contando com o seu hábito.
- **Upgrades com as vitórias.** Vencer dá faíscas, e vencer uma IA mais forte dá mais. Na Oficina
  elas compram poderes (dica, desfazer, amnésia da IA), visões da mente dela, temas e efeitos.

## Como a IA funciona

| Peça | O que faz |
|---|---|
| Conceitos | Dez coisas que ela percebe num lance: fechar a linha, bloquear, ignorar uma ameaça, armar um garfo, desarmar o seu, ameaçar, centro, canto, canto oposto e lateral. Ela não sabe quais são bons: cada um tem um peso que começa em zero. Por isso perder uma vez por não bloquear ensina a bloquear em qualquer posição |
| Lembranças | Um ajuste por posição exata, para os detalhes que os conceitos não pegam. Posições giradas ou espelhadas contam como a mesma (8 simetrias) |
| Aprendizado | Monte Carlo: no fim da partida, cada lance, dela e seu, puxa o próprio valor na direção do resultado (+1 vitória, −1 derrota, +0,3 empate), com desconto para os lances mais antigos. A correção se divide entre os conceitos e a lembrança |
| Curiosidade | Ela escolhe por softmax com uma temperatura que cai a cada partida: no começo arrisca bastante, depois fica firme |
| Leitura de você | Um modelo de frequências das suas respostas por posição. Com duas observações, entra no cálculo como uma jogada à frente |
| Precisão | Um jogador perfeito (minimax) define o lance certo em todas as posições do jogo em que dá para errar. A precisão é a chance de ela jogar um desses, do jeito que joga de verdade. É ela que define o nível: Recém-nascida, Curiosa, Aprendiz, Estrategista e Mestre |

O minimax serve só para medir a IA e para a dica do jogador. Ela nunca usa ele para jogar.

Os parâmetros foram calibrados com partidas simuladas (`tests/calibrar.test.ts`), para que a
dificuldade suba aos poucos ao longo das primeiras vinte rodadas.

## Rodar no seu computador

```bash
npm install
npm run dev      # abre em http://localhost:5173
npm test         # testes das regras, da IA e do aprendizado
npm run build    # site estático em dist/
```

Para ver a curva de aprendizado simulada:

```bash
CALIBRAR=1 npx vitest run tests/calibrar.test.ts --silent=false
```

## Estrutura

```
src/
  jogo/        regras, simetrias e o jogador perfeito (minimax)
  ia/          cérebro (aprendizado), conceitos, perfil do jogador e explicações
  ui/          efeitos de partículas e o gráfico de evolução
  progresso.ts faíscas, Oficina, níveis e o que fica salvo
  main.ts      a partida e a interface
```

Feito com TypeScript e Vite, sem servidor e sem dependências em tempo de execução além das fontes.
O que a IA aprende fica salvo só no seu navegador.
