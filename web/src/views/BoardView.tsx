/** Tablero: columnas por etapa con arrastrar y soltar para avanzar (editores).
 * En móvil se cambia la etapa desde la ficha. Fiel al prototipo. */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { STAGE_KEYS, STAGES, can, type Role, type StageKey } from '@pando/shared';
import { money, urgency, daysTo, type ItemWithId } from '../tree/model';
import { saveItem } from '../data/saveItem';

interface Props {
  items: ItemWithId[];
  role: Role;
  currentUid: string | null;
  showMoney: boolean;
  onSelect: (id: string) => void;
}

export function BoardView({ items, role, currentUid, showMoney, onSelect }: Props) {
  const { t } = useTranslation();
  const [over, setOver] = useState<StageKey | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canEditItem = (it: ItemWithId) =>
    can(role, 'editAnyLeaf') ||
    can(role, 'editOwnLeaf', { isOwner: (it.ownerUids || []).includes(currentUid ?? '') });

  const columns = STAGE_KEYS.filter(
    (k) => k !== 'perdido' || items.some((i) => i.stage === 'perdido'),
  );

  async function moveTo(id: string, stage: StageKey) {
    const it = items.find((i) => i.id === id);
    if (!it || it.stage === stage || !currentUid) return;
    if (!canEditItem(it)) {
      setError(t('board.cannotMove'));
      return;
    }
    setError(null);
    await saveItem(id, { stage, probability: STAGES[stage].probability }, currentUid);
  }

  return (
    <>
      {error && <p className="content__error">{error}</p>}
      <div className="board">
        {columns.map((k) => {
          const cs = items.filter((i) => i.stage === k);
          const tot = cs.reduce((a, i) => a + (i.amount1 || 0), 0);
          return (
            <div
              key={k}
              className={'board__col' + (over === k ? ' over' : '')}
              onDragOver={(e) => {
                e.preventDefault();
                setOver(k);
              }}
              onDragLeave={() => setOver(null)}
              onDrop={(e) => {
                e.preventDefault();
                setOver(null);
                void moveTo(e.dataTransfer.getData('text/plain'), k);
              }}
            >
              <h3>
                {t(`stage.${k}`)}
                <small>
                  {cs.length}
                  {showMoney && tot ? `, ${money(tot)}` : ''}
                </small>
              </h3>
              {cs.map((it) => {
                const u = urgency(it);
                const dd = daysTo(it.deadline);
                return (
                  <div
                    key={it.id}
                    className="bcard"
                    style={{ ['--c' as string]: STAGES[it.stage].colorLight }}
                    draggable={canEditItem(it)}
                    tabIndex={0}
                    onClick={() => onSelect(it.id)}
                    onKeyDown={(e) => e.key === 'Enter' && onSelect(it.id)}
                    onDragStart={(e) => e.dataTransfer.setData('text/plain', it.id)}
                  >
                    <div className="bcard__t">{it.title}</div>
                    <div className="bcard__m">
                      {it.trunk}, {it.branch}
                    </div>
                    <div className="bcard__m">{it.nextStep || t('board.noNextStep')}</div>
                    <div className="bcard__chips">
                      {showMoney && <span className="chip">{money(it.amount1)}</span>}
                      <span
                        className={'chip ' + (u === 'late' ? 'late' : u === 'soon' ? 'soon' : '')}
                      >
                        {u === 'late'
                          ? t('tree.overdueBy', { days: -(dd ?? 0) })
                          : it.deadline || t('tree.noDate')}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </>
  );
}
