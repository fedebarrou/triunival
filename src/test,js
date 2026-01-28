import UniVal from './src/index.js';

const mySchema = {
  username: { required: true, min: 5 },
  email: { type: 'email', required: true }
};

const validator = new UniVal(mySchema);

// Simulación de Backend o JS
const testData = { username: "abc", email: "mal-email" };
console.log("Resultado Validación:", validator.validate(testData));

// Simulación de React/HTML
console.log("Atributos para el input:", validator.getHtmlProps('username'));
