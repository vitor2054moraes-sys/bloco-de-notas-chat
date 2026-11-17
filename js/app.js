"use strict";
// Liga tudo: tema, abas do celular, formulário e botões das tarefas, notas e chat.

const Tema = {
  CHAVE: "prosa.tema",
  aplicar(escuro) {
    document.body.classList.toggle("escuro", escuro);
    const botao = document.getElementById("botaoTema");
    const rotulo = escuro ? "Tema claro" : "Tema escuro";
    botao.replaceChildren(icone(escuro ? "sol" : "lua"));
    botao.setAttribute("aria-label", rotulo);
    botao.title = rotulo;
  },
  iniciar() {
    const salvo = Armazenamento.ler(this.CHAVE, null);   // sem escolha salva: segue o aparelho
    this.aplicar(salvo === null ? matchMedia("(prefers-color-scheme: dark)").matches : salvo === "escuro");
    document.getElementById("botaoTema").addEventListener("click", () => {
      const escuro = !document.body.classList.contains("escuro");
      this.aplicar(escuro);
      Armazenamento.gravar(this.CHAVE, escuro ? "escuro" : "claro");
    });
  },
};

function abrirAba(nome) {
  document.body.dataset.aba = nome;
  for (const aba of document.querySelectorAll('[role="tab"]')) aba.setAttribute("aria-selected", String(aba.dataset.aba === nome));
}

document.addEventListener("DOMContentLoaded", () => {
  Tema.iniciar();
  for (const aba of document.querySelectorAll('[role="tab"]')) aba.addEventListener("click", () => abrirAba(aba.dataset.aba));

  Tarefas.carregar();
  Tarefas.desenhar();
  document.getElementById("formTarefa").addEventListener("submit", (e) => {
    e.preventDefault();
    const campo = document.getElementById("campoTarefa");
    if (Tarefas.adicionar(campo.value, document.getElementById("campoPrioridade").value)) campo.value = "";
    campo.focus();
  });
  document.getElementById("botaoEmbaralhar").addEventListener("click", () => Tarefas.embaralhar());
  document.getElementById("botaoOrdem").addEventListener("click", () => Tarefas.ordemOriginal());
  document.getElementById("botaoApagarFeitas").addEventListener("click", () => {
    const n = Tarefas.apagarFeitas();
    avisar(n ? `${plural(n, "tarefa feita apagada", "tarefas feitas apagadas")}.` : "Nenhuma tarefa feita para apagar.");
  });
  for (const filtro of document.querySelectorAll(".filtro")) {
    filtro.addEventListener("click", () => {
      Tarefas.filtro = filtro.dataset.filtro;
      for (const f of document.querySelectorAll(".filtro")) f.setAttribute("aria-pressed", String(f === filtro));
      Tarefas.desenhar();
    });
  }

  Notas.iniciar();
  Chat.iniciar();
});
