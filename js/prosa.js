"use strict";
// Prosa — tarefas, notas, calculadora e chat num app só, no navegador, sem servidor.
// Junta o Prosa de antes com o Tique (lista de tarefas) e a Cifra (calculadora).
//
// Um arquivo só, de propósito: na primeira abertura são menos idas à internet. Partes, nesta ordem:
//   1. armazenamento   2. tela (ajudantes)   3. tarefas   4. notas   5. calculadora   6. chat   7. app (atalhos, tema)
// Segurança: tudo é montado pelo DOM (o texto entra sempre como texto, nunca como HTML); a calculadora lê a conta com
// um analisador próprio (nada de eval); as notas guardadas passam por uma limpeza que só deixa a formatação.

/* ============================================================ 1. armazenamento */
// Guarda e lê do navegador (localStorage). Dado estragado ou armazenamento bloqueado: devolve o padrão (ou false ao
// gravar), sem travar a página. Tique, Cifra e Prosa moram no mesmo endereço (vitor2054moraes-sys.github.io), então o
// navegador guarda os dados dos três juntos: o Prosa lê o que o Tique e a Cifra deixaram.
const Armazenamento = {
  ler(chave, padrao) {
    try {
      return JSON.parse(localStorage.getItem(chave)) ?? padrao;
    } catch {
      return padrao;
    }
  },
  gravar(chave, valor) {
    try {
      localStorage.setItem(chave, JSON.stringify(valor));
      return true;
    } catch {
      return false;
    }
  },
};

/* ============================================================ 2. tela (ajudantes) */
const $ = (id) => document.getElementById(id);

function el(tag, atributos = {}, ...filhos) {
  const no = document.createElement(tag);
  for (const [nome, valor] of Object.entries(atributos)) {
    if (valor === false || valor === null || valor === undefined) continue;
    if (nome.startsWith("on")) no.addEventListener(nome.slice(2), valor);
    else if (nome === "class") no.className = valor;
    else no.setAttribute(nome, valor === true ? "" : valor);
  }
  no.append(...filhos.flat().filter((f) => f !== null && f !== undefined && f !== false));
  return no;
}

// Ícones de traço, na cor do texto.
const ICONES = {
  editar: "M4 20h4L19 9l-4-4L4 16z M14 6l4 4",
  nota: "M6 3h9l3 3v15H6z M9 10h6 M9 14h6 M9 18h4",
  apagar: "M4 7h16 M9 7V4h6v3 M6 7l1 13h10l1-13",
  lua: "M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z",
  sol: "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z M12 2v2 M12 20v2 M4.9 4.9l1.4 1.4 M17.7 17.7l1.4 1.4 M2 12h2 M20 12h2 M4.9 19.1l1.4-1.4 M17.7 6.3l1.4-1.4",
};
function icone(nome) {
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("class", "icone");
  svg.setAttribute("aria-hidden", "true");
  const traco = document.createElementNS(ns, "path");
  traco.setAttribute("d", ICONES[nome]);
  svg.append(traco);
  return svg;
}

// Aviso que some sozinho (embaixo); com um botão (ex.: "Desfazer") quando há o que fazer.
function avisar(texto, acao = null) {
  $("aviso-texto").textContent = texto;
  const botao = $("aviso-acao");
  botao.hidden = !acao;
  botao.onclick = acao ? () => { esconderAviso(); acao.fazer(); } : null;
  if (acao) botao.textContent = acao.rotulo;
  $("aviso").hidden = false;
  clearTimeout(avisar.tempo);
  avisar.tempo = setTimeout(esconderAviso, acao ? 7000 : 4000);
}
function esconderAviso() {
  $("aviso").hidden = true;
}

const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;
const semAcento = (s) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
const hojeISO = () => new Date().toLocaleDateString("sv-SE");   // "AAAA-MM-DD" no fuso do aparelho
const diasAte = (iso) => Math.round((new Date(iso + "T12:00") - new Date(hojeISO() + "T12:00")) / 864e5);
const formatarData = (iso) => iso.split("-").reverse().join("/");

/* ============================================================ 3. tarefas */
// A lista do antigo Tique (prioridade, categoria, prazo, busca, desfazer) com o que o Prosa já tinha (número para o
// chat, editar, anotação em cada tarefa, embaralhar).
const PRIORIDADES = { alta: { nome: "Alta", peso: 0 }, media: { nome: "Média", peso: 1 }, baixa: { nome: "Baixa", peso: 2 } };
const PRIORIDADE_ANTIGA = { high: "alta", med: "media", low: "baixa" };   // como o Prosa de antes gravava
const CATEGORIAS = { trabalho: "Trabalho", pessoal: "Pessoal", estudos: "Estudos" };
const ORDENS = { prioridade: "Prioridade e prazo", criacao: "Ordem em que criei", embaralhada: "Embaralhada" };
const DATA = /^\d{4}-\d{2}-\d{2}$/;

const estaAtrasada = (t) => Boolean(t.prazo) && !t.feita && diasAte(t.prazo) < 0;
function textoDoPrazo(t) {
  const dias = diasAte(t.prazo);
  if (estaAtrasada(t)) return `Atrasada (${formatarData(t.prazo)})`;
  if (dias === 0) return "Hoje";
  if (dias === 1) return "Amanhã";
  return formatarData(t.prazo);
}

