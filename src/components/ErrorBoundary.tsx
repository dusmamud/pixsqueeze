import { Component, type ReactNode } from 'react';
import { TriangleAlert } from 'lucide-react';
import i18n from '../lib/i18n';

interface Props { children: ReactNode }
interface State { hasError: boolean }

/** Last-resort guard: if a component crashes during render, show a
 * friendly screen with a reload instead of a blank page. */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(err: unknown) {
    console.error('[imgcompressor] render crash', err);
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div className="mx-auto max-w-xl px-4 py-16">
        <div className="card p-6 text-center" role="alert">
          <TriangleAlert size={28} className="mx-auto" style={{ color: 'var(--danger)' }} aria-hidden="true" />
          <h1 className="mt-4 text-xl font-medium">{i18n.t('errCrashTitle')}</h1>
          <p className="muted mt-2 text-sm leading-relaxed">{i18n.t('errCrashText')}</p>
          <button className="btn-primary mt-5" onClick={() => window.location.reload()}>
            {i18n.t('reload')}
          </button>
        </div>
      </div>
    );
  }
}
