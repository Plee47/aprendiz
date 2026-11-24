/** Jogadores simulados e partidas automáticas, para testar e calibrar o aprendizado. */
import { type Lance, type Memoria, type Ritmo, RITMO, aprender, escolher } from "../src/ia/cerebro";
import { type Perfil, registrar } from "../src/ia/perfil";
import {
  type Jogador,
  type Peca,
  jogar,
  lancesVencedores,
  livres,
  outro,
  resultado,
  tabuleiroVazio,
} from "../src/jogo/tabuleiro";

/** Gerador pseudoaleatório com semente, para testes reproduzíveis. */
export function sementeira(semente: number): () => number {
  let s = semente >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let x = Math.imul(s ^ (s >>> 15), 1 | s);
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

export type Estrategia = (t: Peca[], vez: Jogador, aleatorio: () => number) => number;

const sortear = <T>(xs: T[], aleatorio: () => number): T => xs[Math.floor(aleatorio() * xs.length)];

/** Uma pessoa casual: quase sempre fecha e bloqueia linhas, gosta de centro e cantos. */
export const humano: Estrategia = (t, vez, aleatorio) => {
  const ganhar = lancesVencedores(t, vez);
  if (ganhar.length && aleatorio() < 0.9) return sortear(ganhar, aleatorio);
  const bloquear = lancesVencedores(t, outro(vez));
  if (bloquear.length && aleatorio() < 0.8) return sortear(bloquear, aleatorio);
  if (t[4] === 0 && aleatorio() < 0.5) return 4;
  const cantos = [0, 2, 6, 8].filter((c) => t[c] === 0);
  if (cantos.length && aleatorio() < 0.6) return sortear(cantos, aleatorio);
  return sortear(livres(t), aleatorio);
};

export const acaso: Estrategia = (t, _vez, aleatorio) => sortear(livres(t), aleatorio);

/** Uma partida da IA contra uma estratégia. Devolve o resultado do ponto de vista da IA. */
export function partida(
  m: Memoria,
  perfil: Perfil | null,
  rival: Estrategia,
  iaComeca: boolean,
  aleatorio: () => number,
  ritmo: Ritmo = RITMO,
): "ganhou" | "empatou" | "perdeu" {
  const ia: Jogador = 2;
  let t: Peca[] = tabuleiroVazio();
  let vez: Jogador = iaComeca ? ia : 1;
  const lances: Lance[] = [];
  let fim: Peca | null = null;
  while (fim === null) {
    const casa =
      vez === ia ? escolher(m, perfil, t, vez, aleatorio).casa : rival(t, vez, aleatorio);
    if (vez !== ia && perfil) registrar(perfil, t, vez, casa);
    lances.push({ tab: t, vez, casa });
    t = jogar(t, casa, vez);
    fim = resultado(t);
    vez = outro(vez);
  }
  aprender(m, lances, fim, ritmo);
  return fim === 0 ? "empatou" : fim === ia ? "ganhou" : "perdeu";
}
