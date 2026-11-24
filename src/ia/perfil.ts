/**
 * O que a IA sabe sobre você: como você responde em cada posição, onde abre e seus hábitos.
 * É um modelo de frequências simples, por posição canônica, e por isso explicável.
 */
import { paraCanonica, paraReal, ver } from "../jogo/simetria";
import {
  type Jogador,
  type Tabuleiro,
  type TipoDeCasa,
  lancesVencedores,
  livres,
  outro,
  tipoDaCasa,
} from "../jogo/tabuleiro";

export interface Perfil {
  respostas: Record<string, number[]>;
  aberturas: Record<TipoDeCasa, number>;
  centroLivre: number;
  centroTomado: number;
  ameacas: number;
  bloqueios: number;
  chances: number;
  chancesAproveitadas: number;
}

export const perfilVazio = (): Perfil => ({
  respostas: {},
  aberturas: { canto: 0, centro: 0, lateral: 0 },
  centroLivre: 0,
  centroTomado: 0,
  ameacas: 0,
  bloqueios: 0,
  chances: 0,
  chancesAproveitadas: 0,
});

/** Anota um lance seu. `t` é o tabuleiro antes do lance. */
export function registrar(p: Perfil, t: Tabuleiro, vez: Jogador, casa: number): void {
  const v = ver(t, vez);
  const contas = (p.respostas[v.chave] ??= Array(9).fill(0));
  contas[paraCanonica(v, casa)] += 1;

  const vazias = livres(t);
  if (vazias.length === 9) p.aberturas[tipoDaCasa(casa)] += 1;
  if (t[4] === 0) {
    p.centroLivre += 1;
    if (casa === 4) p.centroTomado += 1;
  }
  const meus = lancesVencedores(t, vez);
  if (meus.length > 0) {
    p.chances += 1;
    if (meus.includes(casa)) p.chancesAproveitadas += 1;
  } else {
    const dela = lancesVencedores(t, outro(vez));
    if (dela.length > 0) {
      p.ameacas += 1;
      if (dela.includes(casa)) p.bloqueios += 1;
    }
  }
}

export interface Previsao {
  casa: number;
  confianca: number;
  vezes: number;
}

const MINIMO_PARA_PREVER = 2;

/** Onde você costuma jogar nesta posição, se a IA já viu o bastante para arriscar. */
export function prever(p: Perfil, t: Tabuleiro, vez: Jogador): Previsao | null {
  const v = ver(t, vez);
  const contas = p.respostas[v.chave];
  if (!contas) return null;
  const vezes = contas.reduce((a, b) => a + b, 0);
  if (vezes < MINIMO_PARA_PREVER) return null;
  let melhor = 0;
  for (let i = 1; i < 9; i++) if (contas[i] > contas[melhor]) melhor = i;
  const casa = paraReal(v, melhor);
  if (!livres(t).includes(casa)) return null;
  return { casa, confianca: contas[melhor] / vezes, vezes };
}

export interface Habito {
  texto: string;
  forca: number;
}

const pct = (a: number, b: number) => Math.round((100 * a) / b);

/** Hábitos com amostra suficiente, do mais marcante ao menos. */
export function habitos(p: Perfil): Habito[] {
  const lista: Habito[] = [];
  const abriu = p.aberturas.canto + p.aberturas.centro + p.aberturas.lateral;
  if (abriu >= 3) {
    const [tipo, n] = (Object.entries(p.aberturas) as [TipoDeCasa, number][]).sort(
      (a, b) => b[1] - a[1],
    )[0];
    const onde = { canto: "num canto", centro: "no centro", lateral: "numa lateral" }[tipo];
    lista.push({ texto: `Você abre ${onde} em ${pct(n, abriu)}% das partidas.`, forca: n / abriu });
  }
  if (p.centroLivre >= 4) {
    const f = p.centroTomado / p.centroLivre;
    lista.push({
      texto:
        f >= 0.5
          ? `Quando o centro está livre, você o toma em ${pct(p.centroTomado, p.centroLivre)}% das vezes.`
          : `Você costuma deixar o centro livre: só o toma em ${pct(p.centroTomado, p.centroLivre)}% das vezes.`,
      forca: Math.abs(f - 0.5) * 2,
    });
  }
  if (p.ameacas >= 3) {
    const f = p.bloqueios / p.ameacas;
    lista.push({
      texto:
        f >= 0.8
          ? `Você bloqueia ${pct(p.bloqueios, p.ameacas)}% das minhas ameaças. Difícil te pegar assim.`
          : `Você deixou passar ${p.ameacas - p.bloqueios} de ${p.ameacas} ameaças minhas.`,
      forca: f >= 0.8 ? f : 1 - f,
    });
  }
  if (p.chances >= 3) {
    lista.push({
      texto: `Quando pode fechar uma linha, você fecha em ${pct(p.chancesAproveitadas, p.chances)}% das vezes.`,
      forca: p.chancesAproveitadas / p.chances,
    });
  }
  return lista.sort((a, b) => b.forca - a.forca);
}

/** Quantas posições diferentes a IA já te viu jogar. */
export const posicoesObservadas = (p: Perfil): number => Object.keys(p.respostas).length;
