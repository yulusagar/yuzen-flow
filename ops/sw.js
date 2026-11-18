/* ═══════════════════════════════════════════════════════════════════════════
   PASS-THROUGH SERVICE WORKER — it exists to be counted, not to cache
   ═══════════════════════════════════════════════════════════════════════════
   Chrome dropped the service-worker requirement for the ⋮ → Install app menu
   item in v108 on mobile, but NOT for the install prompt: "the algorithm that
   displays the install prompt still requires the presence of a fetch() handler."
   So a banner needs a worker even though this app wants nothing a worker
   normally provides.

   Which is the whole design here. It caches NOTHING — no Cache Storage, no
   precache, no stale-while-revalidate. Every request goes to the network exactly
   as it would with no worker at all, so it is structurally incapable of serving
   an old build. That is the point: a caching worker is precisely what pins an
   installed app to a stale version, and the one thing this prototype must never
   do is show a build older than the last push.

   Consequences of caching nothing, stated plainly: there is no offline mode. Off
   signal the app fails exactly as it does today. That is the trade that was
   chosen.

   skipWaiting + clients.claim so a replacement worker takes over immediately
   rather than waiting for every tab to close — otherwise the worker itself
   becomes the stale thing, which would be an ironic way to lose.
   ═══════════════════════════════════════════════════════════════════════════ */

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

self.addEventListener("fetch", (e) => {
  /* Navigations only. Everything else is deliberately left alone so the browser
     handles it natively — the four <video> tags issue Range requests, and
     re-fetching those through the worker is a well-known way to break seeking
     and, on some versions, playback outright. Passing a navigation straight to
     the network is enough to register as a fetch handler. */
  if (e.request.mode === "navigate") {
    /* `cache: "no-cache"` — REVALIDATE, do not reuse blindly.
       `fetch(e.request)` is not the pass-through it reads as: a navigation
       request carries cache mode "default", so the worker's own fetch is
       answered from the HTTP cache like any other. A response with only
       Last-Modified and no Cache-Control is then heuristically fresh — Chrome
       allows a tenth of the document's age — so the worker cheerfully served a
       build from an hour ago, in every tab, through reloads, which is exactly
       the failure the header on this file promises cannot happen.

       Caught on the local rig: the file on disk and the network both said one
       build id while the live document said an older one. no-cache still
       allows a 304, so a document that has not moved costs a round trip and
       not a re-download. */
    e.respondWith(fetch(e.request, {cache: "no-cache"}));
  }
});