const Tarefas = {
  CHAVE: "prosa.tarefas",
  CHAVE_TIQUE: "tarefas",   // a lista do Tique
  lista: [],
  busca: "",
  status: "todas",          // todas, pendentes ou feitas
  categoria: "todas",
  ordem: "prioridade",
  sorteio: new Map(),       // a ordem embaralhada (id -> sorteio)
  editando: null,           // id da tarefa com o texto aberto para editar
  abertas: new Set(),       // ids com a anotação aberta

  // Tarefa lida do navegador: confere cada campo (dado mexido ou de outra versão não quebra a página). Aceita o
  // formato do Tique (concluida, vencimento) e o do Prosa de antes (feita, high/med/low).
  normalizar(t) {
    if (!t || typeof t.texto !== "string" || !t.texto.trim()) return null;
    const prioridade = PRIORIDADE_ANTIGA[t.prioridade] || t.prioridade;
    const prazo = t.prazo ?? t.vencimento;
    return {
      id: Number.isFinite(Number(t.id)) ? Number(t.id) : 0,
      texto: t.texto.trim().slice(0, 200),
      feita: Boolean(t.feita ?? t.concluida),
      prioridade: PRIORIDADES[prioridade] ? prioridade : "media",
      categoria: CATEGORIAS[t.categoria] ? t.categoria : "pessoal",
      prazo: typeof prazo === "string" && DATA.test(prazo) ? prazo : null,
      nota: typeof t.nota === "string" ? t.nota.slice(0, 2000) : "",
    };
  },
  lerLista(chave) {
    const lidas = Armazenamento.ler(chave, []);
    return Array.isArray(lidas) ? lidas.map((t) => this.normalizar(t)).filter(Boolean) : [];
  },
  carregar() {
    this.lista = this.lerLista(this.CHAVE);
    const ordem = Armazenamento.ler("prosa.ordem", "prioridade");
    this.ordem = ORDENS[ordem] ? ordem : "prioridade";
    return this.trazerDoTique();
  },
  // Uma vez só: as tarefas do Tique entram aqui. A lista dele fica guardada como estava (de reserva).
  trazerDoTique() {
    const trazidos = Armazenamento.ler("prosa.importado", []);
    if (!Array.isArray(trazidos) || trazidos.includes("tique")) return 0;
    const doTique = this.lerLista(this.CHAVE_TIQUE);
    const usados = new Set(this.lista.map((t) => t.id));
    for (const t of doTique) {
      while (usados.has(t.id)) t.id += 1;
      usados.add(t.id);
      this.lista.push(t);
    }
    if (doTique.length && !Armazenamento.gravar(this.CHAVE, this.lista)) return 0;   // não gravou: tenta de novo depois
    Armazenamento.gravar("prosa.importado", [...trazidos, "tique"]);
    return doTique.length;
  },
  salvar() {
    if (!Armazenamento.gravar(this.CHAVE, this.lista)) avisar("Não deu para salvar neste navegador (armazenamento cheio ou bloqueado).");
  },
  mudou() {
    this.salvar();
    this.desenhar();
  },

  // ---- ações (usadas pelos botões e pelo chat)
  achar(id) { return this.lista.find((t) => t.id === id) || null; },
  adicionar(texto, extras = {}) {
    const id = Math.max(Date.now(), ...this.lista.map((t) => t.id + 1));
    const tarefa = this.normalizar({ id, texto, ...extras });
    if (!tarefa) return null;
    this.lista.push(tarefa);
    this.mudou();
    return tarefa;
  },
  alternar(id) {
    const t = this.achar(id);
    if (t) { t.feita = !t.feita; this.mudou(); }
    return t;
  },
  // Apaga e oferece "Desfazer" (nada de pergunta que trava a tela).
  apagarAs(filtro, mensagem) {
    const saem = this.lista.map((t, posicao) => ({ t, posicao })).filter(({ t }) => filtro(t));
    if (!saem.length) return 0;
    this.lista = this.lista.filter((t) => !filtro(t));
    for (const { t } of saem) this.abertas.delete(t.id);
    this.mudou();
    avisar(mensagem(saem), { rotulo: "Desfazer", fazer: () => this.devolver(saem) });
    return saem.length;
  },
  devolver(saem) {
    for (const { t, posicao } of [...saem].sort((a, b) => a.posicao - b.posicao)) this.lista.splice(posicao, 0, t);
    this.mudou();
  },
  remover(id) {
    return this.apagarAs((t) => t.id === id, (saem) => `Tarefa apagada: "${saem[0].t.texto}"`);
  },
  apagarFeitas() {
    return this.apagarAs((t) => t.feita, (saem) => `${plural(saem.length, "tarefa feita apagada", "tarefas feitas apagadas")}.`);
  },
  apagarTodas() {
    return this.apagarAs(() => true, (saem) => `${plural(saem.length, "tarefa apagada", "tarefas apagadas")}.`);
  },
  renomear(id, texto) {
    const t = this.achar(id);
    if (t && texto.trim()) t.texto = texto.trim().slice(0, 200);
    this.editando = null;
    this.mudou();
  },
  anotar(id, nota) {   // grava sem redesenhar (o cursor fica onde está)
    const t = this.achar(id);
    if (t) { t.nota = nota.slice(0, 2000); this.salvar(); }
  },
  mudarOrdem(ordem) {
    this.ordem = ORDENS[ordem] ? ordem : "prioridade";
    if (this.ordem === "embaralhada") this.sorteio.clear();   // escolher "Embaralhada" já embaralha
    Armazenamento.gravar("prosa.ordem", this.ordem);
    this.desenhar();
  },

  // O número de cada tarefa é a ordem em que foi criada: não muda ao marcar como feita nem ao reordenar (o chat usa).
  porCriacao() { return [...this.lista].sort((a, b) => a.id - b.id); },
  porNumero(n) { return this.porCriacao()[n - 1] || null; },
  numero(t) { return this.porCriacao().indexOf(t) + 1; },

  ordenadas() {
    const l = [...this.lista];
    if (this.ordem === "criacao") return l.sort((a, b) => a.id - b.id);
    if (this.ordem === "embaralhada") {
      for (const t of l) if (!this.sorteio.has(t.id)) this.sorteio.set(t.id, Math.random());
      return l.sort((a, b) => this.sorteio.get(a.id) - this.sorteio.get(b.id));
    }
    // pendentes antes; depois a prioridade, o prazo mais perto e a mais antiga
    return l.sort((a, b) => a.feita - b.feita
      || PRIORIDADES[a.prioridade].peso - PRIORIDADES[b.prioridade].peso
      || (a.prazo || "9999").localeCompare(b.prazo || "9999")
      || a.id - b.id);
  },
  visiveis() {
    const termo = semAcento(this.busca.trim());
    return this.ordenadas()
      .filter((t) => !termo || semAcento(`${t.texto} ${t.nota}`).includes(termo))
      .filter((t) => this.categoria === "todas" || t.categoria === this.categoria)
      .filter((t) => this.status === "todas" || (this.status === "feitas") === t.feita);
  },

  // ---- tela
  item(t, n) {
    const atrasada = estaAtrasada(t);
    const aberta = this.abertas.has(t.id);
    const texto = this.editando === t.id
      ? el("input", { type: "text", class: "editar-texto", value: t.texto, maxlength: 200, "aria-label": `Editar a tarefa ${n}`,
          onkeydown: (e) => {
            if (e.key === "Enter") this.renomear(t.id, e.target.value);
            if (e.key === "Escape") { this.editando = null; this.desenhar(); }
          },
          onblur: (e) => { if (this.editando === t.id) this.renomear(t.id, e.target.value); } })
      : el("p", { class: "texto" }, t.texto);
    return el("li", { class: ["tarefa", `prioridade-${t.prioridade}`, t.feita && "feita", atrasada && "atrasada"].filter(Boolean).join(" ") },
      el("span", { class: "num", title: "Nº para o chat" }, String(n)),
      el("input", { type: "checkbox", checked: t.feita, "aria-label": `Feita: ${t.texto}`, onchange: () => this.alternar(t.id) }),
      el("div", { class: "corpo" }, texto,
        el("p", { class: "etiquetas" },
          el("span", { class: "etiqueta" }, CATEGORIAS[t.categoria]),
          el("span", { class: `etiqueta ${t.prioridade}` }, PRIORIDADES[t.prioridade].nome),
          t.prazo ? el("span", { class: `etiqueta prazo${atrasada ? " atrasada" : ""}` }, textoDoPrazo(t)) : null),
        aberta ? el("textarea", { class: "anotacao", rows: 3, maxlength: 2000, placeholder: "Anotação desta tarefa…",
          "aria-label": `Anotação: ${t.texto}`, oninput: (e) => this.anotar(t.id, e.target.value) }, t.nota) : null),
      el("span", { class: "acoes" },
        el("button", { type: "button", class: "icone-botao", title: "Editar", "aria-label": `Editar: ${t.texto}`,
          onclick: () => { this.editando = t.id; this.desenhar(); } }, icone("editar")),
        el("button", { type: "button", class: `icone-botao${t.nota ? " com-nota" : ""}`, title: t.nota ? "Anotação (tem texto)" : "Anotação",
          "aria-label": `Anotação: ${t.texto}`, "aria-expanded": String(aberta),
          onclick: () => { if (aberta) this.abertas.delete(t.id); else this.abertas.add(t.id); this.desenhar(); } }, icone("nota")),
        el("button", { type: "button", class: "icone-botao apagar", title: "Apagar", "aria-label": `Apagar: ${t.texto}`,
          onclick: () => this.remover(t.id) }, icone("apagar"))));
  },

  desenhar() {
    const numeros = new Map(this.porCriacao().map((t, i) => [t.id, i + 1]));
    const mostrar = this.visiveis();
    const ul = $("lista-tarefas");
    ul.replaceChildren(...mostrar.map((t) => this.item(t, numeros.get(t.id))));
    if (!mostrar.length) {
      ul.append(el("li", { class: "vazio" }, this.lista.length ? "Nenhuma tarefa com esses filtros."
        : "Nada por fazer. Escreva a primeira tarefa acima — ou no Chat: add comprar pão."));
    }
    const feitas = this.lista.filter((t) => t.feita).length;
    const pendentes = this.lista.length - feitas;
    const atrasadas = this.lista.filter(estaAtrasada).length;
    $("resumo-tarefas").textContent = this.lista.length
      ? [plural(pendentes, "pendente", "pendentes"), atrasadas ? plural(atrasadas, "atrasada", "atrasadas") : null,
        plural(feitas, "feita", "feitas")].filter(Boolean).join(" · ") : "";
    const barra = $("barra-progresso");
    barra.max = Math.max(this.lista.length, 1);
    barra.value = feitas;
    $("progresso").hidden = !this.lista.length;
    $("botao-apagar-feitas").disabled = !feitas;
    $("botao-embaralhar").hidden = this.ordem !== "embaralhada";
    $("campo-ordem").value = this.ordem;
    App.contador("tarefas", pendentes, atrasadas > 0);
    ul.querySelector(".editar-texto")?.focus();
  },

  iniciar() {
    const trazidas = this.carregar();
    this.desenhar();
    const form = $("form-tarefa");
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const campo = $("campo-tarefa");
      if (this.adicionar(campo.value, { prioridade: $("campo-prioridade").value, categoria: $("campo-categoria").value,
        prazo: $("campo-prazo").value })) {
        campo.value = "";
        $("campo-prazo").value = "";
      }
      campo.focus();
    });
    $("campo-busca").addEventListener("input", (e) => { this.busca = e.target.value; this.desenhar(); });
    $("filtro-categoria").addEventListener("change", (e) => { this.categoria = e.target.value; this.desenhar(); });
    $("campo-ordem").addEventListener("change", (e) => this.mudarOrdem(e.target.value));
    $("botao-embaralhar").addEventListener("click", () => { this.sorteio.clear(); this.desenhar(); });
    $("botao-apagar-feitas").addEventListener("click", () => this.apagarFeitas());
    for (const botao of document.querySelectorAll(".segmentos button")) {
      botao.addEventListener("click", () => {
        this.status = botao.dataset.status;
        for (const b of document.querySelectorAll(".segmentos button")) b.setAttribute("aria-pressed", String(b === botao));
        this.desenhar();
      });
    }
    return trazidas;
  },
};

