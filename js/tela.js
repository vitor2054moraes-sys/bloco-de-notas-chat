"use strict";
// Ajudantes da tela. Tudo é montado pelo DOM: o texto entra sempre como texto, nunca como HTML (ninguém injeta código).

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

// Aviso que some sozinho (embaixo da tela).
function avisar(texto) {
  const aviso = document.getElementById("aviso");
  aviso.textContent = texto;
  aviso.hidden = false;
  clearTimeout(avisar.tempo);
  avisar.tempo = setTimeout(() => { aviso.hidden = true; }, 4000);
}

const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;
