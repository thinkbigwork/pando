/**
 * Punto de entrada de las Cloud Functions de Pando.
 * Inicializa el Admin SDK una sola vez y exporta las funciones.
 */

import { initializeApp } from 'firebase-admin/app';

initializeApp();

export { bootstrapAdmin } from './bootstrapAdmin.js';
export { setRoleClaim } from './setRoleClaim.js';
