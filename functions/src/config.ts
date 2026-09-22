/** Configuración común de las Cloud Functions. */

/**
 * Región de despliegue. Coherente con Firestore (ver LEEME_PRIMERO.md).
 * `southamerica-east1` por latencia para el equipo en la región.
 */
export const REGION = 'southamerica-east1';

/**
 * Dominio de Google Workspace del equipo. Solo los emails de este dominio
 * pueden quedar en estado `pendiente`; el resto necesita invitación explícita.
 */
export const WORKSPACE_DOMAIN = 'wizor.io';
