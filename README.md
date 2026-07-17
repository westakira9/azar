# azar

Sitio íntimo para parejas (+18). Dos modos:

- **Tocar la pantalla**: toca y aparece una frase al azar.
- **Dejar frase**: formulario con **Acción** y **En qué consiste** para agregar frases.

## En línea

- Sitio (GitHub Pages): `https://westakira9.github.io/azar/`
- Backend (Cloudflare Worker): `https://azar-api.westakira9.workers.dev`

Comparte el enlace del sitio a quien quieras. **Cualquiera, en cualquier país, puede
ver y agregar frases sin clave ni token.** Las frases se guardan en el backend
(Cloudflare KV) y aparecen para los demás en hasta ~1 minuto (caché de lectura).

## Arquitectura

- **Frontend estático** (`index.html`, `styles.css`, `app.js`, `config.js`) en GitHub Pages.
- **Backend** en `api/` (Cloudflare Worker + KV) guarda las frases:
  - `GET /` → devuelve la lista de frases.
  - `POST /` con `{ "accion": "...", "consiste": "..." }` → agrega una frase.

### Desplegar / actualizar el backend

```
cd api
npx wrangler deploy
```

El almacenamiento es un namespace KV llamado `AZAR`. Para vaciarlo:

```
npx wrangler kv key put phrases "[]" --namespace-id <ID> --remote
```

`config.js` apunta el sitio al backend mediante `api`.
