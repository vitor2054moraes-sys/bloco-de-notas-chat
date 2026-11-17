"use strict";
// Chat de comandos: cuida da lista de tarefas escrevendo. Em inglês (como no README) ou em português.

const Chat = {
  COMANDOS: {
    add: "add", adicionar: "add", nova: "add",
    done: "done", feito: "done", feita: "done",
    del: "del", apagar: "del", remover: "del",
    list: "list", lista: "list", listar: "list",
    clear: "clear", limpar: "clear",
    help: "help", ajuda: "help", "?": "help",
  },

  falar(quem, texto) {
    const conversa = document.getElementById("conversa");
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
        if (t) { Tarefas.remover(t.id); this.falar("bot", `Apagada: ${t.texto}`); }
        return null;
      }
      case "list":
        return this.falar("bot", Tarefas.lista.length
          ? Tarefas.lista.map((t, i) => `${i + 1}. ${t.feita ? "✓ " : ""}${t.texto}`).join("\n") : "A lista está vazia.");
      case "clear":
        if (!Tarefas.lista.length) return this.falar("bot", "A lista já está vazia.");
        if (!confirm(`Apagar as ${Tarefas.lista.length} tarefas? Não dá para desfazer.`)) return this.falar("bot", "Nada foi apagado.");
        Tarefas.apagarTodas();
        return this.falar("bot", "Todas as tarefas foram apagadas.");
      case "help":
        return this.falar("bot", "add texto — nova tarefa\ndone nº — marca como feita (de novo: reabre)\ndel nº — apaga\n"
          + "list — mostra a lista com os números\nclear — apaga todas\nTambém em português: adicionar, feito, apagar, lista, limpar.");
      default:
        return this.falar("bot", `Não conheço "${palavra}". Digite help para ver os comandos.`);
    }
  },

  iniciar() {
    this.falar("bot", "Oi! Digite help para ver os comandos.");
    document.getElementById("formChat").addEventListener("submit", (e) => {
      e.preventDefault();
      const campo = document.getElementById("campoChat");
      if (!campo.value.trim()) return;
      this.falar("voce", campo.value.trim());
      this.responder(campo.value);
      campo.value = "";
    });
  },
};
