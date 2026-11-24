import "./estilo.css";
import {
  type Lance,
  type Opcao,
  aprender,
  escolher,
  memoriaVazia,
  posicoesConhecidas,
  precisao,
  temperatura,
} from "./ia/cerebro";
import { CONCEITOS, type Conceito, DESCRICAO } from "./ia/conceitos";
import {
  type Licao,
  type Pensamento,
  explicarAprendizado,
  explicarLance,
  numero,
  porcento,
} from "./ia/explicacao";
import { habitos, posicoesObservadas, prever, registrar } from "./ia/perfil";
import { lancesPerfeitos } from "./jogo/perfeito";
import {
  type Jogador,
  type Peca,
  jogar,
  nomeDaCasa,
  outro,
  resultado,
  tabuleiroVazio,
  vencedor,
} from "./jogo/tabuleiro";
import {
  CONSUMIVEIS,
  type Consumivel,
  type Item,
  NIVEIS,
  PERMANENTES,
  type Permanente,
  type ResultadoRodada,
  type Tema,
  apagar,
  carregar,
  comprar,
  nivelDe,
  novoJogo,
  recompensa,
  salvar,
  tem,
} from "./progresso";
import { Efeitos, movimentoReduzido } from "./ui/efeitos";
import { desenharEvolucao } from "./ui/grafico";

const VOCE: Jogador = 1;
const IA: Jogador = 2;

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const espera = (ms: number) =>
  new Promise<void>((r) => setTimeout(r, movimentoReduzido() ? Math.min(ms, 120) : ms));
const cor = (nome: string) =>
  getComputedStyle(document.documentElement).getPropertyValue(nome).trim();
const corDe = (j: Jogador) => cor(j === VOCE ? "--voce" : "--ia");

let salvo = carregar();
const efeitos = new Efeitos($<HTMLCanvasElement>("efeitos"));
const PRECISAO_INICIAL = precisao(memoriaVazia());
let precisaoAtual = precisao(salvo.memoria);

interface Foto {
  tab: Peca[];
  lances: Lance[];
  perfil: string;
}

let tab: Peca[] = tabuleiroVazio();
let vez: Jogador = VOCE;
let lances: Lance[] = [];
let fim: Peca | null = null;
let ocupado = false;
let pilha: Foto[] = [];
let turnoCalor = 0;

/* ---------------- tabuleiro ---------------- */

const X_SVG = '<path d="M24 24 L76 76"/><path d="M76 24 L24 76"/>';
const O_SVG = '<circle cx="50" cy="50" r="29"/>';

const casas: HTMLButtonElement[] = [];
const caixaTabuleiro = $("tabuleiro");
for (let i = 0; i < 9; i++) {
  const b = document.createElement("button");
  b.type = "button";
  b.className = "casa";
  b.innerHTML = `<div class="calor"></div><div class="previsao"><span>ela espera aqui</span></div><span class="prob"></span><svg class="peca x fantasma" viewBox="0 0 100 100" aria-hidden="true">${X_SVG}</svg>`;
  b.addEventListener("click", () => jogadaVoce(i));
  casas.push(b);
  caixaTabuleiro.append(b);
}

function rotuloCasa(i: number): string {
  const estado = tab[i] === VOCE ? "seu X" : tab[i] === IA ? "O da IA" : "vazia";
  return `${nomeDaCasa(i)}, ${estado}`;
}

function desenharCasas(animar?: number) {
  casas.forEach((b, i) => {
    b.querySelector(".peca:not(.fantasma)")?.remove();
    const p = tab[i];
    if (p !== 0) {
      const classe = `peca ${p === VOCE ? "x" : "o"}${i === animar ? "" : " sem-animacao"}`;
      b.insertAdjacentHTML(
        "beforeend",
        `<svg class="${classe}" viewBox="0 0 100 100" aria-hidden="true">${p === VOCE ? X_SVG : O_SVG}</svg>`,
      );
    }
    b.setAttribute("aria-label", rotuloCasa(i));
  });
  habilitarCasas();
}

