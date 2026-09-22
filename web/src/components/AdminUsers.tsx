/**
 * Panel de admin de usuarios (CEO/cofounder): ver usuarios, asignar rol y
 * alias, e invitar por email. Escribe a través de callables que revalidan
 * permisos en el servidor. Ver docs/03-roadmap.md (Sprint 1).
 */

import { useEffect, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { collection, onSnapshot } from 'firebase/firestore';
import { ROLE_KEYS, type Role } from '@pando/shared';
import { db } from '../firebase';
import { inviteUser, setUserRole } from '../api/users';

interface Row {
  uid: string;
  email: string;
  displayName: string;
  role: Role;
}

export function AdminUsers() {
  const { t } = useTranslation();
  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<Role>('advisor');
  const [inviteMsg, setInviteMsg] = useState<string | null>(null);

  useEffect(() => {
    return onSnapshot(
      collection(db, 'users'),
      (snap) => {
        setRows(
          snap.docs.map((d) => {
            const data = d.data();
            return {
              uid: d.id,
              email: data.email ?? '',
              displayName: data.displayName ?? data.email ?? d.id,
              role: (data.role ?? 'pendiente') as Role,
            };
          }),
        );
      },
      (e) => setError(e.message),
    );
  }, []);

  async function changeRole(uid: string, role: Role) {
    setBusy(uid);
    setError(null);
    try {
      await setUserRole(uid, role);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function submitInvite(e: FormEvent) {
    e.preventDefault();
    setInviteMsg(null);
    setError(null);
    try {
      await inviteUser(inviteEmail.trim(), inviteRole);
      setInviteMsg(t('admin.inviteSent', { email: inviteEmail.trim() }));
      setInviteEmail('');
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <div className="admin">
      <h2>{t('admin.title')}</h2>

      <form className="admin__invite" onSubmit={submitInvite}>
        <h3>{t('admin.invite')}</h3>
        <div className="admin__inviteRow">
          <input
            type="email"
            required
            placeholder={t('admin.emailPlaceholder')}
            aria-label={t('admin.email')}
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
          />
          <select
            aria-label={t('admin.role')}
            value={inviteRole}
            onChange={(e) => setInviteRole(e.target.value as Role)}
          >
            {ROLE_KEYS.filter((r) => r !== 'pendiente').map((r) => (
              <option key={r} value={r}>
                {t(`role.${r}`)}
              </option>
            ))}
          </select>
          <button className="primary" type="submit">
            {t('admin.send')}
          </button>
        </div>
        {inviteMsg && <p className="admin__ok">{inviteMsg}</p>}
      </form>

      <h3>{t('admin.users')}</h3>
      {error && <p className="admin__error">{error}</p>}
      {rows.length === 0 ? (
        <p className="muted">{t('admin.noUsers')}</p>
      ) : (
        <ul className="admin__list">
          {rows.map((u) => (
            <li key={u.uid} className="admin__row">
              <div className="admin__who">
                <strong>{u.displayName}</strong>
                <span className="muted">{u.email}</span>
              </div>
              <select
                aria-label={t('admin.role')}
                disabled={busy === u.uid}
                value={u.role}
                onChange={(e) => void changeRole(u.uid, e.target.value as Role)}
              >
                {ROLE_KEYS.map((r) => (
                  <option key={r} value={r}>
                    {t(`role.${r}`)}
                  </option>
                ))}
              </select>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
