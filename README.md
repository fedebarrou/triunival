# Triunival

**Triunival** es un ecosistema de validación unificado que conecta la **lógica de negocio**, la **estructura del formulario** y la **renderización en el cliente**, permitiendo definir reglas una sola vez y reutilizarlas en todo el stack (backend y frontend).

Está diseñado para eliminar duplicación de validaciones y mantener coherencia entre servidor y cliente.

---

## ✨ Características

- ✅ Una sola fuente de verdad para validaciones
- 🔁 Reutilizable en backend y frontend
- 🧠 Motor de reglas independiente (agnóstico del entorno)
- 🏗️ Generador de formularios dinámicos
- 🎨 Adaptadores para renderizar en distintos entornos (HTML, React, etc.)
- 🚀 Extensible mediante nuevos adapters

---

## 🏗️ Arquitectura (3 Partes)

Triunival está dividido en tres capas bien definidas:

### 1. **Core** (`core.js`)
Motor de reglas de validación.  
No depende de DOM, frameworks ni entorno. Ideal para backend.

### 2. **Generator** (`formGenerator.js`)
Transforma configuraciones en un esquema de formulario procesable.

### 3. **Adapters** (`htmlAdapter.js`)
Traduce el esquema a un entorno visual específico (HTML, React, Vue, etc.).

```
Reglas → Generator → Adapter → UI
   ↑
 Backend / API
```

---

## 🚀 Instalación

```bash
npm install triunival
```

---

## 💻 Uso en Backend (Node.js)

```js
const { validate } = require('triunival/src/core');

const datosRecibidos = {
  usuario: "fede",
  pass: "123"
};

const reglas = {
  usuario: "required|string",
  pass: "required|min:8"
};

const { isValid, errors } = validate(datosRecibidos, reglas);

if (!isValid) {
  console.log("Errores:", errors);
}
```

---

## 🌐 Uso en Frontend (Navegador)

```js
import { FormGenerator } from 'triunival/src/formGenerator';
import { HtmlAdapter } from 'triunival/src/htmlAdapter';

const config = [
  { name: 'email', type: 'email', label: 'Tu correo', rules: 'required|email' },
  { name: 'password', type: 'password', label: 'Contraseña', rules: 'required|min:8' },
  { name: 'enviar', type: 'submit', value: 'Registrar' }
];

const formulario = FormGenerator.generate(config, HtmlAdapter);
document.getElementById('app').innerHTML = formulario;
```

---

## ⚙️ Compatibilidad

- **Sistemas:** Windows, macOS, Linux
- **Entornos:** Node.js v14+, Navegadores modernos
- **Frameworks:** Vanilla JS, Express, React/Vue (via adapters)

---

## 📄 Licencia

MIT License  
Copyright (c) 2026  
Federico Barroumeres
