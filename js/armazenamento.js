"use strict";
// Guarda e lê do navegador (localStorage). Dado estragado ou armazenamento bloqueado: devolve o padrão (ou false ao
// gravar), sem travar a página.
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
