/**
 * Shell de la app para usuarios con rol: barra superior con la marca Wizor,
 * filtros y la vista Árbol. El Tablero, la Lista y la Agenda llegan en 1d; la
 * ficha (drawer) en 1c-ii.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { can, STAGES, ACTIVE_STAGE_KEYS, type Role } from '@pando/shared';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { OpportunityTree, type ColorBy } from '../tree/OpportunityTree';
import type { ItemWithId } from '../tree/model';

interface Props {
  items: ItemWithId[];
  loading: boolean;
  error: string | null;
  role: Role;
  currentUid: string | null;
  displayName: string;
  onSignOut?: () => void;
  onManageUsers?: () => void;
}

function uniqueSorted(values: (string | undefined)[]): string[] {
  return [...new Set(values.filter((v): v is string => !!v))].sort((a, b) => a.localeCompare(b));
}

export function AppShell({
  items,
  loading,
  error,
  role,
  currentUid,
  displayName,
  onSignOut,
  onManageUsers,
}: Props) {
  const { t } = useTranslation();
  const showMoney = can(role, 'viewAmounts');
  const isAdmin = can(role, 'manageUsers');

  const [q, setQ] = useState('');
  const [trunk, setTrunk] = useState('');
  const [sector, setSector] = useState('');
  const [owner, setOwner] = useState('');
  const [mine, setMine] = useState(false);
  const [colorBy, setColorBy] = useState<ColorBy>('stage');
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const initialized = useRef(false);

  // El árbol arranca plegado: al llegar los datos, se pliegan todos los troncos.
  useEffect(() => {
    if (initialized.current || items.length === 0) return;
    initialized.current = true;
    setCollapsed(new Set(items.map((it) => 't:' + (it.trunk || 'Sin línea'))));
  }, [items]);

  const trunks = useMemo(() => uniqueSorted(items.map((i) => i.trunk)), [items]);
  const sectors = useMemo(() => uniqueSorted(items.map((i) => i.sector)), [items]);
  const owners = useMemo(() => uniqueSorted(items.flatMap((i) => i.owners || [])), [items]);

  const visible = useMemo(() => {
    const ql = q.trim().toLowerCase();
    return items.filter((it) => {
      if (it.archived) return false;
      if (trunk && it.trunk !== trunk) return false;
      if (sector && it.sector !== sector) return false;
      if (owner && !(it.owners || []).includes(owner)) return false;
      if (mine && !(it.ownerUids || []).includes(currentUid ?? '')) return false;
      if (ql) {
        const hay = [it.title, it.org, it.branch, it.description, it.nextStep, ...(it.owners || [])]
          .join(' ')
          .toLowerCase();
        if (!hay.includes(ql)) return false;
      }
      return true;
    });
  }, [items, q, trunk, sector, owner, mine, currentUid]);

  // Al buscar, se despliega el camino de los resultados (se quitan del plegado).
  const effectiveCollapsed = useMemo(() => {
    if (!q.trim()) return collapsed;
    const open = new Set<string>();
    for (const it of visible) {
      open.add('t:' + (it.trunk || 'Sin línea'));
      open.add('b:' + (it.trunk || 'Sin línea') + '/' + (it.branch || 'General'));
    }
    return new Set([...collapsed].filter((k) => !open.has(k)));
  }, [collapsed, q, visible]);

  const highlightId = q.trim() && visible.length ? visible[0].id : null;

  function toggle(key: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  const activeCount = visible.filter((i) => i.stage !== 'perdido' && i.stage !== 'pausado').length;

  return (
    <div className="shell">
      <header className="appbar">
        <div className="appbar__brand">
          <img src="/brand/wizor-logo-white.png" alt="Wizor" />
          <span className="appbar__product">{t('app.name')}</span>
        </div>
        <div className="appbar__spacer" />
        <span className="role-chip">{t(`role.${role}`)}</span>
        <LanguageSwitcher />
        {isAdmin && onManageUsers && (
          <button className="appbar__btn" onClick={onManageUsers}>
            {t('home.manageUsers')}
          </button>
        )}
        {onSignOut && (
          <button className="appbar__btn" onClick={() => void onSignOut()}>
            {t('auth.signOut')}
          </button>
        )}
      </header>

      <div className="filters">
        <input
          type="search"
          placeholder={t('filters.search')}
          aria-label={t('filters.search')}
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select
          value={trunk}
          onChange={(e) => setTrunk(e.target.value)}
          aria-label={t('filters.line')}
        >
          <option value="">{t('filters.allLines')}</option>
          {trunks.map((tr) => (
            <option key={tr}>{tr}</option>
          ))}
        </select>
        <select
          value={sector}
          onChange={(e) => setSector(e.target.value)}
          aria-label={t('filters.sector')}
        >
          <option value="">{t('filters.allSectors')}</option>
          {sectors.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <select
          value={owner}
          onChange={(e) => setOwner(e.target.value)}
          aria-label={t('filters.owner')}
        >
          <option value="">{t('filters.allOwners')}</option>
          {owners.map((o) => (
            <option key={o}>{o}</option>
          ))}
        </select>
        <label className="filters__mine">
          <input type="checkbox" checked={mine} onChange={(e) => setMine(e.target.checked)} />
          {t('filters.mine')}
        </label>
      </div>

      <main className="content">
        <div className="legend">
          <span className="muted">{t('tree.legendTitle')}</span>
          {ACTIVE_STAGE_KEYS.map((s) => (
            <span key={s} className="legend__item">
              <i style={{ background: STAGES[s].colorLight }} />
              {t(`stage.${s}`)}
            </span>
          ))}
          <span className="legend__grow" />
          <label className="legend__colorby">
            {t('tree.colorBy')}
            <select value={colorBy} onChange={(e) => setColorBy(e.target.value as ColorBy)}>
              <option value="stage">{t('tree.byStage')}</option>
              <option value="urg">{t('tree.byUrgency')}</option>
            </select>
          </label>
        </div>

        {error ? (
          <p className="content__error">{error}</p>
        ) : loading ? (
          <p className="muted">{t('auth.loading')}</p>
        ) : items.length === 0 ? (
          <div className="content__empty">
            <h2>{t('tree.emptyTitle')}</h2>
            <p className="muted">{t('tree.emptyBody')}</p>
          </div>
        ) : (
          <>
            <p className="content__count muted">
              {t('tree.activeCount', { count: activeCount, lines: trunks.length })}
            </p>
            <div className="treeScroll">
              <OpportunityTree
                items={visible}
                colorBy={colorBy}
                collapsed={effectiveCollapsed}
                onToggle={toggle}
                onSelect={setSelectedId}
                selectedId={selectedId}
                showMoney={showMoney}
                highlightId={highlightId}
              />
            </div>
          </>
        )}
      </main>

      <footer className="shell__foot muted">
        {displayName} · {t(`role.${role}`)}
      </footer>
    </div>
  );
}
