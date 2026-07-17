(function () {
  "use strict";
  var CFG = window.AZAR_CONFIG || {};
  var phrases = [];
  var lastId = null;

  // ---------- utilidades ----------
  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $all(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }

  function b64Encode(str) { return btoa(unescape(encodeURIComponent(str))); }

  var toastTimer;
  function toast(msg) {
    var t = $("#toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove("show"); }, 2600);
  }

  // ---------- navegación ----------
  function show(id) {
    $all(".screen").forEach(function (s) { s.classList.remove("active"); });
    $("#" + id).classList.add("active");
    if (id === "tap") resetTap();
    if (id === "add") { renderList(); refreshTokenStatus(); }
  }

  $all("[data-go]").forEach(function (b) {
    b.addEventListener("click", function () { show(b.getAttribute("data-go")); });
  });
  $all("[data-back]").forEach(function (b) {
    b.addEventListener("click", function () { show("home"); });
  });

  // ---------- carga de frases ----------
  function loadPhrases() {
    return fetch(CFG.file + "?t=" + Date.now(), { cache: "no-store" })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        phrases = Array.isArray(data) ? data : [];
        updateCounts();
        return phrases;
      })
      .catch(function () { phrases = []; updateCounts(); });
  }

  function updateCounts() {
    $("#count-foot").textContent = phrases.length;
    var cl = $("#count-list");
    if (cl) cl.textContent = phrases.length;
  }

  // ---------- modo tocar ----------
  function resetTap() {
    $("#tap-hint").style.display = "flex";
    $("#phrase-wrap").classList.remove("show");
    $("#tap-foot").textContent = "";
  }

  function pickPhrase() {
    if (!phrases.length) { toast("Aún no hay frases"); return; }
    var idx = Math.floor(Math.random() * phrases.length);
    if (phrases.length > 1) {
      var guard = 0;
      while (phrases[idx].id === lastId && guard < 8) { idx = Math.floor(Math.random() * phrases.length); guard++; }
    }
    lastId = phrases[idx].id;
    render(phrases[idx]);
  }

  function render(p) {
    $("#tap-hint").style.display = "none";
    var wrap = $("#phrase-wrap");
    $("#phrase-corta").textContent = p.accion || "";
    $("#phrase-larga").textContent = p.consiste || "";
    wrap.classList.remove("show");
    void wrap.offsetWidth; // reinicia animación
    wrap.classList.add("show");
    $("#tap-foot").textContent = "toca de nuevo para otra";
  }

  $("#tap-area").addEventListener("click", pickPhrase);

  // ---------- token de publicación ----------
  var TOKEN_KEY = "azar_gh_token";
  function getToken() { return localStorage.getItem(TOKEN_KEY) || ""; }
  function refreshTokenStatus() {
    var el = $("#token-status");
    if (!el) return;
    if (getToken()) { el.textContent = "Token guardado ✓ — las frases nuevas se publican en línea."; $("#gh-token").value = ""; }
    else { el.textContent = "Sin token: no podrás publicar todavía."; }
  }
  $("#save-token").addEventListener("click", function () {
    var v = $("#gh-token").value.trim();
    if (!v) { toast("Pega un token primero"); return; }
    localStorage.setItem(TOKEN_KEY, v);
    refreshTokenStatus();
    toast("Token guardado");
  });

  // ---------- lista ----------
  function renderList() {
    var ul = $("#phrase-list");
    ul.innerHTML = "";
    phrases.slice().reverse().forEach(function (p) {
      var li = document.createElement("li");
      var b = document.createElement("b");
      b.textContent = p.accion || "(sin acción)";
      var s = document.createElement("span");
      s.textContent = p.consiste || "";
      li.appendChild(b);
      if (p.consiste) li.appendChild(s);
      ul.appendChild(li);
    });
    updateCounts();
  }

  // ---------- publicar en GitHub ----------
  function apiUrl() {
    return "https://api.github.com/repos/" + CFG.owner + "/" + CFG.repo + "/contents/" + CFG.file;
  }

  function publish(newArray, msg) {
    var headers = {
      "Authorization": "Bearer " + getToken(),
      "Accept": "application/vnd.github+json"
    };
    return fetch(apiUrl() + "?ref=" + CFG.branch, { headers: headers, cache: "no-store" })
      .then(function (r) {
        if (!r.ok) throw new Error("No se pudo leer el archivo (" + r.status + ")");
        return r.json();
      })
      .then(function (file) {
        var body = {
          message: msg,
          content: b64Encode(JSON.stringify(newArray, null, 2) + "\n"),
          sha: file.sha,
          branch: CFG.branch
        };
        return fetch(apiUrl(), { method: "PUT", headers: headers, body: JSON.stringify(body) });
      })
      .then(function (r) {
        if (!r.ok) return r.json().then(function (e) { throw new Error(e.message || ("Error " + r.status)); });
        return r.json();
      });
  }

  function newId() { return "p" + Date.now().toString(36); }

  $("#add-btn").addEventListener("click", function () {
    var accion = $("#in-accion").value.trim();
    var consiste = $("#in-consiste").value.trim();
    var status = $("#add-status");

    if (!accion && !consiste) { status.textContent = "Escribe una acción o en qué consiste."; return; }
    if (!getToken()) { status.textContent = "Configura tu token de GitHub para publicar (ver Configuración)."; return; }

    var btn = this;
    btn.disabled = true;
    status.textContent = "Publicando…";

    var next = phrases.concat([{ id: newId(), accion: accion, consiste: consiste }]);
    publish(next, "Agregar frase: " + (accion || consiste).slice(0, 40))
      .then(function () {
        phrases = next;
        $("#in-accion").value = "";
        $("#in-consiste").value = "";
        renderList();
        status.textContent = "";
        toast("Publicado — visible en ~1 min");
      })
      .catch(function (err) { status.textContent = "Error: " + err.message; })
      .then(function () { btn.disabled = false; });
  });

  // ---------- init ----------
  loadPhrases();
})();
