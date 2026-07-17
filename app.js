(function () {
  "use strict";
  var CFG = window.AZAR_CONFIG || {};
  var API = CFG.api;
  var phrases = [];
  var lastId = null;

  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $all(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }

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
    if (id === "add") { loadPhrases().then(renderList); }
  }
  $all("[data-go]").forEach(function (b) {
    b.addEventListener("click", function () { show(b.getAttribute("data-go")); });
  });
  $all("[data-back]").forEach(function (b) {
    b.addEventListener("click", function () { show("home"); });
  });

  // ---------- carga de frases ----------
  function loadPhrases() {
    return fetch(API + "?t=" + Date.now(), { cache: "no-store" })
      .then(function (r) { return r.json(); })
      .then(function (data) { phrases = Array.isArray(data) ? data : []; updateCounts(); return phrases; })
      .catch(function () { phrases = []; updateCounts(); return phrases; });
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
    void wrap.offsetWidth;
    wrap.classList.add("show");
    $("#tap-foot").textContent = "toca de nuevo para otra";
  }
  $("#tap-area").addEventListener("click", pickPhrase);

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

  // ---------- agregar ----------
  $("#add-btn").addEventListener("click", function () {
    var accion = $("#in-accion").value.trim();
    var consiste = $("#in-consiste").value.trim();
    var status = $("#add-status");

    if (!accion && !consiste) { status.textContent = "Escribe una acción o en qué consiste."; return; }

    var btn = this;
    btn.disabled = true;
    status.textContent = "Guardando…";

    fetch(API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accion: accion, consiste: consiste })
    })
      .then(function (r) { return r.json().then(function (d) { if (!r.ok) throw new Error(d.error || ("Error " + r.status)); return d; }); })
      .then(function (d) {
        if (d.item) phrases.push(d.item);
        $("#in-accion").value = "";
        $("#in-consiste").value = "";
        renderList();
        status.textContent = "";
        toast("¡Frase agregada!");
      })
      .catch(function (err) { status.textContent = "Error: " + err.message; })
      .then(function () { btn.disabled = false; });
  });

  // ---------- init ----------
  loadPhrases();
})();
