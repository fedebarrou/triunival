# Triunival

**Triunival** es una librería de **validación unificada** pensada para que uses **las mismas reglas** en **frontend y backend**, y además puedas **generar formularios** a partir de una configuración, sin perder libertad para un **UX personalizado**.

> Una sola fuente de verdad para validación: menos duplicación, menos bugs, más velocidad de desarrollo.

---

## ¿Qué problema resuelve?

En la mayoría de proyectos, la validación termina duplicada:

- En el **frontend**: validación para UX (feedback inmediato).
- En el **backend**: validación obligatoria (seguridad / integridad).
- En el medio: inconsistencias (“en el front deja, en el back falla”).

Triunival apunta a esto:

- ✅ **Mismas reglas en todo el stack**
- ✅ **Validación de datos** (core)
- ✅ **Generación de formularios** (opcional) para acelerar UI
- ✅ **Adapters** para que el HTML/React/Vue se renderice como vos querés

---

## Arquitectura en 3 piezas

Triunival une tres capas que podés usar juntas o por separado:

1. **Core (`validate`)**  
   Motor de validación: funciona en Node y en navegador.

2. **Generator (`FormGenerator`)**  
   Transforma una config de campos en un “schema” normalizado.

3. **Adapter (`HtmlAdapter`)**  
   Renderiza el schema al formato del entorno (HTML5 hoy; React/Vue mañana con otro adapter).

---

## Instalación

```bash
npm install triunival
```

Requisitos recomendados:
- Node 18+ (pero suele funcionar en 16+ dependiendo del bundler)
- Navegadores modernos (Chrome/Firefox/Edge/Safari)

---

## Uso rápido (lo esencial)

### 1) Validar datos (frontend o backend)

```js
import { validate } from "triunival";

const rules = {
  email: "required|email",
  password: "required|min:8",
};

const data = { email: "fede@mail.com", password: "123" };

const { isValid, errors } = await validate(data, rules);

if (!isValid) console.log(errors);
```

---

## Uso en Backend (Node.js / Express)

> En backend, la validación **no es opcional**: es la autoridad.  
> El frontend mejora UX, pero el backend decide.

```js
import express from "express";
import { validate } from "triunival";

const app = express();
app.use(express.json());

const rules = {
  email: "required|email",
  password: "required|min:8",
};

app.post("/api/register", async (req, res) => {
  const data = {
    email: req.body?.email ?? "",
    password: req.body?.password ?? "",
  };

  const { isValid, errors } = await validate(data, rules);

  if (!isValid) {
    return res.status(422).json({ ok: false, errors });
  }

  return res.json({ ok: true });
});

app.listen(4000);
```

### ¿Por qué esto mantiene coherencia?
Porque podés reutilizar el mismo `rules` (o importarlo desde un archivo compartido), y validás igual en ambos lados.

---

## Uso en Frontend (Vanilla JS) — con generación de formularios

Triunival puede **generar HTML** para acelerar el scaffolding de UI.  
Esto **no reemplaza tu diseño**: lo acelera.

```js
import { FormGenerator, HtmlAdapter, validate } from "triunival";

const rules = {
  email: "required|email",
  password: "required|min:8",
};

const config = [
  { name: "email", type: "email", label: "Tu correo", rules: rules.email, placeholder: "fede@mail.com" },
  { name: "password", type: "password", label: "Contraseña", rules: rules.password, placeholder: "mínimo 8 caracteres" },
  { name: "submit", type: "submit", value: "Registrar" },
];

const html = FormGenerator.generate(config, HtmlAdapter, {
  form: { id: "registerForm" },
});

document.getElementById("app").innerHTML = html;

const form = document.getElementById("registerForm");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const fd = new FormData(form);
  const payload = {
    email: String(fd.get("email") || ""),
    password: String(fd.get("password") || ""),
  };

  const { isValid, errors } = await validate(payload, rules);
  if (!isValid) {
    console.log("CLIENT ERRORS:", errors);
    return;
  }

  // Backend decide siempre
  const res = await fetch("/api/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const json = await res.json();
  console.log("SERVER:", res.status, json);
});
```

---

## UX base vs UX personalizado (sin escribir otro adapter)

El **mismo `HtmlAdapter`** soporta:
- `options.form` (id, className, attrs…)
- `options.classes` (clases por parte del form)
- `item.ui` por campo (variant, hint, clases por campo…)

### UX Base (mínimo)

```js
const html = FormGenerator.generate(config, HtmlAdapter, {
  form: { id: "registerForm" },
});
```

### UX Custom (mismo schema/reglas, distinto look)

