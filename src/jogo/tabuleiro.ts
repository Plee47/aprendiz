/** Regras do jogo da velha. Casas numeradas de 0 a 8, linha por linha. */

export type Jogador = 1 | 2;
export type Peca = 0 | Jogador;
export type Tabuleiro = readonly Peca[];

export const XIS: Jogador = 1;
export const BOLA: Jogador = 2;

export const LINHAS: readonly (readonly [number, number, number])[] = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

export const tabuleiroVazio = (): Peca[] => Array<Peca>(9).fill(0);

export const outro = (j: Jogador): Jogador => (j === XIS ? BOLA : XIS);

export function livres(t: Tabuleiro): number[] {
  const casas: number[] = [];
  for (let i = 0; i < 9; i++) if (t[i] === 0) casas.push(i);
  return casas;
}

export function jogar(t: Tabuleiro, casa: number, j: Jogador): Peca[] {
  if (t[casa] !== 0) throw new Error(`casa ${casa} ocupada`);
  const novo = [...t];
  novo[casa] = j;
  return novo;
}

export interface Vitoria {
  jogador: Jogador;
  linha: readonly [number, number, number];
}

export function vencedor(t: Tabuleiro): Vitoria | null {
  for (const linha of LINHAS) {
    const [a, b, c] = linha;
    const p = t[a];
    if (p !== 0 && p === t[b] && p === t[c]) return { jogador: p, linha };
  }
  return null;
}

/** Resultado de uma partida terminada: quem venceu, ou 0 para empate. null se ainda está em jogo. */
export function resultado(t: Tabuleiro): Peca | null {
  const v = vencedor(t);
  if (v) return v.jogador;
  return livres(t).length === 0 ? 0 : null;
}

/** Casas que completam uma linha para `j` neste lance. */
export function lancesVencedores(t: Tabuleiro, j: Jogador): number[] {
  return livres(t).filter((c) => vencedor(jogar(t, c, j))?.jogador === j);
}

const NOMES = [
  "canto de cima à esquerda",
  "meio de cima",
  "canto de cima à direita",
  "meio da esquerda",
  "centro",
  "meio da direita",
  "canto de baixo à esquerda",
  "meio de baixo",
  "canto de baixo à direita",
];

export const nomeDaCasa = (casa: number): string => NOMES[casa];

export type TipoDeCasa = "canto" | "centro" | "lateral";

export const tipoDaCasa = (casa: number): TipoDeCasa =>
  casa === 4 ? "centro" : casa % 2 === 0 ? "canto" : "lateral";
