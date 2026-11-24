/** Progresso do jogador: faíscas, itens, upgrades permanentes, níveis da IA e o que fica salvo. */
import { type Memoria, memoriaVazia } from "./ia/cerebro";
import { type Perfil, perfilVazio } from "./ia/perfil";

export interface Nivel {
  nome: string;
  minimo: number;
  frase: string;
}

/** Níveis pela precisão da IA (ver `precisao` em cerebro.ts). */
export const NIVEIS: readonly Nivel[] = [
  { nome: "Recém-nascida", minimo: 0, frase: "Não sabe nem o que é uma linha." },
  { nome: "Curiosa", minimo: 0.55, frase: "Já percebe alguns padrões." },
  { nome: "Aprendiz", minimo: 0.75, frase: "Fecha e bloqueia linhas com frequência." },
  { nome: "Estrategista", minimo: 0.88, frase: "Pensa em garfos e defesas." },
  { nome: "Mestre", minimo: 0.94, frase: "Quase não erra mais." },
];

export function nivelDe(precisao: number): number {
  let i = 0;
  NIVEIS.forEach((n, k) => {
    if (precisao >= n.minimo) i = k;
  });
  return i;
}

export type Consumivel = "dica" | "desfazer" | "amnesia";
export type Permanente = "espelho" | "lente" | "brasa" | "oceano" | "papel" | "cometa" | "supernova";
export type Tema = "noite" | "brasa" | "oceano" | "papel";

export interface Item<T extends string> {
  id: T;
  nome: string;
  preco: number;
  descricao: string;
  grupo: "poder" | "visao" | "tema" | "efeito";
}

export const CONSUMIVEIS: readonly Item<Consumivel>[] = [
  {
    id: "dica",
    nome: "Dica",
    preco: 2,
    grupo: "poder",
    descricao: "Mostra um lance perfeito, calculado por minimax. A IA não vê.",
  },
  {
    id: "desfazer",
    nome: "Desfazer",
    preco: 2,
    grupo: "poder",
    descricao: "Volta o seu último lance e a resposta dela.",
  },
  {
    id: "amnesia",
    nome: "Amnésia",
    preco: 5,
    grupo: "poder",
    descricao: "A IA esquece tudo o que aprendeu na última partida.",
  },
];

export const PERMANENTES: readonly Item<Permanente>[] = [
  {
    id: "espelho",
    nome: "Espelho",
    preco: 6,
    grupo: "visao",
    descricao: "Mostra onde a IA acha que você vai jogar.",
  },
  {
    id: "lente",
    nome: "Lente",
    preco: 4,
    grupo: "visao",
    descricao: "Mostra os números por trás do mapa de calor: chance e valor de cada lance.",
  },
  { id: "brasa", nome: "Tema Brasa", preco: 5, grupo: "tema", descricao: "Fogo e carvão." },
  { id: "oceano", nome: "Tema Oceano", preco: 5, grupo: "tema", descricao: "Azul profundo." },
  { id: "papel", nome: "Tema Papel", preco: 5, grupo: "tema", descricao: "Claro, de caderno." },
  {
    id: "cometa",
    nome: "Cometa",
    preco: 6,
    grupo: "efeito",
    descricao: "Cada peça sua chega com um rastro de luz.",
  },
  {
    id: "supernova",
    nome: "Supernova",
    preco: 8,
    grupo: "efeito",
    descricao: "Vitórias explodem bem maior.",
  },
];

export type ResultadoRodada = "vitoria" | "empate" | "derrota";

export interface Rodada {
  resultado: ResultadoRodada;
  precisao: number;
  nivel: number;
}

export interface Progresso {
  faiscas: number;
  itens: Record<Consumivel, number>;
  permanentes: Permanente[];
  tema: Tema;
  rodadas: Rodada[];
}

export const progressoInicial = (): Progresso => ({
  faiscas: 3,
  itens: { dica: 0, desfazer: 0, amnesia: 0 },
  permanentes: [],
  tema: "noite",
  rodadas: [],
});

/** Faíscas por rodada. Vencer uma IA mais forte paga mais. */
export function recompensa(r: ResultadoRodada, nivelDaIA: number): number {
  if (r === "vitoria") return 2 + nivelDaIA;
  if (r === "empate") return nivelDaIA >= 2 ? 2 : 1;
  return 0;
}

export function comprar(p: Progresso, id: Consumivel | Permanente): boolean {
  const item = [...CONSUMIVEIS, ...PERMANENTES].find((i) => i.id === id);
  if (!item || p.faiscas < item.preco) return false;
  if (CONSUMIVEIS.some((c) => c.id === id)) p.itens[id as Consumivel] += 1;
  else if (p.permanentes.includes(id as Permanente)) return false;
  else p.permanentes.push(id as Permanente);
  p.faiscas -= item.preco;
  return true;
}

export const tem = (p: Progresso, id: Permanente): boolean => p.permanentes.includes(id);

export interface Salvo {
  versao: 1;
  memoria: Memoria;
  memoriaAnterior: Memoria | null;
  perfil: Perfil;
  progresso: Progresso;
}

export const CHAVE = "aprendiz:v1";

export const novoJogo = (): Salvo => ({
  versao: 1,
  memoria: memoriaVazia(),
  memoriaAnterior: null,
  perfil: perfilVazio(),
  progresso: progressoInicial(),
});

/** Lê o jogo salvo no navegador. Se não houver, ou estiver corrompido, começa do zero. */
export function carregar(): Salvo {
  try {
    const bruto = localStorage.getItem(CHAVE);
    if (!bruto) return novoJogo();
    const s = JSON.parse(bruto) as Salvo;
    if (s.versao !== 1 || !s.memoria?.w || !s.progresso) return novoJogo();
    return { ...novoJogo(), ...s, progresso: { ...progressoInicial(), ...s.progresso } };
  } catch {
    return novoJogo();
  }
}

export function salvar(s: Salvo): void {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(s));
  } catch {
    // Sem armazenamento (aba anônima, cota cheia): o jogo segue, só não lembra depois.
  }
}

export function apagar(): void {
  try {
    localStorage.removeItem(CHAVE);
  } catch {
    // nada a fazer
  }
}
