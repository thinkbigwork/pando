/**
 * Ficha de la oportunidad (drawer), fiel al prototipo. Muestra todas las
 * secciones y permite editar según el permiso del rol. Montos y personas se
 * ocultan a quien no puede verlos; los pasos se marcan con markAssignedSteps.
 */

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { deleteDoc, doc } from 'firebase/firestore';
import {
  ACTIVE_STAGE_KEYS,
  STAGE_KEYS,
  STAGES,
  can,
  type Item,
  type Priority,
  type Step,
  type StageKey,
} from '@pando/shared';
import { db } from '../firebase';
import { addComment, saveItem, saveSteps } from '../data/saveItem';
import { useSubcollection } from '../data/useSubcollection';
import { money } from '../tree/model';
import type { ItemWithId } from '../tree/model';

interface Comment {
  id: string;
  by?: string;
  text?: string;
  at?: string;
  via?: string;
}
interface Meeting {
  id: string;
  title?: string;
  date?: string;
  time?: string;
  attendees?: string[] | string;
}

interface Props {
  item: ItemWithId;
  role: Parameters<typeof can>[0];
  currentUid: string | null;
  allItems: ItemWithId[];
  onClose: () => void;
}

const PRIORITIES: Priority[] = ['alta', 'media', 'baja'];

