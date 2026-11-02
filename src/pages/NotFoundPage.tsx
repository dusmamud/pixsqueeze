import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export default function NotFoundPage() {
  const { t } = useTranslation();
  return (
    <div className="py-20 text-center">
      <h1 className="text-4xl font-extrabold">404</h1>
      <p className="mt-2 text-lg font-semibold">{t('notFoundTitle')}</p>
      <p className="muted mt-1">{t('notFoundSub')}</p>
      <Link to="/" className="btn-primary mt-6 inline-block">{t('backHome')}</Link>
    </div>
  );
}
