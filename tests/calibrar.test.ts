// Não é um teste: imprime a curva de aprendizado para calibrar os parâmetros. Rode com
// CALIBRAR=1 npx vitest run tests/calibrar.test.ts --silent=false
import { it } from "vitest";
import { type Ritmo, RITMO, memoriaVazia, precisao } from "../src/ia/cerebro";
import { perfilVazio } from "../src/ia/perfil";
import { humano, partida, sementeira } from "./simulacao";

const variantes: Ritmo[] = process.env.VARIANTES
  ? JSON.parse(process.env.VARIANTES)
  : [RITMO];

it.runIf(process.env.CALIBRAR)("curva de aprendizado", { timeout: 600_000 }, () => {
  const blocos = [5, 10, 15, 20, 30, 40, 60];
  const sementes = 30;
  console.log("aleatória:", (precisao(memoriaVazia()) * 100).toFixed(1));
  for (const ritmo of variantes) {
    const linhas: string[] = [];
    const perde = Array(blocos.length).fill(0), prec = Array(blocos.length).fill(0), jogos = Array(blocos.length).fill(0);
    for (let s = 0; s < sementes; s++) {
      const r = sementeira(s + 1), m = memoriaVazia(), p = perfilVazio();
      let n = 0;
      blocos.forEach((ate, b) => {
        for (; n < ate; n++) {
          if (partida(m, p, humano, n % 2 === 1, r, ritmo) === "perdeu") perde[b]++;
          jogos[b]++;
        }
        prec[b] += precisao(m);
      });
    }
    blocos.forEach((ate, b) => linhas.push(`até ${ate}: perde ${(perde[b] / jogos[b] * 100).toFixed(0)}% prec ${(prec[b] / sementes * 100).toFixed(0)}`));
    console.log(JSON.stringify(ritmo), "|", linhas.join(" | "));
  }
});
