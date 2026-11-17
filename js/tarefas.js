"use strict";
// Tarefas: a lista na ordem atual (o nº que aparece é o que o chat usa), cada uma com prioridade e uma anotação.

const PRIORIDADES = { high: "Alta", med: "Média", low: "Baixa" };

const Tarefas = {
  CHAVE: "prosa.tarefas",
  lista: [],
  filtro: "all",          // all, active ou done
  editando: null,         // id da tarefa com o texto aberto para editar
  abertas: new Set(),     // ids com a anotação aberta

  // Tarefa lida do navegador: confere cada campo (dado mexido não quebra a página).
  normalizar(t) {
    if (!t || typeof t.texto !== "string" || !t.texto.trim()) return null;
    return { id: Number(t.id) || 0, texto: t.texto.trim(), feita: Boolean(t.feita),
      prioridade: PRIORIDADES[t.prioridade] ? t.prioridade : "med", nota: typeof t.nota === "string" ? t.nota : "" };
  },
  carregar() {
    const lidas = Armazenamento.ler(this.CHAVE, []);
    this.lista = Array.isArray(lidas) ? lidas.map((t) => this.normalizar(t)).filter(Boolean) : [];
  },
  salvar() {
    if (!Armazenamento.gravar(this.CHAVE, this.lista)) avisar("Não deu para salvar neste navegador (armazenamento cheio ou bloqueado).");
  },
  mudou() {
    this.salvar();
    this.desenhar();
  },

  // ---- ações (usadas pelos botões e pelo chat)
  adicionar(texto, prioridade = "med") {
    const id = Math.max(Date.now(), ...this.lista.map((t) => t.id + 1));
    const tarefa = this.normalizar({ id, texto, prioridade });
    if (!tarefa) return null;
    this.lista.push(tarefa);
    this.mudou();
    return tarefa;
  },
  porNumero(n) { return this.lista[n - 1] || null; },
  numero(tarefa) { return this.lista.indexOf(tarefa) + 1; },
  alternar(id) {
    const t = this.lista.find((x) => x.id === id);
    if (t) { t.feita = !t.feita; this.mudou(); }
  },
  remover(id) {
    this.lista = this.lista.filter((t) => t.id !== id);
    this.abertas.delete(id);
    this.mudou();
  },
  renomear(id, texto) {
    const t = this.lista.find((x) => x.id === id);
    if (t && texto.trim()) t.texto = texto.trim();
    this.editando = null;
    this.mudou();
  },
  anotar(id, nota) {   // grava sem redesenhar (o cursor fica onde está)
    const t = this.lista.find((x) => x.id === id);
    if (t) { t.nota = nota; this.salvar(); }
  },
  embaralhar() {
    for (let i = this.lista.length - 1; i > 0; i--) {   // Fisher-Yates: todas as ordens com a mesma chance
      const j = Math.floor(Math.random() * (i + 1));
      [this.lista[i], this.lista[j]] = [this.lista[j], this.lista[i]];
    }
    this.mudou();
  },
  ordemOriginal() {
    this.lista.sort((a, b) => a.id - b.id);   // o id é a hora em que foi criada
    this.mudou();
  },
  apagarFeitas() {
    const n = this.lista.filter((t) => t.feita).length;
    if (!n) return 0;
    this.lista = this.lista.filter((t) => !t.feita);
    this.mudou();
    return n;
  },
  apagarTodas() {
    this.lista = [];
    this.abertas.clear();
    this.mudou();
  },

  // ---- tela
  item(t) {
    const n = this.numero(t);
    const texto = this.editando === t.id
      ? el("input", { class: "editar-texto", value: t.texto, maxlength: 200, "aria-label": `Editar a tarefa ${n}`,
          onkeydown: (e) => {
            if (e.key === "Enter") this.renomear(t.id, e.target.value);
            if (e.key === "Escape") { this.editando = null; this.desenhar(); }
          },
          onblur: (e) => { if (this.editando === t.id) this.renomear(t.id, e.target.value); } })
      : el("span", { class: "texto" }, t.texto);
    const aberta = this.abertas.has(t.id);
    return el("li", { class: `tarefa ${t.prioridade}${t.feita ? " feita" : ""}` },
      el("span", { class: "num", title: "Nº para o chat" }, String(n)),
      el("input", { type: "checkbox", checked: t.feita, "aria-label": `Feita: ${t.texto}`, onchange: () => this.alternar(t.id) }),
      texto,
      el("span", { class: "prioridade" }, PRIORIDADES[t.prioridade]),
      el("span", { class: "acoes" },
        el("button", { type: "button", class: "icone-botao", title: "Editar", "aria-label": `Editar: ${t.texto}`,
          onclick: () => { this.editando = t.id; this.desenhar(); } }, icone("editar")),
        el("button", { type: "button", class: `icone-botao${t.nota ? " com-nota" : ""}`, title: "Anotação",
          "aria-label": `Anotação: ${t.texto}`, "aria-expanded": String(aberta),
          onclick: () => { if (aberta) this.abertas.delete(t.id); else this.abertas.add(t.id); this.desenhar(); } }, icone("nota")),
        el("button", { type: "button", class: "icone-botao apagar", title: "Apagar", "aria-label": `Apagar: ${t.texto}`,
          onclick: () => this.remover(t.id) }, icone("apagar"))),
      aberta ? el("textarea", { class: "anotacao", rows: 3, placeholder: "Anotação desta tarefa…", "aria-label": `Anotação: ${t.texto}`,
        oninput: (e) => this.anotar(t.id, e.target.value) }, t.nota) : null);
  },

  desenhar() {
    const mostrar = this.lista.filter((t) => this.filtro === "all" || (this.filtro === "done") === t.feita);
    const ul = document.getElementById("listaTarefas");
    ul.replaceChildren(...mostrar.map((t) => this.item(t)));
    if (!mostrar.length) {
      ul.append(el("li", { class: "vazio" }, this.lista.length ? "Nenhuma tarefa neste filtro." : "Nenhuma tarefa ainda: escreva acima ou use o chat (add …)."));
    }
    const feitas = this.lista.filter((t) => t.feita).length;
    const progresso = document.getElementById("progresso");
    progresso.replaceChildren(...(this.lista.length ? [`${feitas} de ${plural(this.lista.length, "tarefa feita", "tarefas feitas")}`,
      el("progress", { max: this.lista.length, value: feitas, "aria-hidden": "true" })] : []));
    document.querySelector(".editar-texto")?.focus();
  },
};
