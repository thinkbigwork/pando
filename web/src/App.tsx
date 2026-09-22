import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { signInWithPopup } from 'firebase/auth';
import { ADMIN_ROLES } from '@pando/shared';
import { auth, googleProvider } from './firebase';
import { useAuth } from './auth/AuthContext';
import { LanguageSwitcher } from './components/LanguageSwitcher';
import { AdminUsers } from './components/AdminUsers';

const WORKSPACE_DOMAIN = 'wizor.io';

function Brand() {
  const { t } = useTranslation();
  return (
    <div className="brand">
      <img className="brand__logo" src="/brand/wizor-logo-white.png" alt="Wizor" />
      <span className="brand__product">{t('app.name')}</span>
      <p className="muted">{t('app.tagline')}</p>
    </div>
  );
}

function TopBar() {
  const { t } = useTranslation();
  const { status, signOut } = useAuth();
  return (
    <div className="topbar">
      <LanguageSwitcher />
      {status !== 'signed-out' && status !== 'loading' && (
        <button onClick={() => void signOut()}>{t('auth.signOut')}</button>
      )}
    </div>
  );
}

function SignIn() {
  const { t } = useTranslation();
  return (
    <div className="brand-screen">
      <div className="glass-card">
        <Brand />
        <h2>{t('auth.welcome')}</h2>
        <p className="muted">{t('auth.signInHint', { domain: WORKSPACE_DOMAIN })}</p>
        <button className="primary" onClick={() => void signInWithPopup(auth, googleProvider)}>
          {t('auth.signInWithGoogle')}
        </button>
      </div>
    </div>
  );
}

function Loading() {
  const { t } = useTranslation();
  return (
    <div className="brand-screen">
      <p className="muted">{t('auth.loading')}</p>
    </div>
  );
}

function AccessPending() {
  const { t } = useTranslation();
  const { firebaseUser } = useAuth();
  return (
    <div className="brand-screen">
      <div className="glass-card">
        <Brand />
        <h2>{t('access.pendingTitle')}</h2>
        <p className="muted">{t('access.pendingBody')}</p>
        {firebaseUser?.email && <p className="muted">{firebaseUser.email}</p>}
      </div>
    </div>
  );
}

function NoAccess() {
  const { t } = useTranslation();
  const { firebaseUser } = useAuth();
  return (
    <div className="brand-screen">
      <div className="glass-card">
        <Brand />
        <h2>{t('access.noAccessTitle')}</h2>
        <p className="muted">{t('access.noAccessBody')}</p>
        {firebaseUser?.email && <p className="muted">{firebaseUser.email}</p>}
      </div>
    </div>
  );
}

/**
 * Pantalla de inicio vacía del Sprint 0: solo confirma sesión y rol.
 * Las pantallas de inicio por rol y el árbol llegan en el Sprint 1.
 */
function Home() {
  const { t } = useTranslation();
  const { firebaseUser, role } = useAuth();
  const [showAdmin, setShowAdmin] = useState(false);
  const isAdmin = role != null && ADMIN_ROLES.includes(role);

  if (isAdmin && showAdmin) {
    return (
      <div className="brand-screen">
        <div className="glass-card glass-card--wide">
          <Brand />
          <AdminUsers />
          <button onClick={() => setShowAdmin(false)}>{t('home.back')}</button>
        </div>
      </div>
    );
  }

  return (
    <div className="brand-screen">
      <div className="glass-card">
        <Brand />
        <p className="muted">{t('home.signedInAs')}</p>
        <p>
          <strong>{firebaseUser?.displayName ?? firebaseUser?.email}</strong>
        </p>
        <p className="muted">{t('home.yourRole')}</p>
        {role && <p className="role-badge">{t(`role.${role}`)}</p>}
        <hr className="divider" />
        <h2>{t('home.emptyTitle')}</h2>
        <p className="muted">{t('home.emptyBody')}</p>
        {isAdmin && (
          <button className="primary" onClick={() => setShowAdmin(true)}>
            {t('home.manageUsers')}
          </button>
        )}
      </div>
    </div>
  );
}

export default function App() {
  const { status } = useAuth();

  return (
    <>
      <TopBar />
      {status === 'loading' && <Loading />}
      {status === 'signed-out' && <SignIn />}
      {status === 'pending' && <AccessPending />}
      {status === 'no-access' && <NoAccess />}
      {status === 'ready' && <Home />}
    </>
  );
}
