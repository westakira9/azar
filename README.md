# azar

Sitio íntimo para parejas (+18). Dos modos:

- **Tocar la pantalla**: toca y aparece una frase al azar.
- **Dejar frase**: formulario con **Acción** y **En qué consiste** para agregar frases que se publican en línea.

Es un sitio estático (HTML/CSS/JS) publicado en **GitHub Pages**.

## En línea

`https://westakira9.github.io/azar/`

Compártele el enlace a quien quieras. Cualquiera puede ver y usar el modo "Tocar la pantalla".

## Agregar frases

1. Abre el sitio y entra a **Dejar frase**.
2. La primera vez, abre **Configuración de publicación** y pega un **token de GitHub**
   con permiso de escritura (`Contents: Read and write`) sobre este repositorio.
   El token se guarda solo en tu dispositivo (localStorage), nunca en el sitio.
3. Escribe la **Acción** y **En qué consiste** y pulsa **Agregar frase**.
   Se guarda en `phrases.json` del repo; en ~1 minuto GitHub Pages la publica y tu amigo la verá.

### Crear el token de GitHub

GitHub → Settings → Developer settings → **Fine-grained tokens** → Generate new token:
- Repository access: solo `azar`.
- Permissions → Repository permissions → **Contents: Read and write**.

## Archivos

- `index.html`, `styles.css`, `app.js` — la app.
- `config.js` — clave del panel y datos del repo.
- `phrases.json` — las frases (fuente de verdad, en línea).
