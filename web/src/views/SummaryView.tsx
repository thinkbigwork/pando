/**
 * Vista de visitantes: lee únicamente `public/summary` (nunca `items`).
 * Muestra totales por línea y etapa y las oportunidades marcadas como visibles.
 */

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { doc, onSnapshot } from 'firebase/firestore';
import { STAGE_KEYS, type StageKey } from '@pando/shared';
import { db } from '../firebase';
import { LanguageSwitcher } from '../components/LanguageSwitcher';

interface Bucket {
  count: number;
  amount: number;
}
interface Summary {
  generatedAt?: string;
  total?: Bucket;
  byTrunk?: Record<string, Bucket>;
  byStage?: Partial<Record<StageKey, Bucket>>;
  visible?: { id: string; title: string; trunk: string; stage: StageKey; description: string }[];
}

export function SummaryView({ onSignOut }: { onSignOut?: () => void }) {
  const { t } = useTranslation();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onSnapshot(
      doc(db, 'public', 'summary'),
      (snap) => {
        setSummary((snap.data() as Summary) ?? {});
        setLoading(false);
      },
      () => setLoading(false),
    );
  }, []);

  return (
    <div className="shell">
      <header className="appbar">
        <div className="appbar__brand">
          <img src="/brand/wizor-logo-white.png" alt="Wizor" />
          <span className="appbar__product">{t('app.name')}</span>
        </div>
        <div className="appbar__spacer" />
        <LanguageSwitcher />
        {onSignOut && (
          <button className="appbar__btn" onClick={() => void onSignOut()}>
            {t('auth.signOut')}
          </button>
        )}
      </header>

      <main className="content">
        <h2>{t('summary.title')}</h2>
        {loading ? (
          <p className="muted">{t('auth.loading')}</p>
        ) : !summary || !summary.total ? (
          <p className="muted">{t('summary.empty')}</p>
        ) : (
          <>
            <div className="stats">
              <div className="stat">
                <b>{summary.total.count}</b>
                <span>{t('summary.total')}</span>
              </div>
              {Object.entries(summary.byTrunk ?? {}).map(([trunk, b]) => (
                <div className="stat" key={trunk}>
                  <b>{b.count}</b>
                  <span>{trunk}</span>
                </div>
              ))}
            </div>

            <h3>{t('summary.byStage')}</h3>
            <div className="chips-row">
              {STAGE_KEYS.filter((s) => summary.byStage?.[s]).map((s) => (
                <span className="chip" key={s}>
                  {t(`stage.${s}`)}: {summary.byStage![s]!.count}
                </span>
              ))}
            </div>

            <h3>{t('summary.opportunities')}</h3>
            {(summary.visible ?? []).length === 0 ? (
              <p className="muted">{t('summary.empty')}</p>
            ) : (
              <ul className="summary-list">
                {(summary.visible ?? []).map((v) => (
                  <li key={v.id}>
                    <b>{v.title}</b>
                    <span className="chip">{t(`stage.${v.stage}`)}</span>
                    <div className="muted">
                      {v.trunk}
                      {v.description ? ` · ${v.description}` : ''}
                    </div>
                  </li>
                ))}
              </ul>
            )}

            {summary.generatedAt && (
              <p className="muted summary-updated">
                {t('summary.updated', { date: new Date(summary.generatedAt).toLocaleString() })}
              </p>
            )}
          </>
        )}
      </main>
    </div>
  );
}
