/**
 * Transforma os números da IA em frases. Toda frase sai do que ela de fato calculou: nada de
 * explicação inventada depois do lance.
 */
import { type Jogador, type Peca, nomeDaCasa, outro } from "../jogo/tabuleiro";
import type { Aprendizado, Decisao, Memoria } from "./cerebro";
import { CONCEITOS, type Conceito, DESCRICAO } from "./conceitos";

export function numero(v: number, casas = 2): string {
  const texto = Math.abs(v).toFixed(casas).replace(".", ",");
  if (Number(Math.abs(v).toFixed(casas)) === 0) return texto;
  return (v > 0 ? "+" : "−") + texto;
}

export const porcento = (v: number): string => `${Math.round(v * 100)}%`;

const inicial = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export interface Pensamento {
  tipo: "curiosa" | "conceito" | "lembranca" | "leitura" | "duvida" | "aviso";
  texto: string;
  conceito?: Conceito;
}

/** Por que a IA escolheu o lance que escolheu. */
export function explicarLance(d: Decisao, m: Memoria): Pensamento[] {
  const escolhida = d.opcoes.find((o) => o.casa === d.casa)!;
  const favorita = d.opcoes.reduce((a, b) => (b.nota > a.nota ? b : a));
  const onde = nomeDaCasa(d.casa);
  const saida: Pensamento[] = [];

  const tudoZero = d.opcoes.every((o) => Math.abs(o.nota) < 1e-6);
  if (tudoZero) {
    saida.push({
      tipo: "curiosa",
      texto:
        m.partidas === 0
          ? `Ainda não sei nada sobre este jogo. Joguei no ${onde} só para ver o que acontece.`
          : `Nada do que aprendi se aplica aqui. Joguei no ${onde} para descobrir.`,
    });
    return saida;
  }

  if (escolhida.casa !== favorita.casa && favorita.nota - escolhida.nota > 0.1) {
    const chance = porcento(escolhida.prob);
    const frases = [
      `Arrisquei o ${onde}, que não era meu favorito (dava ${chance} de chance a ele). Testar o diferente é como eu descubro coisas.`,
      `Meu favorito era o ${nomeDaCasa(favorita.casa)}, mas fui no ${onde} para ver o que acontece. Ainda sou curiosa.`,
      `Lance de teste: o ${onde} tinha só ${chance} de chance. Se der certo, aprendo algo novo.`,
    ];
    saida.push({ tipo: "curiosa", texto: frases[(m.partidas + d.casa) % frases.length] });
    return saida;
  }

  // A maior razão a favor do lance: um conceito, a lembrança da posição ou a leitura de você.
  const razoes: { peso: number; p: Pensamento }[] = [];
  for (const c of CONCEITOS) {
    if (escolhida.tracos[c] && m.w[c] > 0.05) {
      const quando = m.descobertas[c];
      razoes.push({
        peso: m.w[c],
        p: {
          tipo: "conceito",
          conceito: c,
          texto: `Joguei no ${onde} para ${DESCRICAO[c].frase}. ${
            quando ? `Aprendi isso na partida ${quando}` : "Estou aprendendo isso"
          }, e hoje vale ${numero(m.w[c])} para mim.`,
        },
      });
    }
  }
  if (escolhida.lembranca > 0.05 && escolhida.visitas > 0) {
    razoes.push({
      peso: escolhida.lembranca,
      p: {
        tipo: "lembranca",
        texto: `Eu me lembro desta posição: já joguei no ${onde} aqui ${escolhida.visitas === 1 ? "uma vez" : `${escolhida.visitas} vezes`} e deu certo.`,
      },
    });
  }
  const leitura = escolhida.leitura;
  if (leitura && escolhida.nota - escolhida.total > 0.05) {
    razoes.push({
      peso: escolhida.nota - escolhida.total,
      p: {
        tipo: "leitura",
        texto: `Depois deste lance, você costuma responder no ${nomeDaCasa(leitura.resposta)} (${leitura.vezes} vezes até agora). Contando com isso, o ${onde} ficou melhor para mim.`,
      },
    });
  }
  razoes.sort((a, b) => b.peso - a.peso);
  if (razoes.length > 0) saida.push(razoes[0].p);
  else
    saida.push({
      tipo: "duvida",
      texto: `Ainda estou em dúvida aqui: nenhum lance se destacou. Fiquei com o ${onde}.`,
    });

  // O que ela evitou de propósito.
  const evitada = d.opcoes
    .filter((o) => o.casa !== d.casa && o.nota < -0.2)
    .sort((a, b) => a.nota - b.nota)[0];
  if (evitada) {
    const ruim = CONCEITOS.filter((c) => evitada.tracos[c] && m.w[c] < -0.1).sort(
      (a, b) => m.w[a] - m.w[b],
    )[0];
    saida.push({
      tipo: "aviso",
      texto: ruim
        ? `Evitei o ${nomeDaCasa(evitada.casa)}: seria ${DESCRICAO[ruim].frase}, e isso já me custou partidas (${numero(m.w[ruim])}).`
        : `Evitei o ${nomeDaCasa(evitada.casa)}: lembro de perder depois de jogar ali nesta posição.`,
    });
  }
  return saida;
}