/* ============================================================ 4. notas */
// Bloco de notas com formatação (negrito, itálico, sublinhado, riscado, lista). Guarda o texto formatado no navegador.
// Segurança: ao colar entra só o texto puro; ao ler de volta, só passam as marcas de formatação, SEM nenhum atributo
// (nada de script, imagem, link ou evento) — mesmo que alguém mexa no armazenamento do navegador.
const Notas = {
  CHAVE: "prosa.notas",
  PERMITIDAS: new Set(["B", "STRONG", "I", "EM", "U", "S", "STRIKE", "UL", "OL", "LI", "BR", "DIV", "P"]),
  DESCARTAR: new Set(["SCRIPT", "STYLE", "TEMPLATE", "IFRAME", "OBJECT", "EMBED", "NOSCRIPT"]),
  tempo: null,

  // HTML guardado -> nós seguros. O DOMParser só lê (não roda script nem carrega imagem).
  limpar(html) {
    const origem = new DOMParser().parseFromString(String(html || ""), "text/html").body;
    const copiar = (de, para) => {
      for (const no of de.childNodes) {
        if (no.nodeType === Node.TEXT_NODE) para.append(no.textContent);
        else if (no.nodeType === Node.ELEMENT_NODE && !this.DESCARTAR.has(no.tagName)) {
          if (this.PERMITIDAS.has(no.tagName)) para.append(copiar(no, document.createElement(no.tagName)));
          else copiar(no, para);   // marca desconhecida: fica só o texto de dentro
        }
      }
      return para;
    };
    return copiar(origem, document.createDocumentFragment());
  },

  iniciar() {
    const area = $("notas");
    area.replaceChildren(this.limpar(Armazenamento.ler(this.CHAVE, "")));
    area.addEventListener("input", () => this.salvarDepois());
    area.addEventListener("paste", (e) => {   // colar: só o texto, sem a formatação de outro site
      e.preventDefault();
      document.execCommand("insertText", false, e.clipboardData.getData("text/plain"));
    });
    for (const botao of document.querySelectorAll(".formatar button")) {
      botao.addEventListener("mousedown", (e) => e.preventDefault());   // não tira a seleção do texto
      botao.addEventListener("click", () => {
        area.focus();
        document.execCommand(botao.dataset.cmd);
        this.salvarDepois();
      });
    }
  },

  // Grava meio segundo depois da última tecla (não a cada letra).
  salvarDepois() {
    $("notas-salvas").textContent = "Salvando…";
    clearTimeout(this.tempo);
    this.tempo = setTimeout(() => this.salvar(), 500);
  },
  salvar() {
    const area = $("notas");
    const ok = Armazenamento.gravar(this.CHAVE, area.textContent.trim() ? area.innerHTML : "");
    $("notas-salvas").textContent = ok
      ? `Salvo às ${new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}` : "Não deu para salvar neste navegador.";
  },
  // Usado pelo chat ("nota texto"): uma linha nova no fim do bloco.
  acrescentar(texto) {
    $("notas").append(el("div", {}, texto));
    clearTimeout(this.tempo);
    this.salvar();
  },
};

