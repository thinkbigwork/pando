import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from './firebase';
import { useAuth } from './auth/AuthContext';
import { useItems } from './data/useItems';
import { LanguageSwitcher } from './components/LanguageSwitcher';
import { AdminUsers } from './components/AdminUsers';
import { AppShell } from './app/AppShell';
import { SummaryView } from './views/SummaryView';
import { SAMPLE_SEEDS } from './seeds/sampleSeeds';
import type { Role } from '@pando/shared';
import type { ItemWithId } from './tree/model';

/** Pantalla de inicio por rol (ver "Usabilidad" en docs/01-producto.md). */
function homeFor(role: Role): { view: 'tree' | 'board' | 'list' | 'agenda'; mine: boolean } {
  switch (role) {
    case 'vendedor':
      return { view: 'list', mine: true }; // "Mis oportunidades" por deadline
    case 'colaborador':
      return { view: 'agenda', mine: true }; // "Mis pasos"
    default:
      return { view: 'tree', mine: false }; // CEO/cofounder/chief/pm/advisor
  }
}

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

function AccessMessage({ titleKey, bodyKey }: { titleKey: string; bodyKey: string }) {
  const { t } = useTranslation();
  const { firebaseUser } = useAuth();
  return (
    <div className="brand-screen">
      <div className="glass-card">
        <Brand />
        <h2>{t(titleKey)}</h2>
        <p className="muted">{t(bodyKey)}</p>
        {firebaseUser?.email && <p className="muted">{firebaseUser.email}</p>}
      </div>
    </div>
  );
}

/** App con sesión y rol. El visitante ve el resumen; el resto, el árbol y sus
 * vistas con la pantalla de inicio de su rol. */
function ReadyApp() {
  const { t } = useTranslation();
  const { firebaseUser, role, signOut } = useAuth();
  const { items, loading, error } = useItems(role != null && role !== 'visitante');
  const [showAdmin, setShowAdmin] = useState(false);

  if (!role) return <Loading />;

  // El visitante no lee `items`: solo `public/summary`.
  if (role === 'visitante') {
    return <SummaryView onSignOut={() => void signOut()} />;
  }

  if (showAdmin) {
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

  const home = homeFor(role);
  return (
    <AppShell
      items={items}
      loading={loading}
      error={error}
      role={role}
      currentUid={firebaseUser?.uid ?? null}
      displayName={firebaseUser?.displayName ?? firebaseUser?.email ?? ''}
      initialView={home.view}
      initialMine={home.mine}
      onSignOut={() => void signOut()}
      onManageUsers={() => setShowAdmin(true)}
    />
  );
}

/** Modo muestra (solo en desarrollo, con ?sample): renderiza el árbol con los
 * datos semilla, sin autenticación, para revisar la vista. */
function SampleApp() {
  const [items, setItems] = useState<ItemWithId[]>([]);
  useEffect(() => {
    void import('../../seed/items.json').then((mod) => {
      const data = mod.default as unknown as Record<string, Record<string, unknown>>;
      setItems(Object.entries(data).map(([id, it]) => ({ id, ...it }) as unknown as ItemWithId));
    });
  }, []);
  const param = new URLSearchParams(window.location.search).get('role');
  const role: Role = (param as Role) || 'ceo';
  if (role === 'visitante') return <SummaryView />;
  const home = homeFor(role);
  return (
    <AppShell
      items={items}
      loading={items.length === 0}
      error={null}
      role={role}
      currentUid={null}
      displayName="Muestra"
      initialView={home.view}
      initialMine={home.mine}
      sampleSeeds={SAMPLE_SEEDS}
    />
  );
}

export default function App() {
  const { status } = useAuth();

  if (import.meta.env.DEV && new URLSearchParams(window.location.search).has('sample')) {
    return <SampleApp />;
  }

  if (status === 'ready') return <ReadyApp />;

  return (
    <>
      <TopBar />
      {status === 'loading' && <Loading />}
      {status === 'signed-out' && <SignIn />}
      {status === 'pending' && (
        <AccessMessage titleKey="access.pendingTitle" bodyKey="access.pendingBody" />
      )}
      {status === 'no-access' && (
        <AccessMessage titleKey="access.noAccessTitle" bodyKey="access.noAccessBody" />
      )}
    </>
  );
}
