(function () {
  "use strict";
  var CFG = window.AZAR_CONFIG || {};
  var phrases = [];
  var tapMode = "ambas";
  var lastIndex = -1;

  // ---------- utilidades ----------
  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $all(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }

  function b64Encode(str) { return btoa(unescape(encodeURIComponent(str))); }
  function b64Decode(str) { return decodeURIComponent(escape(atob(str.replace(/\n/g, "")))); }

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
      .catch(function () {
        phrases = [];
        updateCounts();
      });
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
    var pool = phrases;
    if (tapMode === "corta") pool = phrases.filter(function (p) { return p.corta; });
    else if (tapMode === "larga") pool = phrases.filter(function (p) { return p.larga; });
    if (!pool.length) pool = phrases;

    var idx = Math.floor(Math.random() * pool.length);
    if (pool.length > 1) {
      var guard = 0;
      while (pool[idx].id === lastIndex && guard < 8) { idx = Math.floor(Math.random() * pool.length); guard++; }
    }
    lastIndex = pool[idx].id;
    render(pool[idx]);
  }

  function render(p) {
    $("#tap-hint").style.display = "none";
    var wrap = $("#phrase-wrap");
    var corta = $("#phrase-corta");
    var larga = $("#phrase-larga");

    if (tapMode === "corta") { corta.textContent = p.corta || p.larga || ""; larga.textContent = ""; }
    else if (tapMode === "larga") { corta.textContent = ""; larga.textContent = p.larga || p.corta || ""; }
    else { corta.textContent = p.corta || ""; larga.textContent = p.larga || ""; }

    wrap.classList.remove("show");
    void wrap.offsetWidth; // reinicia animación
    wrap.classList.add("show");
    $("#tap-foot").textContent = "toca de nuevo para otra";
  }

  $("#tap-area").addEventListener("click", pickPhrase);

  $all("#tap-filter button").forEach(function (b) {
    b.addEventListener("click", function () {
      $all("#tap-filter button").forEach(function (x) { x.classList.remove("active"); });
      b.classList.add("active");
      tapMode = b.getAttribute("data-mode");
      resetTap();
    });
  });

  // ---------- panel agregar ----------
  var GATE_OK = "azar_gate_ok";

  function openForm() {
    $("#gate").classList.add("hidden");
    $("#add-form").classList.remove("hidden");
    renderList();
    refreshTokenStatus();
  }

  if (sessionStorage.getItem(GATE_OK) === "1") openForm();

  $("#gate-btn").addEventListener("click", function () {
    var val = $("#gate-pass").value;
    if (val === CFG.gateKey) {
      sessionStorage.setItem(GATE_OK, "1");
      $("#gate-err").textContent = "";
      openForm();
    } else {
      $("#gate-err").textContent = "Clave incorrecta";
    }
  });
  $("#gate-pass").addEventListener("keydown", function (e) { if (e.key === "Enter") $("#gate-btn").click(); });

  // token
  var TOKEN_KEY = "azar_gh_token";
  function getToken() { return localStorage.getItem(TOKEN_KEY) || ""; }
  function refreshTokenStatus() {
    var el = $("#token-status");
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

  function renderList() {
    var ul = $("#phrase-list");
    ul.innerHTML = "";
    phrases.slice().reverse().forEach(function (p) {
      var li = document.createElement("li");
      var b = document.createElement("b");
      b.textContent = p.corta || "(sin título)";
      var s = document.createElement("span");
      s.textContent = p.larga || "";
      li.appendChild(b);
      if (p.larga) li.appendChild(s);
      ul.appendChild(li);
    });
    updateCounts();
  }

  // publicar en GitHub
  function apiUrl() {
    return "https://api.github.com/repos/" + CFG.owner + "/" + CFG.repo + "/contents/" + CFG.file;
  }

  function publish(newArray, msg) {
    var token = getToken();
    var headers = {
      "Authorization": "Bearer " + token,
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
        return fetch(apiUrl(), {
          method: "PUT",
          headers: headers,
          body: JSON.stringify(body)
        });
      })
      .then(function (r) {
        if (!r.ok) return r.json().then(function (e) { throw new Error(e.message || ("Error " + r.status)); });
        return r.json();
      });
  }

  function newId() { return "p" + Date.now().toString(36); }

  $("#add-btn").addEventListener("click", function () {
    var corta = $("#in-corta").value.trim();
    var larga = $("#in-larga").value.trim();
    var status = $("#add-status");

    if (!corta && !larga) { status.textContent = "Escribe al menos una frase corta o larga."; return; }
    if (!getToken()) { status.textContent = "Configura tu token de GitHub para publicar (ver Configuración)."; return; }

    var btn = this;
    btn.disabled = true;
    status.textContent = "Publicando…";

    var next = phrases.concat([{ id: newId(), corta: corta, larga: larga }]);
    publish(next, "Agregar frase: " + (corta || larga).slice(0, 40))
      .then(function () {
        phrases = next;
        $("#in-corta").value = "";
        $("#in-larga").value = "";
        renderList();
        status.textContent = "";
        toast("Publicado — visible en ~1 min");
      })
      .catch(function (err) {
        status.textContent = "Error: " + err.message;
      })
      .then(function () { btn.disabled = false; });
  });

  // ---------- init ----------
  loadPhrases();
})();
