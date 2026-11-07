import { useTranslation } from 'react-i18next';
import { LocalizedLink } from '../components/LocalizedLink';

export default function NotFoundPage() {
  const { t } = useTranslation();
  return (
    <div className="py-20 text-center">
      <h1 className="text-4xl font-medium">404</h1>
      <p className="mt-2 text-lg font-semibold">{t('notFoundTitle')}</p>
      <p className="muted mt-1">{t('notFoundSub')}</p>
      <LocalizedLink to="/" className="btn-primary mt-6 inline-block">{t('backHome')}</LocalizedLink>
    </div>
  );
}
