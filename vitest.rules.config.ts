import { defineConfig } from 'vitest/config';

// Config exclusiva de los tests de reglas de Firestore (carpeta test/).
// Se ejecuta dentro de `firebase emulators:exec` (ver script test:rules).
export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    testTimeout: 15000,
    hookTimeout: 30000,
  },
});
