/** Partículas num canvas por cima da página: explosões, confete, rastros e faíscas. */

interface Particula {
  x: number;
  y: number;
  vx: number;
  vy: number;
  vida: number;
  total: number;
  cor: string;
  tam: number;
  forma: "ponto" | "confete" | "faisca";
  giro: number;
  vGiro: number;
  gravidade: number;
  arrasto: number;
  alvo?: { x: number; y: number };
}

export const movimentoReduzido = (): boolean =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export class Efeitos {
  private ctx: CanvasRenderingContext2D;
  private particulas: Particula[] = [];
  private rodando = false;
  private dpr = 1;

  constructor(private canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext("2d")!;
    this.ajustar();
    window.addEventListener("resize", () => this.ajustar());
  }

  private ajustar() {
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = innerWidth * this.dpr;
    this.canvas.height = innerHeight * this.dpr;
  }

  private add(p: Partial<Particula> & Pick<Particula, "x" | "y" | "cor">) {
    if (this.particulas.length > 900) return;
    const total = p.total ?? 60;
    this.particulas.push({
      vx: 0,
      vy: 0,
      tam: 3,
      forma: "ponto",
      giro: 0,
      vGiro: 0,
      gravidade: 0,
      arrasto: 0.96,
      vida: total,
      total,
      ...p,
    });
    if (!this.rodando) {
      this.rodando = true;
      requestAnimationFrame(() => this.quadro());
    }
  }

  explosao(x: number, y: number, cores: string[], qtd = 40, forca = 7) {
    if (movimentoReduzido()) return;
    for (let i = 0; i < qtd; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = forca * (0.35 + Math.random() * 0.65);
      this.add({
        x,
        y,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v,
        cor: cores[i % cores.length],
        tam: 1.5 + Math.random() * 2.5,
        forma: Math.random() < 0.5 ? "faisca" : "ponto",
        total: 40 + Math.random() * 30,
        arrasto: 0.93,
        gravidade: 0.05,
      });
    }
  }

  confete(cores: string[], qtd = 120) {
    if (movimentoReduzido()) return;
    for (let i = 0; i < qtd; i++) {
      this.add({
        x: Math.random() * innerWidth,
        y: -20 - Math.random() * innerHeight * 0.3,
        vx: (Math.random() - 0.5) * 3,
        vy: 2 + Math.random() * 3,
        cor: cores[i % cores.length],
        tam: 4 + Math.random() * 4,
        forma: "confete",
        giro: Math.random() * Math.PI,
        vGiro: (Math.random() - 0.5) * 0.3,
        gravidade: 0.04,
        arrasto: 0.99,
        total: 140 + Math.random() * 80,
      });
    }
  }

  poeira(x: number, y: number, cor: string) {
    if (movimentoReduzido()) return;
    for (let i = 0; i < 24; i++) {
      this.add({
        x: x + (Math.random() - 0.5) * 120,
        y: y + (Math.random() - 0.5) * 120,
        vx: (Math.random() - 0.5) * 0.8,
        vy: -0.3 - Math.random() * 0.8,
        cor,
        tam: 1.5 + Math.random() * 2,
        total: 70,
      });
    }
  }

  /** Um rastro de luz do ponto de partida até a casa onde a peça caiu. */
  cometa(x0: number, y0: number, x1: number, y1: number, cor: string) {
    if (movimentoReduzido()) return;
    const passos = 22;
    for (let i = 0; i < passos; i++) {
      const t = i / passos;
      this.add({
        x: x0 + (x1 - x0) * t + (Math.random() - 0.5) * 6,
        y: y0 + (y1 - y0) * t + (Math.random() - 0.5) * 6,
        vx: (Math.random() - 0.5) * 0.6,
        vy: (Math.random() - 0.5) * 0.6,
        cor,
        tam: 1 + 2.5 * t,
        total: 18 + 26 * t,
      });
    }
  }

  /** Faíscas que voam de um ponto até o contador de faíscas. */
  recompensa(x: number, y: number, alvo: { x: number; y: number }, cor: string, qtd: number) {
    if (movimentoReduzido()) return;
    for (let i = 0; i < Math.min(qtd * 4, 40); i++) {
      const a = Math.random() * Math.PI * 2;
      this.add({
        x,
        y,
        vx: Math.cos(a) * 5,
        vy: Math.sin(a) * 5,
        cor,
        tam: 2.2,
        forma: "faisca",
        arrasto: 0.9,
        total: 90,
        alvo,
      });
    }
  }

  private quadro() {
    const { ctx } = this;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    // Brilho aditivo só funciona em fundo escuro; no tema claro, desenha normal.
    const mistura: GlobalCompositeOperation =
      document.documentElement.dataset.tema === "papel" ? "source-over" : "lighter";
    ctx.globalCompositeOperation = mistura;
    this.particulas = this.particulas.filter((p) => p.vida > 0);
    for (const p of this.particulas) {
      if (p.alvo) {
        const idade = p.total - p.vida;
        if (idade > 18) {
          p.vx += (p.alvo.x - p.x) * 0.012;
          p.vy += (p.alvo.y - p.y) * 0.012;
          if (Math.hypot(p.alvo.x - p.x, p.alvo.y - p.y) < 14) p.vida = 0;
        }
      }
      p.vx *= p.arrasto;
      p.vy = p.vy * p.arrasto + p.gravidade;
      p.x += p.vx;
      p.y += p.vy;
      p.giro += p.vGiro;
      p.vida -= 1;
      const alfa = Math.min(1, p.vida / (p.total * 0.4));
      ctx.globalAlpha = alfa;
      ctx.fillStyle = p.cor;
      ctx.strokeStyle = p.cor;
      if (p.forma === "confete") {
        ctx.globalCompositeOperation = "source-over";
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.giro);
        ctx.fillRect(-p.tam / 2, -p.tam / 4, p.tam, p.tam / 2);
        ctx.restore();
        ctx.globalCompositeOperation = mistura;
      } else if (p.forma === "faisca") {
        ctx.lineWidth = p.tam * 0.7;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - p.vx * 2.5, p.y - p.vy * 2.5);
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.tam, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
    if (this.particulas.length > 0) requestAnimationFrame(() => this.quadro());
    else {
      this.rodando = false;
      ctx.clearRect(0, 0, innerWidth, innerHeight);
    }
  }
}