/** Só as casas livres, na sua vez, com a partida em andamento, aceitam clique. */
function habilitarCasas() {
  casas.forEach((b, i) => {
    b.disabled = tab[i] !== 0 || fim !== null || vez !== VOCE || ocupado;
  });
}

function centro(el: Element) {
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

function limparMarcas(...classes: string[]) {
  for (const b of casas) b.classList.remove(...classes);
}

function limparCalor() {
  limparMarcas("com-calor", "escolhida");
  for (const b of casas) {
    (b.querySelector(".calor") as HTMLElement).style.opacity = "0";
  }
}

async function mostrarCalor(opcoes: Opcao[]) {
  const turno = ++turnoCalor;
  const max = Math.max(...opcoes.map((o) => o.prob));
  const lente = tem(salvo.progresso, "lente");
  const ordem = [...opcoes].sort((a, b) => a.casa - b.casa);
  for (const o of ordem) {
    if (turno !== turnoCalor) return;
    const b = casas[o.casa];
    (b.querySelector(".calor") as HTMLElement).style.opacity = String(
      0.08 + 0.72 * (o.prob / max),
    );
    const prob = b.querySelector(".prob") as HTMLElement;
    prob.innerHTML = lente ? `${porcento(o.prob)}<small>valor ${numero(o.nota)}</small>` : "";
    b.classList.toggle("com-calor", lente);
    await espera(45);
  }
}

function mostrarPrevisao() {
  limparMarcas("prevista");
  if (!tem(salvo.progresso, "espelho") || vez !== VOCE || fim !== null) return;
  const p = prever(salvo.perfil, tab, VOCE);
  if (p) casas[p.casa].classList.add("prevista");
}

function desenharLinhaVitoria(linha: readonly number[], j: Jogador) {
  const svg = $("linha-vitoria") as unknown as SVGSVGElement;
  const caixa = svg.getBoundingClientRect();
  svg.setAttribute("viewBox", `0 0 ${caixa.width} ${caixa.height}`);
  const a = centro(casas[linha[0]]);
  const c = centro(casas[linha[2]]);
  const ext = 0.18;
  const x1 = a.x - (c.x - a.x) * ext - caixa.left;
  const y1 = a.y - (c.y - a.y) * ext - caixa.top;
  const x2 = c.x + (c.x - a.x) * ext - caixa.left;
  const y2 = c.y + (c.y - a.y) * ext - caixa.top;
  const comprimento = Math.hypot(x2 - x1, y2 - y1);
  svg.innerHTML = `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${corDe(j)}" stroke-dasharray="${comprimento}" stroke-dashoffset="${comprimento}" />`;
  for (const i of linha) casas[i].classList.add("vencedora");
  for (const i of linha) casas[i].style.color = corDe(j);
}

/* ---------------- pensamentos ---------------- */

const lista = $("pensamentos");

/** Os pensamentos correm de cima para baixo, como uma conversa; o mais novo fica embaixo. */
function adicionarPensamento(li: HTMLLIElement) {
  lista.append(li);
  while (lista.children.length > 60) lista.firstElementChild?.remove();
  lista.scrollTo({ top: lista.scrollHeight, behavior: movimentoReduzido() ? "auto" : "smooth" });
}

function pensar(p: Pensamento | Licao) {
  const li = document.createElement("li");
  li.className = "pensamento";
  li.dataset.tipo = p.tipo;
  li.textContent = p.texto;
  adicionarPensamento(li);
}

function tituloPensamento(texto: string) {
  const li = document.createElement("li");
  li.className = "pensamento titulo";
  li.textContent = texto;
  adicionarPensamento(li);
}

function estado(texto: string, pensando = false) {
  const e = $("estado");
  e.textContent = texto;
  e.toggleAttribute("data-pensando", pensando);
}

function atualizarVez() {
  const v = $("vez");
  if (fim !== null) {
    v.textContent = "";
    delete v.dataset.de;
    return;
  }
  v.textContent = vez === VOCE ? "sua vez · você é o X" : "vez dela";
  v.dataset.de = vez === VOCE ? "voce" : "ia";
}

/* ---------------- partida ---------------- */

function novaRodada() {
  const n = salvo.progresso.rodadas.length;
  tab = tabuleiroVazio();
  lances = [];
  fim = null;
  pilha = [];
  ocupado = false;
  vez = n % 2 === 0 ? VOCE : IA;
  turnoCalor++;
  $("linha-vitoria").innerHTML = "";
  $("resultado").hidden = true;
  limparCalor();
  limparMarcas("vencedora", "dica", "prevista");
  for (const b of casas) b.style.color = "";
  $("rodada").textContent = `Rodada ${n + 1}`;
  for (const li of lista.children) li.classList.add("antigo");
  tituloPensamento(`Rodada ${n + 1} · ${vez === VOCE ? "você começa" : "eu começo"}`);
  desenharCasas();
  atualizarVez();
  atualizarTudo();
  if (vez === IA) void turnoIA();
  else {
    estado("esperando você");
    mostrarPrevisao();
  }
}

function jogadaVoce(casa: number) {
  if (fim !== null || vez !== VOCE || ocupado || tab[casa] !== 0) return;
  const esperado = prever(salvo.perfil, tab, VOCE);
  pilha.push({ tab: [...tab], lances: [...lances], perfil: JSON.stringify(salvo.perfil) });
  registrar(salvo.perfil, tab, VOCE, casa);
  if (esperado && esperado.confianca >= 0.6) {
    pensar(
      esperado.casa === casa
        ? {
            tipo: "leitura",
            texto: `Eu esperava esse lance: nesta posição você já tinha jogado no ${nomeDaCasa(casa)} ${esperado.vezes === 1 ? "uma vez" : `${esperado.vezes} vezes`}.`,
          }
        : {
            tipo: "leitura",
            texto: `Você me surpreendeu: eu esperava o ${nomeDaCasa(esperado.casa)}.`,
          },
    );
  }
  colocar(casa, VOCE);
}

function colocar(casa: number, j: Jogador) {
  lances.push({ tab: [...tab], vez: j, casa });
  tab = jogar(tab, casa, j);
  limparMarcas("dica", "prevista");
  desenharCasas(casa);
  const c = centro(casas[casa]);
  efeitos.explosao(c.x, c.y, [corDe(j)], 14, 3.5);
  if (j === VOCE && tem(salvo.progresso, "cometa")) efeitos.cometa(c.x - 140, c.y - 180, c.x, c.y, corDe(j));
  const r = resultado(tab);
  if (r !== null) {
    void terminar(r);
    return;
  }
  vez = outro(j);
  habilitarCasas();
  atualizarVez();
  atualizarFerramentas();
  if (vez === IA) void turnoIA();
  else {
    estado("esperando você");
    mostrarPrevisao();
  }
}

async function turnoIA() {
  ocupado = true;
  habilitarCasas();
  estado("pensando…", true);
  atualizarFerramentas();
  await espera(300);
  const d = escolher(salvo.memoria, salvo.perfil, tab, IA);
  await mostrarCalor(d.opcoes);
  await espera(650);
  casas[d.casa].classList.add("escolhida");
  await espera(220);
  for (const p of explicarLance(d, salvo.memoria)) pensar(p);
  ocupado = false;
  const turno = turnoCalor;
  colocar(d.casa, IA);
  setTimeout(() => {
    if (turno === turnoCalor) limparCalor();
  }, 900);
}

const TITULOS: Record<ResultadoRodada, { texto: string; de: string }> = {
  vitoria: { texto: "Você venceu!", de: "voce" },
  derrota: { texto: "Ela venceu", de: "ia" },
  empate: { texto: "Empate", de: "" },
};

async function terminar(r: Peca) {
  fim = r;
  ocupado = true;
  habilitarCasas();
  atualizarVez();
  estado("aprendendo…", true);
  const v = vencedor(tab);
  if (v) desenharLinhaVitoria(v.linha, v.jogador);

  const precisaoAntes = precisaoAtual;
  const nivelAntes = nivelDe(precisaoAntes);
  salvo.memoriaAnterior = structuredClone(salvo.memoria);
  const aprendizado = aprender(salvo.memoria, lances, r);
  precisaoAtual = precisao(salvo.memoria);
  const nivelDepois = nivelDe(precisaoAtual);
  const res: ResultadoRodada = r === VOCE ? "vitoria" : r === 0 ? "empate" : "derrota";
  const ganho = recompensa(res, nivelAntes);
  salvo.progresso.faiscas += ganho;
  salvo.progresso.rodadas.push({ resultado: res, precisao: precisaoAtual, nivel: nivelDepois });
  salvar(salvo);

  const meio = centro(caixaTabuleiro);
  const supernova = tem(salvo.progresso, "supernova");
  if (res === "vitoria" && v) {
    for (const i of v.linha) {
      const c = centro(casas[i]);
      efeitos.explosao(c.x, c.y, [cor("--voce"), cor("--ouro"), "#ffffff"], supernova ? 90 : 36, supernova ? 13 : 8);
    }
    efeitos.confete([cor("--voce"), cor("--ouro"), cor("--ia"), "#ffffff"], supernova ? 260 : 120);
  } else if (res === "derrota" && v) {
    if (!movimentoReduzido()) {
      caixaTabuleiro.classList.remove("tremer");
      void caixaTabuleiro.offsetWidth;
      caixaTabuleiro.classList.add("tremer");
    }
    for (const i of v.linha) {
      const c = centro(casas[i]);
      efeitos.explosao(c.x, c.y, [cor("--ia"), "#ffffff"], 28, 6);
    }
  } else {
    efeitos.poeira(meio.x, meio.y, cor("--suave"));
  }

  const titulo = $("resultado-titulo");
  titulo.textContent = TITULOS[res].texto;
  titulo.dataset.de = TITULOS[res].de;
  $("resultado-ganho").innerHTML =
    ganho > 0
      ? `<b>+${ganho}</b> ${ganho === 1 ? "faísca" : "faíscas"}${res === "vitoria" && nivelAntes > 0 ? ` · vitória contra uma IA ${NIVEIS[nivelAntes].nome}` : ""}`
      : "Sem faíscas desta vez. Ela aprendeu com você.";
  $("resultado").hidden = false;

  if (ganho > 0) {
    setTimeout(() => {
      const alvo = centro($("faiscas"));
      efeitos.recompensa(meio.x, meio.y, alvo, cor("--ouro"), ganho);
      setTimeout(() => {
        atualizarTopo();
        const f = $("faiscas");
        f.classList.remove("pulsa");
        void f.offsetWidth;
        f.classList.add("pulsa");
      }, movimentoReduzido() ? 0 : 900);
    }, movimentoReduzido() ? 0 : 700);
  }

  await espera(500);
  tituloPensamento("O que eu aprendi");
  const licoes = explicarAprendizado(aprendizado, salvo.memoria, IA, r, precisaoAntes, precisaoAtual);
  for (const l of licoes) {
    pensar(l);
    await espera(140);
  }
  atualizarTudo(aprendizado.novosConceitos, ganho > 0);
  estado("rodada encerrada");
  ocupado = false;
  atualizarFerramentas();
  ($("proxima") as HTMLButtonElement).focus({ preventScroll: true });
  if (nivelDepois > nivelAntes) {
    await espera(1000);
    mostrarSubida(nivelDepois);
  }
}

function mostrarSubida(nivel: number) {
  $("subida-nome").textContent = NIVEIS[nivel].nome;
  $("subida-frase").textContent = NIVEIS[nivel].frase;
  const s = $("subida");
  s.hidden = false;
  const c = centro(s);
  efeitos.explosao(c.x, c.y, [cor("--ia"), "#ffffff", cor("--ouro")], 70, 10);
  const fechar = () => {
    s.hidden = true;
    clearTimeout(t);
  };
  const t = setTimeout(fechar, 3400);
  s.onclick = fechar;
}

/* ---------------- ferramentas ---------------- */

function podeUsar(id: Consumivel): boolean {
  const p = salvo.progresso;
  if (p.itens[id] <= 0 || ocupado) return false;
  if (id === "amnesia") return salvo.memoriaAnterior !== null;
  if (fim !== null || vez !== VOCE) return false;
  return id === "dica" || pilha.length > 0;
}

function atualizarFerramentas() {
  for (const id of ["dica", "desfazer", "amnesia"] as Consumivel[]) {
    const b = $<HTMLButtonElement>(`usar-${id}`);
    $(`n-${id}`).textContent = String(salvo.progresso.itens[id]);
    b.disabled = !podeUsar(id);
    b.title =
      salvo.progresso.itens[id] === 0
        ? "Compre na Oficina"
        : CONSUMIVEIS.find((c) => c.id === id)!.descricao;
  }
}

$("usar-dica").addEventListener("click", () => {
  if (!podeUsar("dica")) return;
  salvo.progresso.itens.dica -= 1;
  for (const c of lancesPerfeitos(tab, VOCE)) casas[c].classList.add("dica");
  pensar({ tipo: "duvida", texto: "Você pediu uma dica. Eu não vejo dicas, só aprendo com o que acontece." });
  salvar(salvo);
  atualizarFerramentas();
});

$("usar-desfazer").addEventListener("click", () => {
  if (!podeUsar("desfazer")) return;
  const foto = pilha.pop()!;
  tab = foto.tab;
  lances = foto.lances;
  salvo.perfil = JSON.parse(foto.perfil);
  salvo.progresso.itens.desfazer -= 1;
  turnoCalor++;
  limparCalor();
  limparMarcas("dica");
  desenharCasas();
  pensar({ tipo: "duvida", texto: "Você voltou um lance. Vou fingir que não vi." });
  mostrarPrevisao();
  salvar(salvo);
  atualizarFerramentas();
});

$("usar-amnesia").addEventListener("click", () => {
  if (!podeUsar("amnesia")) return;
  salvo.memoria = salvo.memoriaAnterior!;
  salvo.memoriaAnterior = null;
  salvo.progresso.itens.amnesia -= 1;
  precisaoAtual = precisao(salvo.memoria);
  pensar({ tipo: "aviso", texto: "Ei... esqueci tudo o que aprendi na última partida." });
  const c = centro(caixaTabuleiro);
  efeitos.poeira(c.x, c.y, cor("--ia"));
  salvar(salvo);
  atualizarTudo();
});

$("proxima").addEventListener("click", novaRodada);

/* ---------------- topo e painéis ---------------- */

function atualizarTopo(faiscas = true) {
  const n = nivelDe(precisaoAtual);
  $("nivel-nome").textContent = NIVEIS[n].nome;
  $("nivel-num").textContent = porcento(precisaoAtual);
  $("nivel-barra").style.width = porcento(precisaoAtual);
  $("nivel").setAttribute(
    "aria-label",
    `IA no nível ${NIVEIS[n].nome}, precisão ${porcento(precisaoAtual)}. Ver evolução.`,
  );
  if (faiscas) $("faiscas-num").textContent = String(salvo.progresso.faiscas);
}

function desenharConceitos(novos: Conceito[] = []) {
  const m = salvo.memoria;
  const aprendidos = CONCEITOS.filter((c) => m.descobertas[c] !== undefined).length;
  const caixa = $("aba-conceitos");
  caixa.innerHTML = `
    <div class="numeros">
      <div><b>${aprendidos} de ${CONCEITOS.length}</b><span>conceitos aprendidos</span></div>
      <div><b>${posicoesConhecidas(m)}</b><span>posições lembradas</span></div>
      <div><b>${porcento(temperatura(m.partidas) / 0.5)}</b><span>curiosidade</span></div>
    </div>
    <div class="conceitos"></div>`;
  const grade = caixa.querySelector(".conceitos")!;
  for (const c of CONCEITOS) {
    const w = Math.max(-1, Math.min(1, m.w[c]));
    const quando = m.descobertas[c];
    const d = document.createElement("div");
    d.className = `conceito${quando === undefined ? " trancado" : ""}${novos.includes(c) ? " novo" : ""}`;
    const esquerda = w >= 0 ? 50 : 50 + w * 50;
    d.innerHTML = `
      <div class="conceito-topo">${DESCRICAO[c].nome}<span>${numero(m.w[c])}</span></div>
      <p>${DESCRICAO[c].frase.charAt(0).toUpperCase() + DESCRICAO[c].frase.slice(1)}</p>
      <div class="barra" role="img" aria-label="peso ${numero(m.w[c])}"><i class="${w >= 0 ? "pos" : "neg"}" style="left:${esquerda}%;width:${Math.abs(w) * 50}%"></i></div>
      <small>${quando === undefined ? "Ainda não aprendeu" : `Aprendido na partida ${quando} · ${m.w[c] >= 0 ? "bom para ela" : "ela evita"}`}</small>`;
    grade.append(d);
  }
}

function desenharEvolucaoAba() {
  const caixa = $("aba-evolucao");
  if (caixa.hidden) return;
  const r = salvo.progresso.rodadas;
  const conta = (x: ResultadoRodada) => r.filter((y) => y.resultado === x).length;
  caixa.innerHTML = `
    <div class="numeros">
      <div><b>${r.length}</b><span>rodadas</span></div>
      <div><b>${conta("vitoria")}</b><span>vitórias suas</span></div>
      <div><b>${conta("empate")}</b><span>empates</span></div>
      <div><b>${conta("derrota")}</b><span>vitórias dela</span></div>
      <div><b>${porcento(precisaoAtual)}</b><span>precisão da IA</span></div>
    </div>
    <div class="grafico"></div>`;
  desenharEvolucao(caixa.querySelector(".grafico") as HTMLElement, r, PRECISAO_INICIAL);
}

function desenharVoce() {
  const h = habitos(salvo.perfil);
  const caixa = $("aba-voce");
  const obs = posicoesObservadas(salvo.perfil);
  caixa.innerHTML =
    (h.length
      ? `<ul class="habitos">${h.map((x) => `<li>${x.texto}</li>`).join("")}</ul>`
      : '<p class="vazio">Jogue algumas rodadas: depois de três partidas ela começa a perceber os seus hábitos.</p>') +
    `<p class="vazio">Ela já te viu jogar em ${obs} ${obs === 1 ? "posição diferente" : "posições diferentes"}. Quando você repete um lance numa posição, ela passa a contar com ele.</p>`;
}

/** Redesenha tudo. Com `segurarFaiscas`, o contador espera as faíscas voarem até ele. */
function atualizarTudo(novos: Conceito[] = [], segurarFaiscas = false) {
  atualizarTopo(!segurarFaiscas);
  desenharConceitos(novos);
  desenharEvolucaoAba();
  desenharVoce();
  atualizarFerramentas();
  if ($<HTMLDialogElement>("oficina").open) desenharOficina();
}

/* abas */
const botoesAba = [...document.querySelectorAll<HTMLButtonElement>("[data-aba]")];
function abrirAba(nome: string) {
  for (const b of botoesAba) {
    const ativa = b.dataset.aba === nome;
    b.setAttribute("aria-selected", String(ativa));
    $(`aba-${b.dataset.aba}`).hidden = !ativa;
  }
  if (nome === "evolucao") desenharEvolucaoAba();
}
for (const b of botoesAba) b.addEventListener("click", () => abrirAba(b.dataset.aba!));

$("nivel").addEventListener("click", () => {
  abrirAba("evolucao");
  $("aba-evolucao").scrollIntoView({ behavior: movimentoReduzido() ? "auto" : "smooth", block: "center" });
});

let redimensionar = 0;
window.addEventListener("resize", () => {
  clearTimeout(redimensionar);
  redimensionar = window.setTimeout(desenharEvolucaoAba, 150);
});

/* ---------------- oficina ---------------- */

const TEMA_DO_ITEM: Partial<Record<Permanente, Tema>> = {
  brasa: "brasa",
  oceano: "oceano",
  papel: "papel",
};

function aplicarTema(t: Tema) {
  document.documentElement.dataset.tema = t;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", cor("--fundo"));
}

function botaoItem(item: Item<Consumivel | Permanente>): string {
  const p = salvo.progresso;
  const consumivel = CONSUMIVEIS.some((c) => c.id === item.id);
  const dono = !consumivel && p.permanentes.includes(item.id as Permanente);
  const tema = TEMA_DO_ITEM[item.id as Permanente];
  let acao: string;
  if (dono && tema) {
    acao =
      p.tema === tema
        ? `<span class="em-uso">Em uso <button class="botao" data-tema="noite" type="button">Tirar</button></span>`
        : `<button class="botao" data-tema="${tema}" type="button">Usar</button>`;
  } else if (dono) {
    acao = `<button class="botao" type="button" disabled>Ativo</button>`;
  } else {
    acao = `<button class="botao${p.faiscas >= item.preco ? " botao-primario" : ""}" data-comprar="${item.id}" type="button" ${p.faiscas < item.preco ? "disabled" : ""}>Comprar · <span class="preco">✦ ${item.preco}</span></button>`;
  }
  const extra = consumivel ? ` <small>(você tem ${p.itens[item.id as Consumivel]})</small>` : "";
  return `<div class="item${dono ? " seu" : ""}"><b>${item.nome}${extra}</b><p>${item.descricao}</p>${acao}</div>`;
}

function desenharOficina() {
  $("oficina-faiscas").textContent = String(salvo.progresso.faiscas);
  const grupos: [string, Item<Consumivel | Permanente>[]][] = [
    ["Poderes", [...CONSUMIVEIS]],
    ["Ver a mente da IA", PERMANENTES.filter((i) => i.grupo === "visao")],
    ["Temas", PERMANENTES.filter((i) => i.grupo === "tema")],
    ["Efeitos", PERMANENTES.filter((i) => i.grupo === "efeito")],
  ];
  $("oficina-itens").innerHTML = grupos
    .map(([nome, itens]) => `<h3>${nome}</h3><div class="itens">${itens.map(botaoItem).join("")}</div>`)
    .join("");
}

$("oficina-itens").addEventListener("click", (ev) => {
  const alvo = (ev.target as HTMLElement).closest("button");
  if (!alvo) return;
  if (alvo.dataset.comprar) {
    const id = alvo.dataset.comprar as Consumivel | Permanente;
    if (comprar(salvo.progresso, id)) {
      const tema = TEMA_DO_ITEM[id as Permanente];
      if (tema) {
        salvo.progresso.tema = tema;
        aplicarTema(tema);
      }
      const c = centro(alvo);
      efeitos.explosao(c.x, c.y, [cor("--ouro"), "#ffffff"], 24, 5);
      salvar(salvo);
      atualizarTudo();
      mostrarPrevisao();
      desenharOficina();
    }
  } else if (alvo.dataset.tema) {
    salvo.progresso.tema = alvo.dataset.tema as Tema;
    aplicarTema(salvo.progresso.tema);
    salvar(salvo);
    desenharOficina();
  }
});

const oficina = $<HTMLDialogElement>("oficina");
$("abrir-oficina").addEventListener("click", () => {
  desenharOficina();
  oficina.showModal();
});
$("fechar-oficina").addEventListener("click", () => oficina.close());
oficina.addEventListener("click", (ev) => {
  if (ev.target === oficina) oficina.close();
});

/* ---------------- recomeçar ---------------- */

$("apagar").addEventListener("click", () => {
  if (!confirm("Apagar tudo? A IA esquece o que aprendeu e suas faíscas e upgrades voltam ao início.")) return;
  apagar();
  salvo = novoJogo();
  precisaoAtual = precisao(salvo.memoria);
  aplicarTema("noite");
  lista.replaceChildren();
  boasVindas();
  novaRodada();
});

function boasVindas() {
  if (salvo.progresso.rodadas.length > 0) {
    pensar({
      tipo: "lembranca",
      texto: `Voltei. Lembro das nossas ${salvo.progresso.rodadas.length} rodadas e de ${CONCEITOS.filter((c) => salvo.memoria.descobertas[c] !== undefined).length} conceitos que aprendi.`,
    });
    return;
  }
  pensar({
    tipo: "curiosa",
    texto:
      "Oi. Eu ainda não sei jogar, nem sei que três em linha vence. Vou aprender jogando contra você. Cada vitória sua vale faíscas para a Oficina.",
  });
}

aplicarTema(salvo.progresso.tema);
boasVindas();
novaRodada();
