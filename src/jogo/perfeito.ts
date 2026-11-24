/**
 * Jogo perfeito por minimax. A IA não usa isto para jogar: serve para a dica do jogador e
 * para medir, com honestidade, quanto a IA já aprendeu (a "precisão").
 */
import { ver } from "./simetria";
import {
  type Jogador,
  type Peca,
  type Tabuleiro,
  jogar,
  livres,
  outro,
  resultado,
  tabuleiroVazio,
} from "./tabuleiro";

const memo = new Map<string, number>();

/** Valor da posição para quem vai jogar: 1 ganha, 0 empata, -1 perde (com jogo perfeito dos dois). */
export function valor(t: Tabuleiro, vez: Jogador): number {
  const r = resultado(t);
  if (r !== null) return r === 0 ? 0 : r === vez ? 1 : -1;
  const chave = ver(t, vez).chave;
  const salvo = memo.get(chave);
  if (salvo !== undefined) return salvo;
  let melhor = -2;
  for (const c of livres(t)) {
    melhor = Math.max(melhor, 0 - valor(jogar(t, c, vez), outro(vez)));
    if (melhor === 1) break;
  }
  memo.set(chave, melhor);
  return melhor;
}

/** Valor de cada lance possível para quem vai jogar. */
export function valoresDosLances(t: Tabuleiro, vez: Jogador): Map<number, number> {
  const m = new Map<number, number>();
  for (const c of livres(t)) m.set(c, 0 - valor(jogar(t, c, vez), outro(vez)));
  return m;
}

/** Os lances perfeitos. Entre os que ganham, prefere os que ganham já. */
export function lancesPerfeitos(t: Tabuleiro, vez: Jogador): number[] {
  const valores = valoresDosLances(t, vez);
  const max = Math.max(...valores.values());
  const bons = [...valores].filter(([, v]) => v === max).map(([c]) => c);
  const imediatos = bons.filter((c) => resultado(jogar(t, c, vez)) === vez);
  return imediatos.length > 0 ? imediatos : bons;
}

export interface Posicao {
  tab: Peca[];
  vez: Jogador;
}

let posicoes: Posicao[] | null = null;

/** Todas as posições alcançáveis em que ainda há lance, uma por forma canônica. */
export function todasAsPosicoes(): Posicao[] {
  if (posicoes) return posicoes;
  const vistas = new Set<string>();
  const lista: Posicao[] = [];
  const visitar = (tab: Peca[], vez: Jogador) => {
    if (resultado(tab) !== null) return;
    const chave = ver(tab, vez).chave;
    if (vistas.has(chave)) return;
    vistas.add(chave);
    lista.push({ tab, vez });
    for (const c of livres(tab)) visitar(jogar(tab, c, vez), outro(vez));
  };
  visitar(tabuleiroVazio(), 1);
  posicoes = lista;
  return lista;
}
