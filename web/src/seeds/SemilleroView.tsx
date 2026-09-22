/**
 * Semillero: bandeja de contactos nuevos por revisar. Muestra los datos
 * extraídos, avisa de posibles duplicados y permite plantar (crear hoja o sumar
 * a una existente), descartar o fusionar. Ver docs/01-producto.md.
 */

import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { findDuplicates, type DuplicateCandidate } from '@pando/shared';
import type { SeedWithId } from '../data/useSeeds';
import type { ItemWithId } from '../tree/model';

interface Props {
  seeds: SeedWithId[];
  items: ItemWithId[];
  onPlant: (seedId: string, addToItemId?: string) => void;
  onDiscard: (seedId: string) => void;
  onMerge: (seedId: string, intoSeedId: string) => void;
  busyId?: string | null;
}

function candidate(s: SeedWithId): DuplicateCandidate {
  return {
    id: s.id,
    email: s.extracted?.email,
    phone: s.extracted?.phone,
    org: s.extracted?.org,
    name: s.extracted?.name,
  };
}

export function SemilleroView({ seeds, items, onPlant, onDiscard, onMerge, busyId }: Props) {
  const { t } = useTranslation();
  const [into, setInto] = useState<Record<string, string>>({});
  const [mergeInto, setMergeInto] = useState<Record<string, string>>({});

  const candidates = useMemo(() => seeds.map(candidate), [seeds]);

  if (seeds.length === 0) {
    return <div className="content__empty muted">{t('seedbed.empty')}</div>;
  }

  return (
    <div className="seedbed">
      {seeds.map((s) => {
        const ex = s.extracted ?? { confidence: 0 };
        const dupIds = findDuplicates(candidate(s), candidates);
        const busy = busyId === s.id;
        return (
          <div key={s.id} className="seed">
            <div className="seed__head">
              <strong>{ex.name || t('seedbed.noName')}</strong>
              <span className="chip">{t(`channel.${s.channel}`)}</span>
              {typeof ex.confidence === 'number' && (
                <span className="muted">{Math.round(ex.confidence * 100)}%</span>
              )}
            </div>
            <div className="seed__fields muted">
              {[ex.role, ex.org].filter(Boolean).join(' · ')}
              {ex.email ? ` · ${ex.email}` : ''}
              {ex.phone ? ` · ${ex.phone}` : ''}
            </div>
            {ex.interest && <div className="seed__interest">{ex.interest}</div>}
            {(ex.suggestedTrunk || ex.suggestedBranch) && (
              <div className="muted seed__suggest">
                {t('seedbed.suggested')}:{' '}
                {[ex.suggestedTrunk, ex.suggestedBranch].filter(Boolean).join(' / ')}
              </div>
            )}
            {dupIds.length > 0 && (
              <div className="seed__dup">
                {t('seedbed.possibleDup', {
                  names: dupIds
                    .map((id) => seeds.find((x) => x.id === id)?.extracted?.name || id)
                    .join(', '),
                })}
              </div>
            )}

            <div className="seed__actions">
              <button className="primary" disabled={busy} onClick={() => onPlant(s.id)}>
                {t('seedbed.plantNew')}
              </button>

              <span className="seed__inline">
                <select
                  value={into[s.id] ?? ''}
                  onChange={(e) => setInto((m) => ({ ...m, [s.id]: e.target.value }))}
                  aria-label={t('seedbed.plantInto')}
                >
                  <option value="">{t('seedbed.plantInto')}…</option>
                  {items
                    .filter((i) => !i.archived)
                    .map((i) => (
                      <option key={i.id} value={i.id}>
                        {i.title}
                      </option>
                    ))}
                </select>
                <button disabled={busy || !into[s.id]} onClick={() => onPlant(s.id, into[s.id])}>
                  {t('seedbed.add')}
                </button>
              </span>

              <span className="seed__inline">
                <select
                  value={mergeInto[s.id] ?? ''}
                  onChange={(e) => setMergeInto((m) => ({ ...m, [s.id]: e.target.value }))}
                  aria-label={t('seedbed.mergeWith')}
                >
                  <option value="">{t('seedbed.mergeWith')}…</option>
                  {seeds
                    .filter((x) => x.id !== s.id)
                    .map((x) => (
                      <option key={x.id} value={x.id}>
                        {x.extracted?.name || x.id}
                      </option>
                    ))}
                </select>
                <button
                  disabled={busy || !mergeInto[s.id]}
                  onClick={() => onMerge(s.id, mergeInto[s.id])}
                >
                  {t('seedbed.merge')}
                </button>
              </span>

              <button className="danger" disabled={busy} onClick={() => onDiscard(s.id)}>
                {t('seedbed.discard')}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
