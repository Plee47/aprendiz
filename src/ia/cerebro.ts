/**
 * O cérebro da IA, aprendido por reforço (Monte Carlo) com duas memórias:
 *
 * - **Conceitos:** um peso para cada conceito que ela percebe num lance (bloquear, tomar o centro,
 *   armar um garfo...). Generaliza: o que aprende numa posição vale em todas.
 * - **Lembranças:** um ajuste fino por posição exata (na forma canônica, vista por quem joga),
 *   para os detalhes que os conceitos não capturam, como armadilhas específicas.
 *
 * O valor de um lance é a soma dos pesos dos seus conceitos mais a lembrança daquela posição.
 * No começo tudo vale 0 e ela joga ao acaso. No fim de cada partida, cada lance jogado, dela e
 * seu, puxa o valor na direção do resultado: +1 para quem ganhou, -1 para quem perdeu, um pouco
 * acima de 0 no empate. Lances do começo da partida recebem menos crédito que os do fim.
 */
import { todasAsPosicoes, valoresDosLances } from "../jogo/perfeito";
import { paraCanonica, ver } from "../jogo/simetria";
import {
  type Jogador,
  type Peca,
  type Tabuleiro,
  jogar,
  livres,
  outro,
  resultado,
} from "../jogo/tabuleiro";
import { CONCEITOS, type Conceito, type Tracos, pesosZerados, produto, tracos } from "./conceitos";
import { type Perfil, prever } from "./perfil";

export const GAMA = 0.9;
export const VALOR_EMPATE = 0.3;
/** A partir deste peso (positivo ou negativo) um conceito conta como aprendido. */
export const LIMIAR_CONCEITO = 0.25;

export interface Ritmo {
  /** Taxa de aprendizado dos conceitos. */
  conceitos: number;
  /** Taxa de aprendizado das lembranças de posição. */
  lembrancas: number;
}

export const RITMO: Ritmo = { conceitos: 0.2, lembrancas: 0.3 };

export interface Memoria {
  w: Tracos;
  q: Record<string, number[]>;
  n: Record<string, number[]>;
  partidas: number;
  /** Em que partida cada conceito passou a contar. */
  descobertas: Partial<Record<Conceito, number>>;
}

export const memoriaVazia = (): Memoria => ({
  w: pesosZerados(),
  q: {},
  n: {},
  partidas: 0,
  descobertas: {},
});

/**
 * Quanto a IA arrisca lances fora do favorito. Cai a cada partida: ela começa curiosa e fica
 * mais firme conforme acumula experiência.
 */
export const temperatura = (partidas: number): number => Math.max(0.04, 0.5 * 0.88 ** partidas);

export interface ValorDoLance {
  conceitos: number;
  lembranca: number;
  total: number;
  visitas: number;
  tracos: Tracos;
}

export function valorDoLance(m: Memoria, t: Tabuleiro, vez: Jogador, casa: number): ValorDoLance {
  const v = ver(t, vez);
  const i = paraCanonica(v, casa);
  const f = tracos(t, vez, casa);
  const conceitos = produto(m.w, f);
  const lembranca = m.q[v.chave]?.[i] ?? 0;
  return {
    conceitos,
    lembranca,
    total: conceitos + lembranca,
    visitas: m.n[v.chave]?.[i] ?? 0,
    tracos: f,
  };
}

function melhorValor(m: Memoria, t: Tabuleiro, vez: Jogador): number {
  const casas = livres(t);
  if (casas.length === 0) return 0;
  return Math.max(...casas.map((c) => valorDoLance(m, t, vez, c).total));
}

/** O que a IA espera que você responda e quanto a posição vale para ela depois disso. */
export interface Leitura {
  resposta: number;
  confianca: number;
  vezes: number;
  depois: number;
  peso: number;
}

export interface Opcao extends ValorDoLance {
  casa: number;
  nota: number;
  prob: number;
  leitura: Leitura | null;
}

/** Avalia cada lance possível. Com um perfil seu, olha um lance à frente usando seus hábitos. */
export function avaliar(m: Memoria, perfil: Perfil | null, t: Tabuleiro, vez: Jogador): Opcao[] {
  const tau = temperatura(m.partidas);
  const opcoes: Opcao[] = livres(t).map((casa) => {
    const base = valorDoLance(m, t, vez, casa);
    let nota = base.total;
    let leitura: Leitura | null = null;
    const depoisDoLance = jogar(t, casa, vez);
    if (perfil && resultado(depoisDoLance) === null) {
      const p = prever(perfil, depoisDoLance, outro(vez));
      if (p) {
        const t2 = jogar(depoisDoLance, p.casa, outro(vez));
        const r = resultado(t2);
        const depois =
          r === outro(vez) ? -1 : r === 0 ? VALOR_EMPATE : r === null ? melhorValor(m, t2, vez) : 1;
        const peso = 0.5 * p.confianca * Math.min(1, p.vezes / 3);
        nota = base.total + peso * (depois - base.total);
        leitura = { resposta: p.casa, confianca: p.confianca, vezes: p.vezes, depois, peso };
      }
    }
    return { ...base, casa, nota, prob: 0, leitura };
  });
  const max = Math.max(...opcoes.map((o) => o.nota));
  const pesos = opcoes.map((o) => Math.exp((o.nota - max) / tau));
  const soma = pesos.reduce((a, b) => a + b, 0);
  opcoes.forEach((o, i) => (o.prob = pesos[i] / soma));
  return opcoes;
}