```js
const config = [
  {
    name: "email",
    type: "email",
    label: "Correo",
    rules: rules.email,
    placeholder: "fede@mail.com",
    ui: { variant: "floating", hint: "No compartimos tu correo.", inputClass: "inp inp-lg" },
  },
  {
    name: "password",
    type: "password",
    label: "Contraseña",
    rules: rules.password,
    placeholder: "mínimo 8 caracteres",
    ui: { hint: "Usá al menos 8 caracteres.", inputClass: "inp" },
  },
  { name: "submit", type: "submit", value: "Crear cuenta" },
];

const html = FormGenerator.generate(config, HtmlAdapter, {
  form: { id: "registerForm", className: "t-form", attrs: { "data-form": "register" } },
  classes: {
    fieldGroup: "t-field",
    label: "t-label",
    input: "t-input",
    error: "t-error",
    hint: "t-hint",
  },
  submit: { text: "Crear cuenta", className: "t-btn" },
});
```

👉 Resultado: **misma lógica de validación**, **UI libre**.

---

## ¿Qué significa “cambiar el adapter”?

Un **adapter** define **cómo se renderiza** el schema (markup / componentes).  
Hoy Triunival incluye `HtmlAdapter`, pero podés crear:

- `ReactAdapter` (renderiza componentes React)
- `VueAdapter`
- `SvelteAdapter`
- `React-Hook-Form adapter`, etc.

Triunival no te obliga a un framework: te da la base y el contrato.

---

## Validación: UX vs Seguridad (no confundirse)

- ✅ **Frontend**: valida para UX (feedback inmediato, evita requests inútiles).
- ✅ **Backend**: valida para seguridad/integridad.
- ❌ Un usuario puede “saltear” validaciones del frontend (DevTools, requests manuales).

Triunival ayuda a que el frontend y backend **usen las mismas reglas**, pero **la seguridad** sigue siendo backend.

---

## Ventajas (por qué simplifica tu stack)

### 1) Unifica criterio (menos bugs)
Un solo set de reglas evita el clásico:
- “en el front pasa”
- “en el back falla”
- “en producción explota”

### 2) Reduce duplicación
No reescribís las mismas validaciones en 2 lugares.

### 3) Escalable
Podés empezar usando solo `validate()` y, cuando quieras, sumar generación de forms o adapters.

### 4) Acelera UI (cuando lo necesitás)
Para paneles admin, MVPs, prototipos o backoffices:
- generás el form rápido
- después lo “pulís” con `options` o con un adapter propio

### 5) UX personalizado sin casarte con un UI kit
Podés usar `options.classes` y `item.ui` para adaptarte a:
- Tailwind / CSS Modules
- Bootstrap
- tu design system propio

---

## Comparación rápida: Triunival vs Zod (y similares)

**Zod** es excelente para:
- tipado y validación en TS
- schemas complejos
- parsers y transforms

Pero en la práctica:
- No está pensado como “motor + generador de UI” nativo.
- No tiene el concepto de “adapter” para renderizar forms.
- Usualmente terminás armando tu propia capa de metadata/UI.

**Triunival** se enfoca en:
- reglas simples tipo `required|email|min:8`
- consistencia fullstack
- generación de formularios (opcional)
- adapters para UI

📌 No son enemigos: podés usar Zod en partes del proyecto y Triunival donde quieras **uniformidad + formularios**.

---

## API

### `validate(data, rules)`

- `data`: objeto con valores `{ campo: valor }`
- `rules`: objeto `{ campo: "required|email|min:8" }` (o reglas en objeto)

Retorna:

```js
{
  isValid: boolean,
  errors: {
    [field]: "mensaje"
  }
}
```

### `FormGenerator.generate(config, adapter, options)`

- `config`: array de campos
- `adapter`: por defecto `HtmlAdapter`
- `options`: `form`, `classes`, `submit`

### `HtmlAdapter`

- Renderiza HTML5 con atributos nativos cuando es posible
- Emite placeholders de error compatibles:
  - `id="error-campo"` (legacy)
  - `data-error-for="campo"` (nuevo)

---

## Config de campos (referencia)

Ejemplo típico:

```js
const config = [
  {
    name: "email",
    type: "email",
    label: "Email",
    placeholder: "test@mail.com",
    rules: "required|email",
    ui: {
      variant: "floating",
      hint: "No spam.",
      inputClass: "my-input",
      wrapperClass: "my-field",
      labelClass: "my-label",
      errorClass: "my-error",
    },
    attrs: {
      autocomplete: "email",
      "data-qa": "email-input"
    }
  },
  { name: "submit", type: "submit", value: "Enviar" }
];
```

---

## Buenas prácticas recomendadas

### 1) Compartí reglas entre front y back
Ejemplo:

```js
// shared/rules.js
export const registerRules = {
  email: "required|email",
  password: "required|min:8",
};
```

Luego importás eso en ambos.

### 2) Backend siempre valida
Aunque el frontend valide perfecto.

### 3) Generación de forms: úsala donde suma
- Admin panels
- MVPs
- Backoffice
- prototipos

En landing ultra custom, probablemente uses solo `validate()`.

---

## Licencia

MIT © 2026 Federico Barroumeres
