/**
 * Etapas del pipeline (hojas). Definidas una sola vez y consumidas por web,
 * functions y tests. Ver docs/01-producto.md.
 *
 * `probability` es la probabilidad por defecto que se aplica al cambiar de
 * etapa; puede editarse a mano en cada hoja. Los colores son los tokens del
 * prototipo (claro y oscuro coinciden por ahora).
 */

export const STAGE_KEYS = [
  'exploracion',
  'presentacion',
  'propuesta',
  'poc',
  'negociacion',
  'cierre',
  'despliegue',
  'pausado',
  'perdido',
] as const;

export type StageKey = (typeof STAGE_KEYS)[number];

export interface StageDef {
  key: StageKey;
  /** Clave i18n para el nombre visible (ver web/src/i18n). */
  i18nKey: string;
  /** Probabilidad por defecto (0-100). */
  probability: number;
  /** Color en tema claro. */
  colorLight: string;
  /** Color en tema oscuro. */
  colorDark: string;
  /** Orden de avance en el pipeline. Los estados terminales van al final. */
  order: number;
}

export const STAGES: Record<StageKey, StageDef> = {
  exploracion: {
    key: 'exploracion',
    i18nKey: 'stage.exploracion',
    probability: 10,
    colorLight: '#C7D6A3',
    colorDark: '#C7D6A3',
    order: 1,
  },
  presentacion: {
    key: 'presentacion',
    i18nKey: 'stage.presentacion',
    probability: 20,
    colorLight: '#97C177',
    colorDark: '#97C177',
    order: 2,
  },
  propuesta: {
    key: 'propuesta',
    i18nKey: 'stage.propuesta',
    probability: 35,
    colorLight: '#5DA05A',
    colorDark: '#5DA05A',
    order: 3,
  },
  poc: {
    key: 'poc',
    i18nKey: 'stage.poc',
    probability: 50,
    colorLight: '#2F8A63',
    colorDark: '#2F8A63',
    order: 4,
  },
  negociacion: {
    key: 'negociacion',
    i18nKey: 'stage.negociacion',
    probability: 60,
    colorLight: '#1F6A70',
    colorDark: '#1F6A70',
    order: 5,
  },
  cierre: {
    key: 'cierre',
    i18nKey: 'stage.cierre',
    probability: 90,
    colorLight: '#16435E',
    colorDark: '#16435E',
    order: 6,
  },
  despliegue: {
    key: 'despliegue',
    i18nKey: 'stage.despliegue',
    probability: 100,
    colorLight: '#D8A42B',
    colorDark: '#D8A42B',
    order: 7,
  },
  pausado: {
    key: 'pausado',
    i18nKey: 'stage.pausado',
    probability: 0,
    colorLight: '#A7A9A3',
    colorDark: '#A7A9A3',
    order: 8,
  },
  perdido: {
    key: 'perdido',
    i18nKey: 'stage.perdido',
    probability: 0,
    colorLight: '#8E6E68',
    colorDark: '#8E6E68',
    order: 9,
  },
};

/** Etapas activas (excluye pausado y perdido), en orden de avance. */
export const ACTIVE_STAGE_KEYS: StageKey[] = STAGE_KEYS.filter(
  (k) => k !== 'pausado' && k !== 'perdido',
);

export function isStageKey(value: unknown): value is StageKey {
  return typeof value === 'string' && (STAGE_KEYS as readonly string[]).includes(value);
}

/** Probabilidad por defecto de una etapa. */
export function defaultProbability(stage: StageKey): number {
  return STAGES[stage].probability;
}