export interface Decisao {
  casa: number;
  opcoes: Opcao[];
}

export function escolher(
  m: Memoria,
  perfil: Perfil | null,
  t: Tabuleiro,
  vez: Jogador,
  aleatorio: () => number = Math.random,
): Decisao {
  const opcoes = avaliar(m, perfil, t, vez);
  let sorteio = aleatorio();
  for (const o of opcoes) {
    sorteio -= o.prob;
    if (sorteio <= 0) return { casa: o.casa, opcoes };
  }
  return { casa: opcoes[opcoes.length - 1].casa, opcoes };
}

export interface Lance {
  tab: Peca[];
  vez: Jogador;
  casa: number;
}

export interface Ajuste {
  vez: Jogador;
  casa: number;
  tab: Peca[];
  antes: number;
  depois: number;
  alvo: number;
}

export interface Aprendizado {
  ajustes: Ajuste[];
  pesosAntes: Tracos;
  novosConceitos: Conceito[];
}

/**
 * Aprende com uma partida terminada: cada lance puxa o seu valor na direção do resultado,
 * dividindo a correção entre os conceitos presentes e a lembrança da posição. Altera a memória.
 */
export function aprender(
  m: Memoria,
  partida: readonly Lance[],
  fim: Peca,
  ritmo: Ritmo = RITMO,
): Aprendizado {
  const pesosAntes = { ...m.w };
  const ajustes: Ajuste[] = [];
  partida.forEach((lance, idx) => {
    const restantes = partida.slice(idx + 1).filter((l) => l.vez === lance.vez).length;
    const recompensa = fim === 0 ? VALOR_EMPATE : fim === lance.vez ? 1 : -1;
    const alvo = recompensa * GAMA ** restantes;
    const antes = valorDoLance(m, lance.tab, lance.vez, lance.casa);
    const erro = alvo - antes.total;
    const norma = 1 + CONCEITOS.reduce((s, c) => s + antes.tracos[c] ** 2, 0);
    for (const c of CONCEITOS) m.w[c] += (ritmo.conceitos * erro * antes.tracos[c]) / norma;
    const v = ver(lance.tab, lance.vez);
    const q = (m.q[v.chave] ??= Array(9).fill(0));
    const n = (m.n[v.chave] ??= Array(9).fill(0));
    const i = paraCanonica(v, lance.casa);
    q[i] += ritmo.lembrancas * erro;
    n[i] += 1;
    const depois = valorDoLance(m, lance.tab, lance.vez, lance.casa).total;
    ajustes.push({ vez: lance.vez, casa: lance.casa, tab: lance.tab, antes: antes.total, depois, alvo });
  });
  m.partidas += 1;
  const novosConceitos = CONCEITOS.filter(
    (c) => m.descobertas[c] === undefined && Math.abs(m.w[c]) >= LIMIAR_CONCEITO,
  );
  for (const c of novosConceitos) m.descobertas[c] = m.partidas;
  return { ajustes, pesosAntes, novosConceitos };
}

export const posicoesConhecidas = (m: Memoria): number => Object.keys(m.n).length;

interface Gabarito {
  tab: Peca[];
  vez: Jogador;
  casas: number[];
  certos: Set<number>;
}

let gabarito: Gabarito[] | null = null;

function obterGabarito(): Gabarito[] {
  if (gabarito) return gabarito;
  gabarito = todasAsPosicoes()
    .map(({ tab, vez }) => {
      const valores = valoresDosLances(tab, vez);
      const max = Math.max(...valores.values());
      return {
        tab,
        vez,
        casas: [...valores.keys()],
        certos: new Set([...valores].filter(([, v]) => v === max).map(([c]) => c)),
      };
    })
    // Só as posições em que dá para errar: se todo lance serve, não há o que medir.
    .filter((g) => g.certos.size < g.casas.length);
  return gabarito;
}

/**
 * Precisão: nas posições do jogo em que existe lance errado, a chance de a IA jogar um lance
 * perfeito, do jeito que ela joga de verdade (com a curiosidade que ainda tem). Por isso a
 * precisão sobe tanto quando ela aprende quanto quando fica mais firme.
 */
export function precisao(m: Memoria): number {
  let soma = 0;
  const lista = obterGabarito();
  for (const g of lista) {
    for (const o of avaliar(m, null, g.tab, g.vez)) if (g.certos.has(o.casa)) soma += o.prob;
  }
  return soma / lista.length;
}
