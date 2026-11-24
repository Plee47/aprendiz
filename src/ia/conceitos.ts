/**
 * Conceitos são o que a IA consegue perceber num lance. Ela não sabe de antemão quais são bons:
 * cada um começa com peso 0 e o peso é aprendido jogando. É isso que permite generalizar: perder
 * uma vez por não bloquear ensina a bloquear em qualquer posição, não só naquela.
 */
import {
  type Jogador,
  type Tabuleiro,
  LINHAS,
  jogar,
  lancesVencedores,
  outro,
  tipoDaCasa,
} from "../jogo/tabuleiro";

export const CONCEITOS = [
  "fechar",
  "bloquear",
  "ignorar",
  "garfo",
  "antigarfo",
  "ameaca",
  "centro",
  "canto",
  "cantoOposto",
  "lateral",
] as const;

export type Conceito = (typeof CONCEITOS)[number];

export const DESCRICAO: Record<Conceito, { nome: string; frase: string }> = {
  fechar: { nome: "Fechar a linha", frase: "completar três em linha" },
  bloquear: { nome: "Bloquear", frase: "bloquear uma linha sua" },
  ignorar: { nome: "Ignorar ameaça", frase: "deixar uma linha sua aberta" },
  garfo: { nome: "Garfo", frase: "abrir duas ameaças de uma vez" },
  antigarfo: { nome: "Desarmar garfo", frase: "ocupar a casa onde você armaria um garfo" },
  ameaca: { nome: "Ameaçar", frase: "deixar duas em linha com a terceira livre" },
  centro: { nome: "Centro", frase: "tomar o centro" },
  canto: { nome: "Canto", frase: "jogar num canto" },
  cantoOposto: { nome: "Canto oposto", frase: "jogar no canto oposto ao seu" },
  lateral: { nome: "Lateral", frase: "jogar numa lateral" },
};

export type Tracos = Record<Conceito, number>;

/** Quantas linhas abertas (duas peças minhas e a terceira vazia) existem para `j`. */
function ameacas(t: Tabuleiro, j: Jogador): number {
  let n = 0;
  for (const [a, b, c] of LINHAS) {
    const pecas = [t[a], t[b], t[c]];
    if (pecas.filter((p) => p === j).length === 2 && pecas.includes(0)) n++;
  }
  return n;
}

const OPOSTO: Record<number, number> = { 0: 8, 2: 6, 6: 2, 8: 0 };

/** Os conceitos presentes no lance `casa` de quem joga com `vez`. */
export function tracos(t: Tabuleiro, vez: Jogador, casa: number): Tracos {
  const rival = outro(vez);
  const depois = jogar(t, casa, vez);
  const minhasVitorias = lancesVencedores(t, vez);
  const delaVitorias = lancesVencedores(t, rival);
  const fecha = minhasVitorias.includes(casa);
  const bloqueia = delaVitorias.includes(casa);
  const novas = fecha ? 0 : ameacas(depois, vez) - ameacas(t, vez);
  const tipo = tipoDaCasa(casa);
  const garfoDoRival =
    !fecha && !bloqueia && ameacas(jogar(t, casa, rival), rival) - ameacas(t, rival) >= 2;
  return {
    fechar: fecha ? 1 : 0,
    bloquear: bloqueia && !fecha ? 1 : 0,
    ignorar: delaVitorias.length > 0 && !bloqueia && !fecha ? 1 : 0,
    garfo: !fecha && ameacas(depois, vez) >= 2 && novas >= 1 ? 1 : 0,
    antigarfo: garfoDoRival ? 1 : 0,
    ameaca: !fecha && novas >= 1 ? 1 : 0,
    centro: tipo === "centro" ? 1 : 0,
    canto: tipo === "canto" ? 1 : 0,
    cantoOposto: tipo === "canto" && t[OPOSTO[casa]] === rival ? 1 : 0,
    lateral: tipo === "lateral" ? 1 : 0,
  };
}

export const pesosZerados = (): Tracos =>
  Object.fromEntries(CONCEITOS.map((c) => [c, 0])) as Tracos;

export const produto = (w: Tracos, f: Tracos): number =>
  CONCEITOS.reduce((s, c) => s + w[c] * f[c], 0);
