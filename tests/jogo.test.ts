import { describe, expect, it } from "vitest";
import { lancesPerfeitos, todasAsPosicoes, valor } from "../src/jogo/perfeito";
import { SIMETRIAS, paraCanonica, paraReal, ver } from "../src/jogo/simetria";
import {
  type Peca,
  jogar,
  lancesVencedores,
  resultado,
  tabuleiroVazio,
  vencedor,
} from "../src/jogo/tabuleiro";

const tab = (s: string): Peca[] => [...s].map((c) => (c === "x" ? 1 : c === "o" ? 2 : 0));

describe("regras", () => {
  it("acha a linha vencedora", () => {
    expect(vencedor(tab("xxx oo    "))?.linha).toEqual([0, 1, 2]);
    expect(vencedor(tab("o  xo x o"))?.jogador).toBe(2);
    expect(vencedor(tab("xo       "))).toBeNull();
  });

  it("distingue empate de partida em andamento", () => {
    expect(resultado(tab("xoxxoooxx"))).toBe(0);
    expect(resultado(tab("xo       "))).toBeNull();
  });

  it("lista os lances que fecham linha", () => {
    expect(lancesVencedores(tab("xx  o  o "), 1)).toEqual([2]);
  });

  it("não deixa jogar em casa ocupada", () => {
    expect(() => jogar(tab("x        "), 0, 2)).toThrow();
  });
});

describe("simetria", () => {
  it("são oito transformações diferentes", () => {
    expect(new Set(SIMETRIAS.map((s) => s.join())).size).toBe(8);
  });

  it("tabuleiros girados e espelhados têm a mesma chave", () => {
    const t = tab("x   o    ");
    const chaves = SIMETRIAS.map((s) => ver(s.map((i) => t[i]) as Peca[], 1).chave);
    expect(new Set(chaves).size).toBe(1);
  });

  it("a chave é vista por quem joga", () => {
    expect(ver(tab("x        "), 1).chave).toBe(ver(tab("o        "), 2).chave);
  });

  it("converte casas nos dois sentidos", () => {
    const v = ver(tab("  x o    "), 1);
    for (let c = 0; c < 9; c++) expect(paraReal(v, paraCanonica(v, c))).toBe(c);
  });
});

describe("jogo perfeito", () => {
  it("com jogo perfeito dos dois, o jogo da velha empata", () => {
    expect(valor(tabuleiroVazio(), 1)).toBe(0);
  });

  it("prefere ganhar já a ganhar depois", () => {
    expect(lancesPerfeitos(tab("xx oo    "), 1)).toEqual([2]);
  });

  it("bloqueia quando precisa", () => {
    expect(lancesPerfeitos(tab("oo  x    "), 1)).toEqual([2]);
  });

  it("conhece todas as posições do jogo", () => {
    // 765 posições distintas a menos de simetria; tirando as terminadas sobram as com lance.
    expect(todasAsPosicoes().length).toBeGreaterThan(500);
    expect(todasAsPosicoes().every((p) => resultado(p.tab) === null)).toBe(true);
  });
});
