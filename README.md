# Prosa — tarefas, notas e comandos

**Prosa** (antes "Bloco de notas + Chat") junta uma lista de tarefas, um bloco de notas e um chat de comandos,
tudo no navegador, sem servidor. O nome tem dois sentidos: *prosa* é conversa (o chat) e também texto escrito (as notas).

## O que faz

- **Tarefas** com prioridade (alta, média, baixa), número, editar o texto, **anotação dentro de cada tarefa**, marcar
  como feita e apagar. **Embaralhar**, voltar à **ordem original**, **apagar feitas** e filtros (todas, ativas, feitas),
  com a barra de progresso.
- **Bloco de notas** com formatação: negrito, itálico, sublinhado, riscado e lista. Salva sozinho.
- **Chat de comandos** para cuidar da lista escrevendo:

| Comando | Em português | O que faz |
|---|---|---|
| `add texto` | `adicionar texto` | Nova tarefa |
| `done nº` | `feito nº` | Marca como feita (de novo: reabre) |
| `del nº` | `apagar nº` | Apaga a tarefa |
| `list` | `lista` | Mostra a lista com os números |
| `clear` | `limpar` | Apaga todas (pede confirmação) |
| `help` | `ajuda` | Mostra os comandos |

- **Tema claro e escuro** (lembra a escolha; sem escolha, segue o celular).
- **Celular:** uma parte por vez, em abas (Tarefas, Notas, Chat). **Computador:** tudo à vista.

## Segurança e privacidade

- Tudo fica **só no seu navegador** (localStorage). Nada vai para a internet.
- O texto das tarefas e do chat entra na página sempre como **texto**, nunca como HTML.
- No bloco de notas, colar traz **só o texto**; e, ao abrir, só voltam as marcas de formatação, sem nenhum atributo —
  um script, uma imagem ou um link escondido no armazenamento é descartado.
- A página só carrega arquivos dela mesma (Content-Security-Policy).
- Dado estragado no navegador não trava a página.

## Como usar

Abra o `index.html` no navegador — ou a versão publicada: <https://vitor2054moraes-sys.github.io/bloco-de-notas-chat/>

```bash
git clone https://github.com/vitor2054moraes-sys/bloco-de-notas-chat.git
```

## Arquivos

| Arquivo | O que tem |
|---|---|
| `index.html` | A página (abas, tarefas, notas, chat). |
| `css/style.css` | A aparência; cores dos dois temas no começo. |
| `js/armazenamento.js` | Ler e gravar no navegador, sem travar com dado estragado. |
| `js/tela.js` | Ajudantes: montar elementos, ícones, aviso. |
| `js/tarefas.js` | A lista de tarefas. |
| `js/notas.js` | O bloco de notas (e a limpeza do que volta do armazenamento). |
| `js/chat.js` | Os comandos do chat. |
| `js/app.js` | Liga tudo: tema, abas, botões. |

A versão anterior desta página apontava para arquivos que não estavam no repositório (`css/style.css` e `js/…`) e por
isso aparecia sem estilo e sem funcionar; agora eles existem.
