// Backend de "azar" en Cloudflare Workers.
// Guarda las frases en KV. Cualquiera puede leer (GET) y agregar (POST) sin clave.

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function json(data, status) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: { "Content-Type": "application/json; charset=utf-8", ...CORS },
  });
}

async function readPhrases(env) {
  const raw = await env.AZAR.get("phrases");
  return raw ? JSON.parse(raw) : [];
}

export default {
  async fetch(req, env) {
    if (req.method === "OPTIONS") return new Response(null, { headers: CORS });

    if (req.method === "GET") {
      const arr = await readPhrases(env);
      return json(arr);
    }

    if (req.method === "POST") {
      let body;
      try { body = await req.json(); } catch (e) { return json({ error: "JSON inválido" }, 400); }

      const accion = String(body.accion || "").trim().slice(0, 80);
      const consiste = String(body.consiste || "").trim().slice(0, 600);
      if (!accion && !consiste) return json({ error: "Escribe algo" }, 400);

      const arr = await readPhrases(env);
      if (arr.length >= 2000) return json({ error: "Límite de frases alcanzado" }, 400);

      const item = {
        id: "p" + Date.now().toString(36) + Math.floor(Math.random() * 1000).toString(36),
        accion: accion,
        consiste: consiste,
      };
      arr.push(item);
      await env.AZAR.put("phrases", JSON.stringify(arr));
      return json({ ok: true, item: item });
    }

    return json({ error: "Método no permitido" }, 405);
  },
};
