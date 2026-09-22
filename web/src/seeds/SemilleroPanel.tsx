/** Contenedor del semillero: datos en vivo + acciones (callables). En modo
 * muestra recibe semillas fijas y las acciones no escriben. */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SemilleroView } from './SemilleroView';
import { useSeeds, type SeedWithId } from '../data/useSeeds';
import { discardSeed, mergeSeeds, plantSeed } from '../api/seeds';
import type { ItemWithId } from '../tree/model';

interface Props {
  items: ItemWithId[];
  sampleSeeds?: SeedWithId[];
}

export function SemilleroPanel({ items, sampleSeeds }: Props) {
  const { t } = useTranslation();
  const live = useSeeds(!sampleSeeds);
  const seeds = sampleSeeds ?? live.seeds;
  const [busyId, setBusyId] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function run(id: string, fn: () => Promise<unknown>) {
    if (sampleSeeds) {
      setMsg(t('seedbed.sampleNote'));
      return;
    }
    setBusyId(id);
    setMsg(null);
    try {
      await fn();
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      {(msg || live.error) && <p className="content__error">{msg || live.error}</p>}
      <SemilleroView
        seeds={seeds}
        items={items}
        busyId={busyId}
        onPlant={(id, into) => void run(id, () => plantSeed(id, into))}
        onDiscard={(id) => void run(id, () => discardSeed(id))}
        onMerge={(id, into) => void run(id, () => mergeSeeds(id, into))}
      />
    </>
  );
}