/* ============================================================ 5. calculadora (a antiga Cifra) */
// Comum, científica, financeira (HP 12C), conversão de taxas e amortização. A conta é lida por um analisador próprio
// (só números, + − × ÷ ^, parênteses, π e e): nada de eval, que rodaria como programa qualquer texto do visor.
const Calculadora = (() => {
  // Gramática:  soma := produto (('+'|'−') produto)*     produto := sinal (('×'|'÷') sinal | sinal implícito)*
  //             sinal := ('−'|'+') sinal | potencia       potencia := atomo ('^' sinal)?
  //             atomo := número | π | e | '(' soma ')'
  // "2π" e "3(4+1)" multiplicam sozinhos; −2^2 = −4, como na matemática.
  function calcularExpressao(texto) {
    const fichas = texto.replace(/\s+/g, "").replace(/\*\*/g, "^").replace(/\*/g, "×").replace(/\//g, "÷").replace(/-/g, "−")
      .replace(/,/g, ".").match(/\d+\.?\d*|\.\d+|[+−×÷^()πe]|./g) || [];
    let pos = 0;
    const olhar = () => fichas[pos];
    const pegar = (esperado) => {
      if (esperado !== undefined && fichas[pos] !== esperado) throw new Error("conta incompleta");
      return fichas[pos++];
    };
    const comecaAtomo = (f) => f !== undefined && (/^[\d.]/.test(f) || f === "π" || f === "e" || f === "(");

    function soma() {
      let v = produto();
      while (olhar() === "+" || olhar() === "−") v = pegar() === "+" ? v + produto() : v - produto();
      return v;
    }
    function produto() {
      let v = sinal();
      for (;;) {
        if (olhar() === "×") { pegar(); v *= sinal(); }
        else if (olhar() === "÷") { pegar(); v /= sinal(); }
        else if (comecaAtomo(olhar())) v *= sinal();   // multiplicação implícita: 2π, 3(4)
        else return v;
      }
    }
    function sinal() {
      if (olhar() === "−") { pegar(); return -sinal(); }
      if (olhar() === "+") { pegar(); return sinal(); }
      return potencia();
    }
    function potencia() {
      const base = atomo();
      if (olhar() === "^") { pegar(); return base ** sinal(); }
      return base;
    }
    function atomo() {
      const f = pegar();
      if (f === undefined) throw new Error("conta incompleta");
      if (f === "π") return Math.PI;
      if (f === "e") return Math.E;
      if (f === "(") { const v = soma(); pegar(")"); return v; }
      if (/^(\d+\.?\d*|\.\d+)$/.test(f)) return Number(f);
      throw new Error(`não entendi "${f}"`);
    }

    const v = soma();
    if (pos < fichas.length) throw new Error(`não entendi "${fichas[pos]}"`);
    if (!Number.isFinite(v)) throw new Error("resultado indefinido");
    return v;
  }

  // Tira o "lixo" da conta com vírgula do computador (0.1 + 0.2 = 0.30000000000000004 → 0.3).
  const arredondar = (v) => Number(v.toPrecision(12));

  /* ---- visor */
  let entrada = "";          // o que foi digitado
  let mostrandoResultado = false;
  let modo = "comum";
  const SO_NUMERO = /^−?(\d+\.?\d*|\.\d+)?$/;

  // Sem "conta": mostra, enquanto se digita, o resultado que vai dar (a prévia).
  function mostrar(texto = entrada, conta = null) {
    $("calc-resultado").textContent = texto || "0";
    const linha = $("calc-conta");
    let previa = "";
    if (conta === null && !mostrandoResultado && !SO_NUMERO.test(entrada)) {
      try { previa = `= ${arredondar(calcularExpressao(entrada))}`; } catch { /* conta pela metade: sem prévia */ }
    }
    linha.textContent = conta ?? previa;
    linha.classList.toggle("previa", Boolean(previa));
  }
  function teclar(valor) {
    const operador = /^[+−×÷^]/.test(valor);
    if (mostrandoResultado && !operador) entrada = "";   // número novo depois de um resultado: começa outra conta
    mostrandoResultado = false;
    if (entrada.length < 80) entrada += valor;
    mostrar();
  }
  function limpar() { entrada = ""; mostrandoResultado = false; mostrar(); }
  function apagar() { entrada = entrada.slice(0, -1); mostrandoResultado = false; mostrar(); }
  function erro() { mostrar("Erro", entrada); entrada = ""; mostrandoResultado = false; }
  function resultado(valor, conta) {
    mostrar(String(valor), conta);
    entrada = String(valor);
    mostrandoResultado = true;
  }
  function calcular() {
    if (!entrada.trim()) return;
    try {
      const v = arredondar(calcularExpressao(entrada));
      guardar(entrada, v);
      resultado(v, `${entrada} =`);
    } catch {
      erro();
    }
  }
  function porcentagem() {
    try {
      resultado(arredondar(calcularExpressao(entrada || "0") / 100), `${entrada} %`);
    } catch {
      erro();
    }
  }

  /* ---- científica */
  const FUNCOES = {
    sin: [(x) => Math.sin(x * Math.PI / 180), "sin"],   // graus
    cos: [(x) => Math.cos(x * Math.PI / 180), "cos"],
    tan: [(x) => (Math.abs(x % 180) === 90 ? NaN : Math.tan(x * Math.PI / 180)), "tan"],
    sqrt: [Math.sqrt, "√"],
    log: [Math.log10, "log"],
    ln: [Math.log, "ln"],
    fatorial: [(x) => {
      if (!Number.isInteger(x) || x < 0 || x > 170) return NaN;   // só inteiros de 0 a 170
      let r = 1;
      for (let k = 2; k <= x; k++) r *= k;
      return r;
    }, "!"],
  };
  function cientifica(nome) {
    try {
      const x = arredondar(calcularExpressao(entrada || "0"));
      const [funcao, simbolo] = FUNCOES[nome];
      const r = funcao(x);
      if (!Number.isFinite(r)) throw new Error("fora do domínio");
      const v = arredondar(r);
      const expr = nome === "fatorial" ? `${x}!` : `${simbolo}(${x})`;
      guardar(expr, v);
      resultado(v, `${expr} =`);
    } catch {
      erro();
    }
  }

  /* ---- histórico (o mesmo da Cifra: "historicoCalc" — volta sozinho) */
  // Lido do navegador e conferido: só textos curtos e números (um histórico mexido não entra).
  let historico = [];
  function lerHistorico() {
    const h = Armazenamento.ler("historicoCalc", []);
    historico = Array.isArray(h) ? h.filter((x) => x && typeof x.expr === "string" && x.expr.length <= 120 && Number.isFinite(Number(x.res)))
      .map((x) => ({ expr: x.expr, res: Number(x.res) })).slice(0, 10) : [];
  }
  function guardar(expr, res) {
    historico = [{ expr: String(expr).slice(0, 120), res }, ...historico].slice(0, 10);
    Armazenamento.gravar("historicoCalc", historico);
    desenharHistorico();
  }
  function desenharHistorico() {
    const lista = $("calc-lista-historico");
    if (!historico.length) { lista.replaceChildren(el("li", { class: "vazio" }, "Nenhum cálculo ainda.")); return; }
    lista.replaceChildren(...historico.map((item) => el("li", {},
      el("button", { type: "button", "aria-label": `Usar ${item.res}`, onclick: () => resultado(item.res, `${item.expr} =`) },
        el("span", { class: "expr" }, `${item.expr} =`), el("span", { class: "res" }, String(item.res))))));
  }

  /* ---- modos */
  const NOMES = { comum: "Comum", cientifico: "Científica", financeiro: "Financeira (HP 12C)", taxas: "Conversão de taxas",
    amortizacao: "Tabela de amortização" };
  function trocarModo(novo) {
    modo = NOMES[novo] ? novo : "comum";
    for (const b of document.querySelectorAll(".modos [role=\"tab\"]")) b.setAttribute("aria-selected", String(b.dataset.modo === modo));
    for (const m of Object.keys(NOMES)) $(`calc-${m}`).hidden = m !== modo;
    $("calc-modo-nome").textContent = NOMES[modo];
    const basico = modo === "comum" || modo === "cientifico";
    $("calc-visor").hidden = !basico;
    $("calc-historico").hidden = !basico;
    Armazenamento.gravar("prosa.calc.modo", modo);
  }

  /* ---- financeira (HP 12C) */
  function lerValor(id) {
    const v = $(id).value;
    return v === "" ? null : Number(v);
  }
  const resultadoFin = (texto) => { $("fin-resultado").textContent = texto; };
  const FALTA = { n: ["i", "pv"], i: ["n", "pv"], pv: ["n", "i"], pmt: ["n", "i", "pv"], fv: ["n", "i", "pv"] };
  function calcularFinanceiro(alvo) {
    const v = Object.fromEntries(["n", "i", "pv", "pmt", "fv"].map((k) => [k, lerValor(`fin-${k}`)]));
    const faltando = FALTA[alvo].filter((k) => v[k] === null);
    if (faltando.length) { resultadoFin(`Para calcular ${alvo.toUpperCase()}, preencha: ${faltando.map((k) => k.toUpperCase()).join(", ")}.`); return; }
    if (alvo !== "i" && v.i === 0) { resultadoFin("Informe uma taxa (i) diferente de zero."); return; }
    const taxa = v.i / 100, pmt = v.pmt || 0, fv = v.fv || 0, pv = v.pv || 0, n = v.n;
    const fator = (1 + taxa) ** n;
    let r;
    if (alvo === "fv") r = -(pv * fator + pmt * ((fator - 1) / taxa));
    else if (alvo === "pv") r = -(fv / fator + pmt * ((1 - (1 + taxa) ** -n) / taxa));
    else if (alvo === "pmt") r = -((pv * fator + fv) / ((fator - 1) / taxa));
    else if (alvo === "n") r = Math.log((pmt - fv * taxa) / (pmt + pv * taxa)) / Math.log(1 + taxa);
    else r = calcularTaxa(n, pv, pmt, fv);
    if (!Number.isFinite(r)) { resultadoFin("Com esses valores não há resposta. Confira os sinais (o que sai do bolso é negativo)."); return; }
    const casas = alvo === "i" ? 4 : 2;
    $(`fin-${alvo}`).value = r.toFixed(casas);
    resultadoFin(`${alvo.toUpperCase()} = ${r.toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas })}`);
  }
  // Taxa pelo método de Newton (a mesma conta da HP 12C).
  function calcularTaxa(n, pv, pmt, fv) {
    let taxa = 0.01;
    for (let k = 0; k < 1000; k++) {
      const f = pv * (1 + taxa) ** n + pmt * (((1 + taxa) ** n - 1) / taxa) + fv;
      const df = pv * n * (1 + taxa) ** (n - 1) + pmt * ((n * (1 + taxa) ** (n - 1) * taxa - ((1 + taxa) ** n - 1)) / (taxa * taxa));
      const nova = taxa - f / df;
      if (!Number.isFinite(nova)) return NaN;
      if (Math.abs(nova - taxa) < 1e-10) return nova * 100;
      taxa = nova;
    }
    return NaN;   // não chegou a uma resposta
  }

  /* ---- conversão de taxas */
  function converterTaxa() {
    const valor = lerValor("taxa-valor");
    const saida = $("taxa-resultado");
    if (valor === null) { saida.textContent = "Informe a taxa."; return; }
    const de = Number($("taxa-de").value), para = Number($("taxa-para").value);
    const equivalente = ((1 + valor / 100) ** (para / de) - 1) * 100;
    saida.replaceChildren("Taxa equivalente: ", el("strong", {}, `${equivalente.toLocaleString("pt-BR", { maximumFractionDigits: 6 })}%`));
  }

  /* ---- amortização */
  const dinheiro = (v) => v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  function gerarTabela() {
    const pv = lerValor("am-pv"), i = (lerValor("am-i") ?? 0) / 100, n = lerValor("am-n");
    const div = $("am-resultado");
    if (!pv || pv <= 0 || !i || i <= 0 || !Number.isInteger(n) || n < 1 || n > 600) {
      div.replaceChildren(el("p", { class: "dica" }, "Preencha o valor, a taxa (maior que zero) e o número de parcelas (inteiro, de 1 a 600)."));
      return;
    }
    const sistema = $("am-sistema").value, linhas = [];
    let saldo = pv, totalJuros = 0, totalAmort = 0, totalParcela = 0;
    const pmtPrice = pv * (i * (1 + i) ** n) / ((1 + i) ** n - 1);
    for (let k = 1; k <= n; k++) {
      const juros = saldo * i;
      const amort = sistema === "price" ? pmtPrice - juros : pv / n;
      const parcela = sistema === "price" ? pmtPrice : amort + juros;
      saldo -= amort;
      totalJuros += juros; totalAmort += amort; totalParcela += parcela;
      linhas.push(el("tr", {}, ...[k, dinheiro(parcela), dinheiro(juros), dinheiro(amort), dinheiro(Math.abs(saldo) < 0.01 ? 0 : saldo)]
        .map((c) => el("td", {}, String(c)))));
    }
    div.replaceChildren(el("table", {},
      el("thead", {}, el("tr", {}, ...["#", "Parcela", "Juros", "Amort.", "Saldo"].map((t) => el("th", { scope: "col" }, t)))),
      el("tbody", {}, ...linhas,
        el("tr", { class: "total" }, ...["Total", dinheiro(totalParcela), dinheiro(totalJuros), dinheiro(totalAmort), "—"].map((c) => el("td", {}, c))))));
  }

  /* ---- teclado (só com a Calculadora aberta, nos modos Comum e Científica) */
  const MAPA = { "*": "×", "/": "÷", "-": "−", "+": "+", "^": "^", "(": "(", ")": ")", ".": ".", ",": "." };
  function teclado(e) {
    if (modo !== "comum" && modo !== "cientifico") return;
    if (e.target.matches("input, select, textarea, [contenteditable]") || e.ctrlKey || e.metaKey || e.altKey) return;
    if (/^[0-9]$/.test(e.key)) teclar(e.key);
    else if (MAPA[e.key]) { e.preventDefault(); teclar(MAPA[e.key]); }
    else if (e.key === "Enter" || e.key === "=") { e.preventDefault(); calcular(); }
    else if (e.key === "Backspace") apagar();
    else if (e.key === "Escape") limpar();
    else if (e.key === "%") porcentagem();
  }

  function iniciar() {
    lerHistorico();
    desenharHistorico();
    mostrar();
    trocarModo(Armazenamento.ler("prosa.calc.modo", "comum"));
    const ACOES = { limpar, apagar, porcentagem, calcular };
    // um ouvinte para todas as teclas da calculadora
    $("painel-calculadora").addEventListener("click", (e) => {
      const b = e.target.closest("button");
      if (!b) return;
      if (b.dataset.modo) trocarModo(b.dataset.modo);
      else if (b.dataset.tecla) teclar(b.dataset.tecla);
      else if (b.dataset.acao) ACOES[b.dataset.acao]();
      else if (b.dataset.funcao) cientifica(b.dataset.funcao);
      else if (b.dataset.alvo) calcularFinanceiro(b.dataset.alvo);
    });
    $("calc-limpar-historico").addEventListener("click", () => { historico = []; Armazenamento.gravar("historicoCalc", []); desenharHistorico(); });
    $("fin-limpar").addEventListener("click", () => {
      for (const k of ["n", "i", "pv", "pmt", "fv"]) $(`fin-${k}`).value = "";
      resultadoFin("");
    });
    $("taxa-converter").addEventListener("click", converterTaxa);
    $("am-gerar").addEventListener("click", gerarTabela);
  }

  return { iniciar, teclado, guardar, conta: (texto) => arredondar(calcularExpressao(texto)) };
})();

/* ============================================================ 6. chat */
// Comandos escritos: cuidam das tarefas, anotam no bloco de notas, fazem contas e abrem as partes do Prosa.
// Em inglês (como no começo) ou em português.
const Chat = {
  COMANDOS: {
    add: "add", adicionar: "add", nova: "add",
    done: "done", feito: "done", feita: "done",
    del: "del", apagar: "del", remover: "del",
    list: "list", lista: "list", listar: "list",
    clear: "clear", limpar: "clear",
    calc: "calc", conta: "calc", calcular: "calc",
    nota: "nota", anotar: "nota", note: "nota",
    abrir: "abrir", ir: "abrir", open: "abrir",
    help: "help", ajuda: "help", "?": "help",
  },

  falar(quem, texto) {
    const conversa = $("conversa");
    conversa.append(el("div", { class: `mensagem ${quem}` },
      el("span", { class: "quem" }, quem === "voce" ? "Você" : "Prosa"), el("p", { class: "fala" }, texto)));
    conversa.scrollTop = conversa.scrollHeight;
  },

  // A tarefa do "done 2" / "del 2": o nº que aparece na lista.
  tarefaDo(argumento) {
    const n = Number(argumento);
    const t = Number.isInteger(n) ? Tarefas.porNumero(n) : null;
    if (!t) this.falar("bot", `Não achei a tarefa nº ${argumento || "?"}. Use o número que aparece na lista.`);
    return t;
  },

  responder(entrada) {
    const [palavra = "", ...resto] = entrada.trim().split(/\s+/);
    const argumento = resto.join(" ");
    switch (this.COMANDOS[palavra.toLowerCase()]) {
      case "add": {
        if (!argumento) return this.falar("bot", "Escreva a tarefa depois do add. Ex.: add comprar pão");
        const t = Tarefas.adicionar(argumento);
        return this.falar("bot", `Tarefa nº ${Tarefas.numero(t)} adicionada: ${t.texto}`);
      }
      case "done": {
        const t = this.tarefaDo(argumento);
        if (t) { Tarefas.alternar(t.id); this.falar("bot", `${t.feita ? "Feita" : "Reaberta"}: ${t.texto}`); }
        return null;
      }
      case "del": {
        const t = this.tarefaDo(argumento);
        if (t) { Tarefas.remover(t.id); this.falar("bot", `Apagada: ${t.texto} (dá para desfazer no aviso embaixo).`); }
        return null;
      }
      case "list":
        return this.falar("bot", Tarefas.lista.length
          ? Tarefas.porCriacao().map((t, i) => `${i + 1}. ${t.feita ? "✓ " : ""}${t.texto}`).join("\n") : "A lista está vazia.");
      case "clear":
        if (!Tarefas.lista.length) return this.falar("bot", "A lista já está vazia.");
        Tarefas.apagarTodas();
        return this.falar("bot", "Todas as tarefas foram apagadas. Mudou de ideia? Toque em Desfazer, no aviso embaixo.");
      case "calc": {
        if (!argumento) return this.falar("bot", "Escreva a conta depois do calc. Ex.: calc 2+3×4");
        try {
          const v = Calculadora.conta(argumento);
          Calculadora.guardar(argumento, v);
          return this.falar("bot", `${argumento} = ${v}  (está no histórico da Calculadora)`);
        } catch {
          return this.falar("bot", `Não consegui fazer essa conta: ${argumento}`);
        }
      }
      case "nota":
        if (!argumento) return this.falar("bot", "Escreva o texto depois do nota. Ex.: nota ligar para o banco");
        Notas.acrescentar(argumento);
        return this.falar("bot", "Anotado no fim do bloco de Notas.");
      case "abrir": {
        const parte = Object.keys(App.ABAS).find((k) => semAcento(argumento).startsWith(semAcento(App.ABAS[k]).slice(0, 4)));
        if (!parte) return this.falar("bot", "Abrir o quê? tarefas, notas, calculadora ou chat.");
        App.abrir(parte);
        return null;
      }
      case "help":
        return this.falar("bot", "add texto — nova tarefa\ndone nº — marca como feita (de novo: reabre)\ndel nº — apaga\n"
          + "list — mostra a lista com os números\nclear — apaga todas\ncalc conta — faz a conta (ex.: calc 2+3×4)\n"
          + "nota texto — anota no bloco de Notas\nabrir notas — abre uma parte (tarefas, notas, calculadora)\n"
          + "Também em português: adicionar, feito, apagar, lista, limpar, conta, anotar, ir.");
      default:
        return this.falar("bot", `Não conheço "${palavra}". Digite help para ver os comandos.`);
    }
  },

  iniciar() {
    this.falar("bot", "Oi! Digite help para ver os comandos.");
    $("form-chat").addEventListener("submit", (e) => {
      e.preventDefault();
      const campo = $("campo-chat");
      if (!campo.value.trim()) return;
      this.falar("voce", campo.value.trim());
      this.responder(campo.value);
      campo.value = "";
    });
  },
};

/* ============================================================ 7. app: atalhos do topo, tema e início */
const Tema = {
  CHAVE: "prosa.tema",
  aplicar(escuro) {
    document.body.classList.toggle("escuro", escuro);
    const botao = $("botao-tema");
    const rotulo = escuro ? "Tema claro" : "Tema escuro";
    botao.replaceChildren(icone(escuro ? "sol" : "lua"));
    botao.setAttribute("aria-label", rotulo);
    botao.title = rotulo;
  },
  iniciar() {
    const salvo = Armazenamento.ler(this.CHAVE, null);   // sem escolha salva: segue o aparelho
    this.aplicar(salvo === null ? matchMedia("(prefers-color-scheme: dark)").matches : salvo === "escuro");
    $("botao-tema").addEventListener("click", () => {
      const escuro = !document.body.classList.contains("escuro");
      this.aplicar(escuro);
      Armazenamento.gravar(this.CHAVE, escuro ? "escuro" : "claro");
    });
  },
};

// As partes moram na mesma página: trocar é só mostrar outra (nada a buscar na internet). O endereço ganha #tarefas,
// #notas... (o botão Voltar do celular volta para a parte anterior, e um link pode abrir direto numa parte).
const App = {
  ABAS: { tarefas: "Tarefas", notas: "Notas", calculadora: "Calculadora", chat: "Chat" },
  rolagem: {},   // onde cada parte estava (voltar a ela volta ao mesmo ponto)

  daUrl() {
    const nome = location.hash.slice(1);   // só aceita os quatro nomes; qualquer outra coisa abre a parte padrão
    return Object.hasOwn(this.ABAS, nome) ? nome : null;
  },
  abrir(nome, { historico = true } = {}) {
    if (!this.ABAS[nome]) nome = "tarefas";
    const atual = document.body.dataset.aba;
    if (atual === nome) return;
    this.rolagem[atual] = window.scrollY;
    document.body.dataset.aba = nome;
    for (const a of document.querySelectorAll(".atalhos a")) {
      if (a.dataset.aba === nome) a.setAttribute("aria-current", "page");
      else a.removeAttribute("aria-current");
    }
    document.title = `${this.ABAS[nome]} · Prosa`;
    if (historico) history.pushState(null, "", `#${nome}`);
    Armazenamento.gravar("prosa.aba", nome);
    window.scrollTo(0, this.rolagem[nome] || 0);
  },
  // O número no atalho (ex.: tarefas pendentes); vermelho quando há atrasada.
  contador(nome, n, alerta) {
    const c = $(`contador-${nome}`);
    if (!c) return;
    c.hidden = !n;
    c.textContent = n > 99 ? "99+" : String(n);
    c.classList.toggle("alerta", Boolean(alerta));
    c.setAttribute("aria-label", alerta ? `${n} pendentes, há atrasadas` : `${n} pendentes`);
  },

  iniciar() {
    Tema.iniciar();
    const trazidas = Tarefas.iniciar();
    Notas.iniciar();
    Calculadora.iniciar();
    Chat.iniciar();

    // a parte do endereço (#notas...), senão a última aberta
    const guardada = Armazenamento.ler("prosa.aba", "tarefas");
    this.abrir(this.daUrl() || (this.ABAS[guardada] ? guardada : "tarefas"), { historico: false });

    // atalhos do topo: um toque troca na hora (Ctrl/⌘ + clique abre em outra aba do navegador, como um link)
    document.querySelector(".atalhos").addEventListener("click", (e) => {
      const a = e.target.closest("a[data-aba]");
      if (!a || e.ctrlKey || e.metaKey || e.shiftKey || e.button !== 0) return;
      e.preventDefault();
      this.abrir(a.dataset.aba);
    });
    window.addEventListener("popstate", () => this.abrir(this.daUrl() || "tarefas", { historico: false }));
    window.addEventListener("hashchange", () => this.abrir(this.daUrl() || "tarefas", { historico: false }));

    // teclado: Alt+1 a Alt+4 trocam de parte; com a Calculadora aberta, os números vão para ela
    document.addEventListener("keydown", (e) => {
      if (e.altKey && !e.ctrlKey && !e.metaKey && /^Digit[1-4]$/.test(e.code)) {
        e.preventDefault();
        this.abrir(Object.keys(this.ABAS)[Number(e.code.slice(5)) - 1]);
        return;
      }
      if (document.body.dataset.aba === "calculadora") Calculadora.teclado(e);
    });

    if (trazidas) avisar(`Trouxe ${plural(trazidas, "tarefa", "tarefas")} do Tique para cá.`);
    this.funcionarSemInternet();
  },

  // Service worker: guarda o app no aparelho. Da segunda vez em diante abre na hora, mesmo sem internet; a versão
  // nova, quando houver, é buscada por trás e vale na próxima abertura (com aviso).
  funcionarSemInternet() {
    if (!("serviceWorker" in navigator) || location.protocol === "file:") return;
    const jaTinha = Boolean(navigator.serviceWorker.controller);
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (jaTinha) avisar("O Prosa foi atualizado.", { rotulo: "Recarregar", fazer: () => location.reload() });
    });
    const registrar = () => navigator.serviceWorker.register("sw.js").catch(() => { /* sem service worker: só não guarda */ });
    if (document.readyState === "complete") registrar();
    else window.addEventListener("load", registrar, { once: true });
  },
};

document.addEventListener("DOMContentLoaded", () => App.iniciar());
