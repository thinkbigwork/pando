/** Lista: tabla ordenable y filtrable, con exportación a CSV para roles con
 * montos. Fiel al prototipo. */

import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { STAGES } from '@pando/shared';
import { money, urgency, type ItemWithId } from '../tree/model';

interface Props {
  items: ItemWithId[];
  showMoney: boolean;
  onSelect: (id: string) => void;
}

type SortKey =
  | 'title'
  | 'trunk'
  | 'stage'
  | 'amount1'
  | 'probability'
  | 'weighted'
  | 'owners'
  | 'deadline'
  | 'nextStep';

function weighted(i: ItemWithId): number {
  return ((i.amount1 || 0) * (i.probability ?? 0)) / 100;
}

function value(i: ItemWithId, k: SortKey): string | number {
  if (k === 'weighted') return weighted(i);
  if (k === 'owners') return (i.owners || []).join(', ');
  if (k === 'stage') return STAGES[i.stage].order;
  return (i[k as keyof ItemWithId] as string | number) ?? '';
}

export function ListView({ items, showMoney, onSelect }: Props) {
  const { t } = useTranslation();
  const [sortKey, setSortKey] = useState<SortKey>('deadline');
  const [dir, setDir] = useState(1);

  const columns: [SortKey, string][] = [
    ['title', t('list.opportunity')],
    ['trunk', t('filters.line')],
    ['stage', t('card.stage')],
    ...(showMoney
      ? ([
          ['amount1', t('list.phase1')],
          ['probability', t('list.prob')],
          ['weighted', t('card.weighted')],
        ] as [SortKey, string][])
      : []),
    ['owners', t('card.owners')],
    ['deadline', t('card.deadline')],
    ['nextStep', t('card.nextStep')],
  ];

  const sorted = useMemo(() => {
    const arr = [...items];
    arr.sort((a, b) => {
      const x = value(a, sortKey);
      const y = value(b, sortKey);
      if (x === '' || x == null) return 1;
      if (y === '' || y == null) return -1;
      return (x > y ? 1 : x < y ? -1 : 0) * dir;
    });
    return arr;
  }, [items, sortKey, dir]);

  function sortBy(k: SortKey) {
    if (k === sortKey) setDir((d) => -d);
    else {
      setSortKey(k);
      setDir(1);
    }
  }

  function exportCsv() {
    const head = columns.map((c) => c[1]);
    const rows = sorted.map((i) =>
      columns.map(([k]) => {
        if (k === 'weighted') return i.amount1 ? Math.round(weighted(i)) : '';
        if (k === 'stage') return t(`stage.${i.stage}`);
        return String(value(i, k) ?? '');
      }),
    );
    const csv = [head, ...rows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'pando-oportunidades.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="tbl">
      {showMoney && (
        <div className="tbl__bar">
          <button onClick={exportCsv}>{t('list.exportCsv')}</button>
        </div>
      )}
      <table>
        <thead>
          <tr>
            {columns.map(([k, l]) => (
              <th key={k} onClick={() => sortBy(k)}>
                {l}
                {sortKey === k ? (dir > 0 ? ' ▲' : ' ▼') : ''}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((i) => (
            <tr key={i.id} onClick={() => onSelect(i.id)}>
              {columns.map(([k]) => {
                if (k === 'title')
                  return (
                    <td key={k}>
                      <b>{i.title}</b>
                      <div className="muted">
                        {i.branch}
                        {i.country ? `, ${i.country}` : ''}
                      </div>
                    </td>
                  );
                if (k === 'stage')
                  return (
                    <td key={k}>
                      <span className="dot" style={{ background: STAGES[i.stage].colorLight }} />
                      {t(`stage.${i.stage}`)}
                    </td>
                  );
                if (k === 'amount1')
                  return (
                    <td key={k} className="num">
                      {money(i.amount1)}
                    </td>
                  );
                if (k === 'probability')
                  return (
                    <td key={k} className="num">
                      {i.probability ?? 0}%
                    </td>
                  );
                if (k === 'weighted')
                  return (
                    <td key={k} className="num">
                      {i.amount1 ? money(weighted(i)) : t('tree.noDate') && '—'}
                    </td>
                  );
                if (k === 'deadline') {
                  const u = urgency(i);
                  return (
                    <td
                      key={k}
                      style={{
                        whiteSpace: 'nowrap',
                        color:
                          u === 'late' ? 'var(--danger)' : u === 'soon' ? 'var(--warn)' : 'inherit',
                      }}
                    >
                      {i.deadline || '—'}
                    </td>
                  );
                }
                return <td key={k}>{String(value(i, k) ?? '')}</td>;
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