export interface Licao {
  tipo: "resultado" | "erro" | "conceito" | "copia" | "precisao" | "reforco";
  texto: string;
  conceito?: Conceito;
}

/** O que a IA aprendeu com a partida que acabou. */
export function explicarAprendizado(
  a: Aprendizado,
  m: Memoria,
  ia: Jogador,
  fim: Peca,
  precisaoAntes: number,
  precisaoDepois: number,
): Licao[] {
  const licoes: Licao[] = [];
  const minhas = a.ajustes.filter((x) => x.vez === ia);
  const suas = a.ajustes.filter((x) => x.vez === outro(ia));

  if (fim === outro(ia)) {
    const ultima = minhas[minhas.length - 1];
    const vencedor = suas[suas.length - 1];
    if (ultima && vencedor) {
      licoes.push({
        tipo: "erro",
        texto: `Meu erro: joguei no ${nomeDaCasa(ultima.casa)} e você fechou a linha no ${nomeDaCasa(vencedor.casa)}. Aquele lance caiu de ${numero(ultima.antes)} para ${numero(ultima.depois)}.`,
      });
      licoes.push({
        tipo: "copia",
        texto: "Também anotei o seu lance vencedor. Da próxima vez, quem usa sou eu.",
      });
    }
  } else if (fim === ia) {
    licoes.push({
      tipo: "reforco",
      texto: `Ganhei. Reforcei os ${minhas.length} lances que me trouxeram até aqui.`,
    });
  } else {
    licoes.push({
      tipo: "reforco",
      texto: "Empate. Ninguém errou feio: os lances desta partida valem um pouco mais agora.",
    });
  }

  for (const c of a.novosConceitos) {
    const bom = m.w[c] > 0;
    licoes.push({
      tipo: "conceito",
      conceito: c,
      texto: `Conceito novo: ${DESCRICAO[c].nome}. Agora sei que ${DESCRICAO[c].frase} ${bom ? "vale a pena" : "é perigoso"} (${numero(m.w[c])}).`,
    });
  }

  const mudancas = CONCEITOS.filter((c) => !a.novosConceitos.includes(c))
    .map((c) => ({ c, delta: m.w[c] - a.pesosAntes[c] }))
    .filter((x) => Math.abs(x.delta) >= 0.03)
    .sort((x, y) => Math.abs(y.delta) - Math.abs(x.delta))
    .slice(0, 2);
  for (const { c, delta } of mudancas) {
    licoes.push({
      tipo: "conceito",
      conceito: c,
      texto: `${inicial(DESCRICAO[c].nome)} ${delta > 0 ? "subiu" : "caiu"}: de ${numero(a.pesosAntes[c])} para ${numero(m.w[c])}.`,
    });
  }

  const ganho = precisaoDepois - precisaoAntes;
  if (Math.abs(ganho) >= 0.005) {
    licoes.push({
      tipo: "precisao",
      texto: `Minha precisão ${ganho > 0 ? "subiu" : "caiu"} de ${porcento(precisaoAntes)} para ${porcento(precisaoDepois)}.`,
    });
  }
  return licoes;
}
