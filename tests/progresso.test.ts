import { describe, expect, it } from "vitest";
import { NIVEIS, comprar, nivelDe, progressoInicial, recompensa } from "../src/progresso";

describe("progresso", () => {
  it("vencer uma IA mais forte paga mais", () => {
    expect(recompensa("vitoria", 0)).toBeLessThan(recompensa("vitoria", 3));
    expect(recompensa("derrota", 4)).toBe(0);
  });

  it("compra só com faíscas suficientes e não compra o mesmo upgrade duas vezes", () => {
    const p = progressoInicial();
    p.faiscas = 10;
    expect(comprar(p, "lente")).toBe(true);
    expect(comprar(p, "lente")).toBe(false);
    expect(p.faiscas).toBe(6);
    expect(comprar(p, "supernova")).toBe(false);
    expect(comprar(p, "dica")).toBe(true);
    expect(comprar(p, "dica")).toBe(true);
    expect(p.itens.dica).toBe(2);
    expect(p.faiscas).toBe(2);
  });

  it("os níveis seguem a precisão", () => {
    expect(nivelDe(0.4)).toBe(0);
    expect(nivelDe(0.99)).toBe(NIVEIS.length - 1);
    for (let i = 1; i < NIVEIS.length; i++) expect(NIVEIS[i].minimo).toBeGreaterThan(NIVEIS[i - 1].minimo);
  });
});
