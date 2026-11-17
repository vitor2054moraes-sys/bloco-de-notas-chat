"use strict";
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
    const area = document.getElementById("notas");
    area.replaceChildren(this.limpar(Armazenamento.ler(this.CHAVE, "")));
    area.addEventListener("input", () => this.salvarDepois(area));
    area.addEventListener("paste", (e) => {   // colar: só o texto, sem a formatação de outro site
      e.preventDefault();
      document.execCommand("insertText", false, e.clipboardData.getData("text/plain"));
    });
    for (const botao of document.querySelectorAll(".formatar button")) {
      botao.addEventListener("mousedown", (e) => e.preventDefault());   // não tira a seleção do texto
      botao.addEventListener("click", () => {
        area.focus();
        document.execCommand(botao.dataset.cmd);
        this.salvarDepois(area);
      });
    }
  },

  // Grava meio segundo depois da última tecla (não a cada letra).
  salvarDepois(area) {
    clearTimeout(this.tempo);
    this.tempo = setTimeout(() => {
      const ok = Armazenamento.gravar(this.CHAVE, area.textContent.trim() ? area.innerHTML : "");
      document.getElementById("notasSalvas").textContent = ok ? "Salvo neste navegador." : "Não deu para salvar.";
    }, 500);
  },
};