export function OpportunityCard({ item, role, currentUid, allItems, onClose }: Props) {
  const { t } = useTranslation();

  const isOwner = (item.ownerUids || []).includes(currentUid ?? '');
  const hasAssignedStep = (item.steps || []).some((s) => s.ownerUid === currentUid);
  const canMoney = can(role, 'viewAmounts', { hasAssignedStep });
  const canContacts = can(role, 'viewContacts');
  const canEdit = can(role, 'editAnyLeaf') || can(role, 'editOwnLeaf', { isOwner });
  const canSteps = can(role, 'markAssignedSteps');
  const canComment = can(role, 'comment');
  const canArchive = can(role, 'archive', { isOwner });
  const canDelete = can(role, 'delete');

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<ItemWithId>(item);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');

  useEffect(() => {
    setDraft(item);
    setEditing(false);
    setErr(null);
  }, [item]);

  const comments = useSubcollection<Comment>(item.id, 'comments');
  const meetings = useSubcollection<Meeting>(item.id, 'meetings');

  const view = editing ? draft : item;
  const set = <K extends keyof Item>(k: K, v: Item[K]) => setDraft((d) => ({ ...d, [k]: v }));

  const weighted = useMemo(
    () => Math.round(((view.amount1 || 0) * (view.probability || 0)) / 100),
    [view.amount1, view.probability],
  );

  async function onSave() {
    if (!currentUid) return;
    setBusy(true);
    setErr(null);
    try {
      const patch: Partial<Item> = {
        title: draft.title,
        type: draft.type,
        sector: draft.sector,
        country: draft.country,
        trunk: draft.trunk,
        branch: draft.branch,
        org: draft.org,
        description: draft.description,
        stage: draft.stage,
        stageDetail: draft.stageDetail,
        probability: Number(draft.probability) || 0,
        priority: draft.priority,
        deadline: draft.deadline,
        nextStep: draft.nextStep,
        owners: draft.owners,
        kpis: draft.kpis,
        notes: draft.notes,
        deps: draft.deps,
        docs: draft.docs,
        steps: draft.steps,
        visibleToVisitors: draft.visibleToVisitors,
        ...(canMoney
          ? {
              amount1: draft.amount1,
              duration1: draft.duration1,
              amount2: draft.amount2,
              duration2: draft.duration2,
              funding: draft.funding,
              forecast: draft.forecast,
            }
          : {}),
        ...(canContacts
          ? {
              contact: draft.contact,
              decisionMaker: draft.decisionMaker,
              intermediary: draft.intermediary,
              support: draft.support,
            }
          : {}),
      };
      await saveItem(item.id, patch, currentUid);
      setEditing(false);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function toggleStep(i: number) {
    if (!currentUid) return;
    const steps = (item.steps || []).map((s, j) => (j === i ? { ...s, done: !s.done } : s));
    try {
      await saveSteps(item.id, steps, currentUid);
    } catch (e) {
      setErr((e as Error).message);
    }
  }

  async function onArchive() {
    if (!currentUid) return;
    await saveItem(item.id, { archived: !item.archived }, currentUid);
    onClose();
  }

  async function onDelete() {
    await deleteDoc(doc(db, 'items', item.id));
    onClose();
  }

  async function onComment() {
    if (!currentUid || !commentText.trim()) return;
    await addComment(item.id, currentUid, commentText.trim());
    setCommentText('');
  }

  const shareText = `*${item.title}* (${t(`stage.${item.stage}`)})\n${t('card.nextStep')}: ${
    item.nextStep || '—'
  }\n${t('card.deadline')}: ${item.deadline || '—'}\n${t('card.owners')}: ${(item.owners || []).join(', ')}`;

  const si = STAGES[view.stage]?.order ?? 0;

  return (
    <>
      <div className="scrim" onClick={onClose} />
      <aside className="drawer" role="dialog" aria-label={item.title}>
        <div className="drawer__head">
          <h2>{item.title}</h2>
          <div className="drawer__headActions">
            {canEdit && !editing && (
              <button onClick={() => setEditing(true)}>{t('card.edit')}</button>
            )}
            <button onClick={onClose} aria-label={t('card.close')}>
              {t('card.close')}
            </button>
          </div>
        </div>

        <div className="drawer__body">
          <div className="stagebar" aria-hidden="true">
            {ACTIVE_STAGE_KEYS.map((s) => (
              <span
                key={s}
                style={{
                  background:
                    STAGES[s].order <= si && si <= 7 ? STAGES[view.stage].colorLight : undefined,
                }}
              />
            ))}
          </div>
          <p className="muted drawer__crumbs">
            {view.trunk} / {view.branch || t('card.noBranch')} · {t(`stage.${view.stage}`)}
            {view.stageDetail ? ` (${view.stageDetail})` : ''}
          </p>
          {err && <p className="content__error">{err}</p>}

          <Section title={t('card.whatIs')}>
            <Field
              label={t('card.title')}
              edit={editing}
              value={view.title}
              onChange={(v) => set('title', v)}
            />
            <div className="grid3">
              <Field
                label={t('card.type')}
                edit={editing}
                value={view.type}
                onChange={(v) => set('type', v)}
              />
              <Field
                label={t('card.sector')}
                edit={editing}
                value={view.sector}
                onChange={(v) => set('sector', v)}
              />
              <Field
                label={t('card.country')}
                edit={editing}
                value={view.country}
                onChange={(v) => set('country', v)}
              />
            </div>
            <div className="grid2">
              <Field
                label={t('filters.line')}
                edit={editing}
                value={view.trunk}
                onChange={(v) => set('trunk', v)}
              />
              <Field
                label={t('card.branch')}
                edit={editing}
                value={view.branch}
                onChange={(v) => set('branch', v)}
              />
            </div>
            <Field
              label={t('card.org')}
              edit={editing}
              value={view.org}
              onChange={(v) => set('org', v)}
            />
            <Field
              label={t('card.description')}
              edit={editing}
              multiline
              value={view.description}
              onChange={(v) => set('description', v)}
            />
          </Section>

          <Section title={t('card.where')}>
            <div className="grid3">
              <SelectField
                label={t('card.stage')}
                edit={editing}
                value={view.stage}
                options={STAGE_KEYS.map((s) => [s, t(`stage.${s}`)])}
                onChange={(v) => set('stage', v as StageKey)}
              />
              <Field
                label={t('card.probability')}
                edit={editing}
                type="number"
                value={String(view.probability ?? '')}
                onChange={(v) => set('probability', Number(v))}
              />
              <SelectField
                label={t('card.priority')}
                edit={editing}
                value={view.priority}
                options={PRIORITIES.map((p) => [p, t(`priority.${p}`)])}
                onChange={(v) => set('priority', v as Priority)}
              />
            </div>
            <div className="grid2">
              <Field
                label={t('card.stageDetail')}
                edit={editing}
                value={view.stageDetail}
                onChange={(v) => set('stageDetail', v)}
              />
              <Field
                label={t('card.deadline')}
                edit={editing}
                type="date"
                value={view.deadline}
                onChange={(v) => set('deadline', v)}
              />
            </div>
            <Field
              label={t('card.nextStep')}
              edit={editing}
              value={view.nextStep}
              onChange={(v) => set('nextStep', v)}
            />
            <ArrayField
              label={t('card.owners')}
              edit={editing}
              value={view.owners}
              onChange={(v) => set('owners', v)}
            />
          </Section>

          {canMoney && (
            <Section title={t('card.money')}>
              <div className="grid2">
                <Field
                  label={t('card.amount1')}
                  edit={editing}
                  type="number"
                  value={numStr(view.amount1)}
                  onChange={(v) => set('amount1', numOrNull(v))}
                />
                <Field
                  label={t('card.duration1')}
                  edit={editing}
                  type="number"
                  value={numStr(view.duration1)}
                  onChange={(v) => set('duration1', numOrNull(v))}
                />
                <Field
                  label={t('card.amount2')}
                  edit={editing}
                  type="number"
                  value={numStr(view.amount2)}
                  onChange={(v) => set('amount2', numOrNull(v))}
                />
                <Field
                  label={t('card.duration2')}
                  edit={editing}
                  type="number"
                  value={numStr(view.duration2)}
                  onChange={(v) => set('duration2', numOrNull(v))}
                />
              </div>
              <div className="grid2">
                <Field
                  label={t('card.funding')}
                  edit={editing}
                  value={view.funding}
                  onChange={(v) => set('funding', v)}
                />
                <Field
                  label={t('card.forecast')}
                  edit={editing}
                  value={view.forecast}
                  onChange={(v) => set('forecast', v)}
                />
              </div>
              <p className="muted">
                {t('card.weighted')}: {money(weighted)}
              </p>
            </Section>
          )}

          {canContacts && (
            <Section title={t('card.people')}>
              <div className="grid2">
                <Field
                  label={t('card.contact')}
                  edit={editing}
                  value={view.contact}
                  onChange={(v) => set('contact', v)}
                />
                <Field
                  label={t('card.decisionMaker')}
                  edit={editing}
                  value={view.decisionMaker}
                  onChange={(v) => set('decisionMaker', v)}
                />
                <Field
                  label={t('card.intermediary')}
                  edit={editing}
                  value={view.intermediary}
                  onChange={(v) => set('intermediary', v)}
                />
                <ArrayField
                  label={t('card.support')}
                  edit={editing}
                  value={view.support}
                  onChange={(v) => set('support', v)}
                />
              </div>
            </Section>
          )}

          <Section title={t('card.steps')}>
            {(view.steps || []).length === 0 && <p className="muted">{t('card.noSteps')}</p>}
            {(view.steps || []).map((s, i) => (
              <div key={s.id || i} className={'steprow' + (s.done ? ' done' : '')}>
                <input
                  type="checkbox"
                  checked={s.done}
                  disabled={!canSteps || editing}
                  onChange={() => void toggleStep(i)}
                  aria-label={t('card.done')}
                />
                {editing ? (
                  <StepEditor
                    step={s}
                    onChange={(ns) =>
                      set(
                        'steps',
                        (draft.steps || []).map((x, j) => (j === i ? ns : x)),
                      )
                    }
                    onRemove={() =>
                      set(
                        'steps',
                        (draft.steps || []).filter((_, j) => j !== i),
                      )
                    }
                  />
                ) : (
                  <span className="grow">
                    {s.text}
                    <span className="muted">
                      {' '}
                      {s.owner} {s.due}
                    </span>
                  </span>
                )}
              </div>
            ))}
            {editing && (
              <button
                onClick={() =>
                  set('steps', [
                    ...(draft.steps || []),
                    { id: 's' + Date.now(), text: '', owner: '', due: '', done: false },
                  ])
                }
              >
                {t('card.addStep')}
              </button>
            )}
          </Section>

          <Section title={t('card.docs')}>
            {(view.docs || []).length === 0 && <p className="muted">{t('card.noDocs')}</p>}
            {(view.docs || []).map((d, i) => (
              <div key={d.id || i} className="steprow">
                <span className="grow">{d.name}</span>
                <span className="chip">{t(`docStatus.${d.status}`)}</span>
                {d.url && (
                  <a href={d.url} target="_blank" rel="noopener noreferrer">
                    {t('card.open')}
                  </a>
                )}
              </div>
            ))}
          </Section>

          <Section title={t('card.deps')}>
            <p className="muted">{t('card.depsHint')}</p>
            {editing ? (
              <div className="deps">
                {allItems
                  .filter((o) => o.id !== item.id && !o.archived)
                  .map((o) => (
                    <label key={o.id}>
                      <input
                        type="checkbox"
                        checked={(draft.deps || []).includes(o.id)}
                        onChange={(e) =>
                          set(
                            'deps',
                            e.target.checked
                              ? [...(draft.deps || []), o.id]
                              : (draft.deps || []).filter((x) => x !== o.id),
                          )
                        }
                      />
                      {o.title}
                    </label>
                  ))}
              </div>
            ) : (view.deps || []).length ? (
              <div className="deps">
                {(view.deps || []).map((id) => (
                  <span key={id} className="chip">
                    {allItems.find((o) => o.id === id)?.title ?? id}
                  </span>
                ))}
              </div>
            ) : (
              <p className="muted">{t('card.none')}</p>
            )}
          </Section>

          {meetings.length > 0 && (
            <Section title={t('card.meetings')}>
              {meetings.map((m) => (
                <div key={m.id} className="steprow">
                  <span className="grow">{m.title}</span>
                  <span className="muted">
                    {m.date} {m.time}
                  </span>
                </div>
              ))}
            </Section>
          )}

          <Section title={t('card.tracking')}>
            <Field
              label={t('card.kpis')}
              edit={editing}
              multiline
              value={view.kpis}
              onChange={(v) => set('kpis', v)}
            />
            <Field
              label={t('card.notes')}
              edit={editing}
              multiline
              value={view.notes}
              onChange={(v) => set('notes', v)}
            />
            {editing && (
              <label className="muted checkline">
                <input
                  type="checkbox"
                  checked={draft.visibleToVisitors !== false}
                  onChange={(e) => set('visibleToVisitors', e.target.checked)}
                />
                {t('card.visibleToVisitors')}
              </label>
            )}
          </Section>

          {canComment && (
            <Section title={t('card.activity')}>
              {comments.length === 0 && <p className="muted">{t('card.noComments')}</p>}
              {comments
                .slice()
                .reverse()
                .map((c) => (
                  <div key={c.id} className="comment">
                    <div className="muted">{c.at ? new Date(c.at).toLocaleString() : ''}</div>
                    {c.text}
                  </div>
                ))}
              <div className="steprow">
                <input
                  type="text"
                  className="grow"
                  placeholder={t('card.commentPlaceholder')}
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                />
                <button onClick={() => void onComment()}>{t('card.comment')}</button>
              </div>
            </Section>
          )}
        </div>

        <div className="drawer__foot">
          {editing ? (
            <>
              <button className="primary" disabled={busy} onClick={() => void onSave()}>
                {t('card.save')}
              </button>
              <button
                disabled={busy}
                onClick={() => {
                  setEditing(false);
                  setDraft(item);
                }}
              >
                {t('card.cancel')}
              </button>
            </>
          ) : (
            <>
              <button onClick={() => void navigator.clipboard?.writeText(shareText)}>
                {t('card.copySlack')}
              </button>
              <a
                className="btn-link"
                target="_blank"
                rel="noopener noreferrer"
                href={`https://wa.me/?text=${encodeURIComponent(shareText)}`}
              >
                {t('card.whatsapp')}
              </a>
              {canArchive && (
                <button onClick={() => void onArchive()}>
                  {item.archived ? t('card.unarchive') : t('card.archive')}
                </button>
              )}
              {canDelete && (
                <button className="danger" onClick={() => void onDelete()}>
                  {t('card.delete')}
                </button>
              )}
            </>
          )}
        </div>
      </aside>
    </>
  );
}

// --- helpers de UI ---------------------------------------------------------

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="card-section">
      <legend>{title}</legend>
      {children}
    </fieldset>
  );
}

