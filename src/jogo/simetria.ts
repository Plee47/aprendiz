/**
 * Um tabuleiro girado ou espelhado é a mesma situação. A IA guarda cada posição uma vez só,
 * na forma "canônica", o que faz ela aprender oito vezes mais rápido com cada partida.
 */
import type { Jogador, Tabuleiro } from "./tabuleiro";

type Transformacao = readonly number[];

const IDENTIDADE = [0, 1, 2, 3, 4, 5, 6, 7, 8];
const GIRO = [6, 3, 0, 7, 4, 1, 8, 5, 2];
const ESPELHO = [2, 1, 0, 5, 4, 3, 8, 7, 6];

// novo[i] = velho[a[b[i]]]
const compor = (a: Transformacao, b: Transformacao): number[] => b.map((j) => a[j]);

const giros = [IDENTIDADE, GIRO, compor(GIRO, GIRO), compor(compor(GIRO, GIRO), GIRO)];

export const SIMETRIAS: readonly Transformacao[] = [
  ...giros,
  ...giros.map((g) => compor(g, ESPELHO)),
];

/**
 * A posição vista por quem vai jogar: "m" são as minhas peças, "o" as do outro, "." vazio.
 * `t[i]` diz qual casa do tabuleiro real corresponde à casa i da forma canônica.
 */
export interface Visao {
  chave: string;
  t: Transformacao;
}

export function ver(tab: Tabuleiro, vez: Jogador): Visao {
  let melhor: Visao | null = null;
  for (const t of SIMETRIAS) {
    let chave = "";
    for (let i = 0; i < 9; i++) {
      const p = tab[t[i]];
      chave += p === 0 ? "." : p === vez ? "m" : "o";
    }
    if (melhor === null || chave < melhor.chave) melhor = { chave, t };
  }
  return melhor!;
}

export const paraCanonica = (v: Visao, casa: number): number => v.t.indexOf(casa);
export const paraReal = (v: Visao, i: number): number => v.t[i];
