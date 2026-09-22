/** Agenda: deadlines, pasos y reuniones agrupados en Vencido, Esta semana,
 * Próximas 3 semanas y Más adelante. Fiel al prototipo. */

import { useTranslation } from 'react-i18next';
import { daysTo, isOpen, type ItemWithId } from '../tree/model';

interface Props {
  items: ItemWithId[];
  onSelect: (id: string) => void;
}

interface Ev {
  d: string;
  kind: string;
  title: string;
  detail: string;
  id: string;
  who: string;
}

export function AgendaView({ items, onSelect }: Props) {
  const { t } = useTranslation();

  const events: Ev[] = [];
  for (const it of items) {
    if (it.deadline && isOpen(it)) {
      events.push({
        d: it.deadline,
        kind: t('agenda.deadline'),
        title: it.title,
        detail: it.nextStep || '',
        id: it.id,
        who: (it.owners || []).join(', '),
      });
    }
    for (const s of it.steps || []) {
      if (!s.done && s.due && s.due !== it.deadline) {
        events.push({
          d: s.due,
          kind: t('agenda.step'),
          title: it.title,
          detail: s.text,
          id: it.id,
          who: s.owner,
        });
      }
    }
  }
  events.sort((a, b) => a.d.localeCompare(b.d));

  const groups: [string, (e: Ev) => boolean][] = [
    ['agenda.overdue', (e) => (daysTo(e.d) ?? 0) < 0],
    ['agenda.thisWeek', (e) => (daysTo(e.d) ?? 0) >= 0 && (daysTo(e.d) ?? 0) <= 7],
    ['agenda.next3', (e) => (daysTo(e.d) ?? 0) > 7 && (daysTo(e.d) ?? 0) <= 28],
    ['agenda.later', (e) => (daysTo(e.d) ?? 0) > 28],
  ];

  const rendered = groups
    .map(([labelKey, f]) => ({ labelKey, list: events.filter(f) }))
    .filter((g) => g.list.length > 0);

  if (rendered.length === 0) {
    return <div className="content__empty muted">{t('agenda.empty')}</div>;
  }

  return (
    <div className="agenda">
      {rendered.map(({ labelKey, list }) => (
        <div key={labelKey}>
          <h3>
            {t(labelKey)} <span className="muted">{list.length}</span>
          </h3>
          {list.map((e, i) => (
            <div
              key={e.id + i}
              className="ev"
              tabIndex={0}
              onClick={() => onSelect(e.id)}
              onKeyDown={(k) => k.key === 'Enter' && onSelect(e.id)}
            >
              <div className="ev__when">
                <div className="ev__date">{e.d}</div>
                <div className="muted">{e.kind}</div>
              </div>
              <div>
                <b>{e.title}</b>
                <div className="muted">
                  {e.detail}
                  {e.who ? `, ${e.who}` : ''}
                </div>
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