function Field({
  label,
  value,
  edit,
  onChange,
  type = 'text',
  multiline = false,
}: {
  label: string;
  value: string | undefined;
  edit: boolean;
  onChange: (v: string) => void;
  type?: string;
  multiline?: boolean;
}) {
  return (
    <label className="field">
      <span className="field__label">{label}</span>
      {edit ? (
        multiline ? (
          <textarea value={value ?? ''} onChange={(e) => onChange(e.target.value)} />
        ) : (
          <input type={type} value={value ?? ''} onChange={(e) => onChange(e.target.value)} />
        )
      ) : (
        <span className="field__ro">{value || '—'}</span>
      )}
    </label>
  );
}

function SelectField({
  label,
  value,
  options,
  edit,
  onChange,
}: {
  label: string;
  value: string;
  options: [string, string][];
  edit: boolean;
  onChange: (v: string) => void;
}) {
  const current = options.find((o) => o[0] === value)?.[1] ?? value;
  return (
    <label className="field">
      <span className="field__label">{label}</span>
      {edit ? (
        <select value={value} onChange={(e) => onChange(e.target.value)}>
          {options.map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
      ) : (
        <span className="field__ro">{current || '—'}</span>
      )}
    </label>
  );
}

function ArrayField({
  label,
  value,
  edit,
  onChange,
}: {
  label: string;
  value: string[] | undefined;
  edit: boolean;
  onChange: (v: string[]) => void;
}) {
  return (
    <label className="field">
      <span className="field__label">{label}</span>
      {edit ? (
        <input
          type="text"
          value={(value ?? []).join(', ')}
          onChange={(e) =>
            onChange(
              e.target.value
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean),
            )
          }
        />
      ) : (
        <span className="field__ro">{(value ?? []).join(', ') || '—'}</span>
      )}
    </label>
  );
}

function StepEditor({
  step,
  onChange,
  onRemove,
}: {
  step: Step;
  onChange: (s: Step) => void;
  onRemove: () => void;
}) {
  return (
    <span className="grow stepedit">
      <input
        type="text"
        value={step.text}
        onChange={(e) => onChange({ ...step, text: e.target.value })}
      />
      <input
        type="text"
        style={{ width: 100 }}
        value={step.owner}
        onChange={(e) => onChange({ ...step, owner: e.target.value })}
      />
      <input
        type="date"
        value={step.due}
        onChange={(e) => onChange({ ...step, due: e.target.value })}
      />
      <button className="danger" onClick={onRemove}>
        ×
      </button>
    </span>
  );
}

function numStr(n: number | null | undefined): string {
  return n == null ? '' : String(n);
}
function numOrNull(v: string): number | null {
  const t = v.trim();
  if (t === '') return null;
  const n = Number(t);
  return isNaN(n) ? null : n;
}
