// Service worker do Prosa: guarda o app no aparelho. Da segunda vez em diante ele abre na hora (sem esperar a
// internet) e funciona até sem rede. Cada pedido responde com a cópia guardada e, por trás, busca a versão nova para a
// próxima vez. Só guarda os arquivos do próprio app — os dados (tarefas, notas) ficam no navegador, não aqui.
// Mudou algum arquivo do app? Suba a VERSAO: o celular troca a cópia guardada inteira na próxima abertura.
const VERSAO = "prosa-2026-11-19";
const ARQUIVOS = ["./", "index.html", "css/style.css", "js/prosa.js", "icone.svg", "icone-192.png", "icone-512.png",
  "icone-512-maskable.png", "manifest.webmanifest"];

self.addEventListener("install", (e) => {
  // cache: "reload" — busca na rede, não na memória do navegador (senão uma versão velha poderia ser guardada)
  e.waitUntil(caches.open(VERSAO).then((c) => c.addAll(ARQUIVOS.map((a) => new Request(a, { cache: "reload" }))))
    .then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys()
    .then((nomes) => Promise.all(nomes.filter((n) => n.startsWith("prosa-") && n !== VERSAO).map((n) => caches.delete(n))))
    .then(() => self.clients.claim()));
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin) return;
  const daRede = fetch(e.request);
  // por trás: guarda a versão nova para a próxima vez (a cópia é tirada na hora, antes de a página ler a resposta)
  e.waitUntil(daRede.then((r) => {
    if (!r.ok || r.type !== "basic") return undefined;
    const copia = r.clone();
    return caches.open(VERSAO).then((c) => c.put(e.request, copia));
  }).catch(() => undefined));
  // na frente: a cópia guardada (na hora); sem ela, a rede; sem rede, a página do app
  e.respondWith(caches.match(e.request, { ignoreSearch: true, cacheName: VERSAO })
    .then((guardada) => guardada || daRede)
    .catch(() => (e.request.mode === "navigate" ? caches.match("./", { cacheName: VERSAO }) : Response.error())));
});
