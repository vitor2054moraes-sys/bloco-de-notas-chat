# Prosa — tarefas, notas, calculadora e chat num app só

**Prosa** junta, numa página só, o que antes eram três apps:

| Parte | O que era antes |
|---|---|
| **Tarefas** | o **Tique** (lista de tarefas) + as tarefas do Prosa |
| **Notas** | o bloco de notas do Prosa |
| **Calculadora** | a **Cifra** (comum, científica, financeira, taxas e amortização) |
| **Chat** | o chat de comandos do Prosa, agora também para notas e contas |

Tudo no navegador, sem servidor. O nome tem dois sentidos: *prosa* é conversa (o chat) e também texto escrito (as notas).

🔗 <https://vitor2054moraes-sys.github.io/bloco-de-notas-chat/>

## Atalhos no topo: um toque troca de parte

- **Tarefas · Notas · Calculadora · Chat** ficam presos no alto da tela. Um toque troca de parte **na hora**, sem
  carregar outra página: as quatro já estão abertas, então não há nada a buscar na internet.
- O atalho **Tarefas** mostra quantas estão pendentes (em vermelho quando alguma está atrasada).
- Cada parte tem o seu endereço — `#tarefas`, `#notas`, `#calculadora`, `#chat` —, então um link ou favorito abre
  direto nela, e o **Voltar** do celular volta para a parte anterior.
- No teclado: **Alt+1** a **Alt+4**.
- Instalado no celular, um toque longo no ícone também mostra os atalhos.
- O Prosa abre na última parte usada, e cada parte volta ao mesmo ponto da tela.

## Mais rápido

Medido num celular simulado (processador 4× mais lento e internet fraca: 150 ms de atraso, 1,6 Mbit/s):

| | Antes (três apps) | Agora |
|---|---|---|
| Trocar de app ou de parte, na primeira vez do dia | ~730 ms (abria outra página) | **~30 ms** |
| Trocar, com tudo já guardado no aparelho | ~60 ms (recarregava a página) | **~27 ms** |
| Abrir de novo | precisa da internet | **~110 ms, até sem internet** |
| Abrir pela primeira vez | ~1,3 s só o Prosa | **~0,7 s, já com os três** |

Por quê:
- **Uma página só:** trocar de parte é só mostrar outra.
- **Guardado no aparelho:** um *service worker* guarda o app. Da segunda vez ele abre na hora, mesmo sem internet, e a
  versão nova é buscada por trás.
- **Menos arquivos:** um de código e um de aparência, pedidos logo no começo. Antes eram 6 arquivos de código.

## O que cada parte faz

- **Tarefas:**
  - prioridade, categoria (trabalho, pessoal, estudos) e prazo, com "Hoje", "Amanhã" e "Atrasada" em vermelho;
  - busca sem acento, que olha também as anotações;
  - filtros (todas, pendentes, feitas e categoria) e ordem (prioridade e prazo, ordem em que criei ou embaralhada);
  - editar o texto e escrever uma **anotação** dentro de cada tarefa;
  - apagar (uma ou as feitas) com **Desfazer**, e o resumo com a barra de progresso.
  - O **número** de cada tarefa é a ordem em que foi criada: não muda ao marcar como feita, então o chat sempre acerta.
- **Notas:** negrito, itálico, sublinhado, riscado e lista. Salva sozinho e mostra a hora em que salvou.
- **Calculadora:**
  - comum e científica (sin, cos e tan em graus, √, log, ln, xʸ, x!, π, e), com a **prévia do resultado enquanto
    digita**;
  - financeira (n, i, PV, PMT, FV, como na HP 12C), conversão de taxas e tabela Price/SAC até 600 parcelas;
  - histórico dos últimos 10 e teclado no computador.
- **Chat:**

| Comando | Em português | O que faz |
|---|---|---|
| `add texto` | `adicionar texto` | Nova tarefa |
| `done nº` | `feito nº` | Marca como feita (de novo: reabre) |
| `del nº` | `apagar nº` | Apaga a tarefa (com Desfazer) |
| `list` | `lista` | Mostra as tarefas com os números |
| `clear` | `limpar` | Apaga todas (com Desfazer) |
| `calc conta` | `conta 2+3×4` | Faz a conta e guarda no histórico da Calculadora |
| `nota texto` | `anotar texto` | Escreve no fim do bloco de Notas |
| `abrir notas` | `ir calculadora` | Abre uma parte |
| `help` | `ajuda` | Mostra os comandos |

- **Tema claro e escuro:** lembra a escolha; sem escolha, segue o celular. Cada parte tem a sua cor: Tarefas verde,
  Notas azul, Calculadora âmbar e Chat roxo.

## Os dados de antes vêm junto

O Tique, a Cifra e o Prosa moram no mesmo endereço (`vitor2054moraes-sys.github.io`), e o navegador guarda os dados
dos três juntos. Por isso, ao abrir o Prosa no mesmo celular ou computador:
- as **tarefas do Tique** entram na lista, uma vez só, com um aviso. A lista original fica guardada, de reserva;
- o **histórico da Cifra** aparece na Calculadora;
- as **tarefas e as notas do Prosa** continuam lá.

## Segurança e privacidade

- Tudo fica **só no seu navegador** (localStorage). Nada vai para a internet.
- Texto de tarefa, de anotação e do chat entra na página sempre como **texto**, nunca como HTML.
- No bloco de notas, colar traz **só o texto**. Ao abrir, só voltam as marcas de formatação, sem nenhum atributo: um
  script, uma imagem ou um link escondido no armazenamento é descartado.
- A calculadora lê a conta com um analisador próprio (só números, + − × ÷ ^, parênteses, π e e). Nada de `eval`.
- O histórico, as tarefas e as notas são conferidos ao abrir: dado estragado ou mexido não trava a página.
- A página só carrega arquivos dela mesma (Content-Security-Policy). O *service worker* guarda só os arquivos do app,
  nunca os seus dados.

## Como usar

Abra o endereço acima. Para instalar no celular: menu do navegador → **Adicionar à tela inicial** (ou **Instalar app**).

Para testar no computador, sirva a pasta com qualquer servidor simples, por exemplo
`python3 -m http.server`, e abra `http://localhost:8000`. Abrindo o `index.html` direto do arquivo também funciona,
mas sem o modo "sem internet".

## Arquivos

| Arquivo | O que tem |
|---|---|
| `index.html` | A página: os atalhos do topo e as quatro partes. |
| `css/style.css` | A aparência: cores dos dois temas e de cada parte no começo. |
| `js/prosa.js` | O código, em partes: armazenamento, tela, tarefas, notas, calculadora, chat e app (atalhos e tema). |
| `sw.js` | O *service worker*: abre na hora e sem internet. **Mudou algum arquivo? Suba a `VERSAO` dele.** |
| `manifest.webmanifest`, `icone*.png`, `icone.svg` | Para instalar como app, com os atalhos no ícone. |
