/** Semillas de ejemplo para el modo muestra dev (no se usan en producción). */

import type { SeedWithId } from '../data/useSeeds';

export const SAMPLE_SEEDS: SeedWithId[] = [
  {
    id: 's1',
    status: 'pendiente',
    capturedBy: 'u_advisor',
    capturedAt: '2026-09-20T14:00:00Z',
    channel: 'voz',
    raw: { transcript: 'Conocí a Ana de YPF, le interesa la app de seguridad' },
    extracted: {
      name: 'Ana Pérez',
      role: 'HSE Manager',
      org: 'YPF',
      email: 'ana@ypf.com',
      interest: 'App de seguridad para operarios',
      suggestedTrunk: 'Wizor Safety en empresas',
      suggestedBranch: 'Energía y minería',
      confidence: 0.86,
    },
  },
  {
    id: 's2',
    status: 'pendiente',
    capturedBy: 'u_advisor',
    capturedAt: '2026-09-20T14:20:00Z',
    channel: 'foto',
    raw: { imagePath: 'seeds/u_advisor/card2.jpg' },
    extracted: {
      name: 'Ana Pérez',
      org: 'YPF',
      phone: '+54 11 5555 1234',
      confidence: 0.62,
    },
  },
  {
    id: 's3',
    status: 'pendiente',
    capturedBy: 'u_advisor',
    capturedAt: '2026-09-21T09:00:00Z',
    channel: 'qr',
    raw: { qrText: 'https://www.linkedin.com/in/carlos-nasa' },
    extracted: {
      name: 'Carlos Gómez',
      linkedin: 'https://www.linkedin.com/in/carlos-nasa',
      org: 'NASA',
      interest: 'Colaboración Lunar Mission',
      suggestedTrunk: 'Lunar Mission',
      confidence: 0.7,
    },
  },
];
