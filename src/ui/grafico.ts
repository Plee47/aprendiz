/** A curva de aprendizado: precisão da IA por rodada, com os níveis e o resultado de cada rodada. */
import { porcento } from "../ia/explicacao";
import { NIVEIS, type Rodada } from "../progresso";

const NS = "http://www.w3.org/2000/svg";

function el<K extends keyof SVGElementTagNameMap>(
  tag: K,
  attrs: Record<string, string | number>,
  pai?: Element,
): SVGElementTagNameMap[K] {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v));
  pai?.appendChild(e);
  return e;
}

const NOME_RESULTADO = { vitoria: "você venceu", empate: "empate", derrota: "ela venceu" };

export function desenharEvolucao(caixa: HTMLElement, rodadas: Rodada[], precisaoInicial: number) {
  caixa.replaceChildren();
  if (rodadas.length === 0) {
    const vazio = document.createElement("p");
    vazio.className = "vazio";
    vazio.textContent = "Jogue a primeira rodada para ver a curva de aprendizado aparecer aqui.";
    caixa.append(vazio);
    return;
  }
  const largura = Math.max(280, caixa.clientWidth);
  const altura = 230;
  const m = { cima: 14, dir: 96, baixo: 44, esq: 40 };
  const w = largura - m.esq - m.dir;
  const h = altura - m.cima - m.baixo;
  const pontos = [{ precisao: precisaoInicial }, ...rodadas];
  const x = (i: number) => m.esq + (pontos.length === 1 ? 0 : (i / (pontos.length - 1)) * w);
  const yMin = 0.3;
  const y = (p: number) => m.cima + (1 - (Math.max(p, yMin) - yMin) / (1 - yMin)) * h;

  const svg = el("svg", {
    viewBox: `0 0 ${largura} ${altura}`,
    width: largura,
    height: altura,
    role: "img",
    "aria-label": `Precisão da IA ao longo de ${rodadas.length} rodadas: de ${porcento(precisaoInicial)} para ${porcento(rodadas[rodadas.length - 1].precisao)}.`,
  });

  // Níveis como faixas de referência.
  let ultimoRotulo = Infinity;
  for (const n of NIVEIS.slice(1)) {
    const yy = y(n.minimo);
    el("line", { x1: m.esq, x2: m.esq + w, y1: yy, y2: yy, class: "g-nivel" }, svg);
    // Rótulos de baixo para cima, sem encostar um no outro.
    const yt = Math.min(yy + 4, ultimoRotulo - 13);
    ultimoRotulo = yt;
    const t = el("text", { x: m.esq + w + 8, y: yt, class: "g-rotulo" }, svg);
    t.textContent = n.nome;
  }
  for (const p of [0.4, 0.6, 0.8, 1]) {
    const t = el("text", { x: m.esq - 8, y: y(p) + 4, class: "g-eixo", "text-anchor": "end" }, svg);
    t.textContent = porcento(p);
  }

  // Área e linha da precisão.
  const caminho = pontos.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.precisao).toFixed(1)}`).join("");
  el("path", { d: `${caminho}L${x(pontos.length - 1)},${m.cima + h}L${x(0)},${m.cima + h}Z`, class: "g-area" }, svg);
  el("path", { d: caminho, class: "g-linha" }, svg);
  const ultimo = pontos.length - 1;
  el("circle", { cx: x(ultimo), cy: y(pontos[ultimo].precisao), r: 4.5, class: "g-ponto" }, svg);

  // Resultado de cada rodada, numa faixa embaixo.
  const faixaY = m.cima + h + 18;
  const lado = Math.max(4, Math.min(12, w / pontos.length - 2));
  rodadas.forEach((r, i) => {
    el(
      "rect",
      { x: x(i + 1) - lado / 2, y: faixaY, width: lado, height: lado, rx: 2, class: `g-res g-${r.resultado}` },
      svg,
    );
  });

  // Hover: linha guia e dica com a rodada mais próxima.
  const guia = el("line", { y1: m.cima, y2: m.cima + h, class: "g-guia", visibility: "hidden" }, svg);
  const alvo = el("rect", { x: m.esq - 10, y: 0, width: w + 20, height: altura, fill: "transparent" }, svg);
  const dica = document.createElement("div");
  dica.className = "g-dica";
  dica.hidden = true;
  const mover = (ev: PointerEvent) => {
    const r = svg.getBoundingClientRect();
    const px = ((ev.clientX - r.left) / r.width) * largura;
    const i = Math.max(1, Math.min(ultimo, Math.round(((px - m.esq) / w) * ultimo)));
    const rod = rodadas[i - 1];
    guia.setAttribute("x1", String(x(i)));
    guia.setAttribute("x2", String(x(i)));
    guia.setAttribute("visibility", "visible");
    dica.hidden = false;
    dica.innerHTML = `<b>Rodada ${i}</b><span>${NOME_RESULTADO[rod.resultado]}</span><span>precisão ${porcento(rod.precisao)} · ${NIVEIS[rod.nivel].nome}</span>`;
    const esquerda = (x(i) / largura) * r.width;
    dica.style.left = `${Math.min(esquerda, r.width - 160)}px`;
  };
  alvo.addEventListener("pointermove", mover);
  alvo.addEventListener("pointerleave", () => {
    guia.setAttribute("visibility", "hidden");
    dica.hidden = true;
  });

  const legenda = document.createElement("div");
  legenda.className = "g-legenda";
  legenda.innerHTML =
    '<span><i class="l-linha"></i>Precisão da IA</span><span><i class="l-vitoria"></i>Você venceu</span><span><i class="l-empate"></i>Empate</span><span><i class="l-derrota"></i>Ela venceu</span>';
  caixa.append(legenda, svg, dica);
}
