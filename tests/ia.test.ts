import { describe, expect, it } from "vitest";
import {
  aprender,
  avaliar,
  memoriaVazia,
  precisao,
  valorDoLance,
} from "../src/ia/cerebro";
import { tracos } from "../src/ia/conceitos";
import { habitos, perfilVazio, prever, registrar } from "../src/ia/perfil";
import type { Peca } from "../src/jogo/tabuleiro";
import { humano, partida, sementeira } from "./simulacao";

const tab = (s: string): Peca[] => [...s].map((c) => (c === "x" ? 1 : c === "o" ? 2 : 0));

describe("conceitos", () => {
  it("percebe fechar e bloquear", () => {
    const t = tab("xx oo    ");
    expect(tracos(t, 1, 2).fechar).toBe(1);
    expect(tracos(t, 2, 2).bloquear).toBe(1);
    expect(tracos(t, 2, 5)).toMatchObject({ fechar: 1, bloquear: 0 });
  });

  it("percebe quando um lance ignora uma ameaça", () => {
    expect(tracos(tab("xx  o    "), 2, 8).ignorar).toBe(1);
    expect(tracos(tab("xx  o    "), 2, 2).ignorar).toBe(0);
  });

  it("percebe um garfo", () => {
    // x nos cantos 0 e 8, o no centro e no meio de cima: x em 6 abre 0-3-6 e 6-7-8.
    expect(tracos(tab("xo  o   x"), 1, 6).garfo).toBe(1);
  });

  it("percebe o lugar do garfo do rival", () => {
    expect(tracos(tab("xo  o   x"), 2, 6).antigarfo).toBe(1);
  });
});

describe("cérebro", () => {
  it("sem experiência joga ao acaso", () => {
    const probs = avaliar(memoriaVazia(), null, tab("         "), 1).map((o) => o.prob);
    for (const p of probs) expect(p).toBeCloseTo(1 / 9);
  });

  it("depois de perder, o lance que deixou a linha aberta vale menos", () => {
    const m = memoriaVazia();
    const antes = tab("xx  o    ");
    aprender(
      m,
      [
        { tab: tab("x   o    "), vez: 1, casa: 1 },
        { tab: antes, vez: 2, casa: 8 },
        { tab: tab("xx  o   o"), vez: 1, casa: 2 },
      ],
      1,
    );
    expect(valorDoLance(m, antes, 2, 8).total).toBeLessThan(0);
    expect(m.w.ignorar).toBeLessThan(0);
    expect(m.w.fechar).toBeGreaterThan(0);
  });

  it("aprende jogando: perde menos e acerta mais com o tempo", () => {
    let comeco = 0;
    let fim = 0;
    let precisaoFinal = 0;
    for (let s = 1; s <= 8; s++) {
      const r = sementeira(s);
      const m = memoriaVazia();
      const p = perfilVazio();
      for (let n = 0; n < 30; n++) {
        const x = partida(m, p, humano, n % 2 === 1, r);
        if (x === "perdeu" && n < 6) comeco++;
        if (x === "perdeu" && n >= 24) fim++;
      }
      precisaoFinal += precisao(m) / 8;
      expect(m.w.ignorar).toBeLessThan(m.w.bloquear);
    }
    expect(fim).toBeLessThan(comeco / 2);
    expect(precisaoFinal).toBeGreaterThan(precisao(memoriaVazia()) + 0.3);
  });
});

describe("perfil do jogador", () => {
  it("prevê sua resposta depois de duas vezes iguais", () => {
    const p = perfilVazio();
    const t = tab("    o    ");
    expect(prever(p, t, 1)).toBeNull();
    registrar(p, t, 1, 0);
    registrar(p, t, 1, 0);
    expect(prever(p, t, 1)).toMatchObject({ confianca: 1, vezes: 2 });
  });

  it("descreve hábitos com amostra suficiente", () => {
    const p = perfilVazio();
    for (let i = 0; i < 4; i++) registrar(p, tab("         "), 1, 0);
    expect(habitos(p)[0].texto).toContain("canto");
  });
});
