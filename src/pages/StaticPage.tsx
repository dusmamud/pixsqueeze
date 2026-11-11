import { useTranslation } from 'react-i18next';

export function Prose({ titleKey, paras }: { titleKey: string; paras: string[] }) {
  const { t } = useTranslation();
  return (
    // `prose` owns the paragraph rhythm now (margins + line-height are the
    // plugin's tuned defaults); colours stay the app's tokens via the
    // .prose override in index.css, and the heading keeps the design's
    // 500 weight and responsive size through the element modifiers.
    <article className="prose mx-auto py-10 prose-headings:font-medium prose-h1:text-3xl sm:prose-h1:text-4xl">
      <h1>{t(titleKey)}</h1>
      {paras.map((k, i) => <p key={i}>{t(k)}</p>)}
    </article>
  );
}
export function AboutPage() { return <Prose titleKey="aboutTitle" paras={['aboutP1', 'aboutP2', 'aboutP3']} />; }
export function PrivacyPage() { return <Prose titleKey="privacyTitle" paras={['privacyP1', 'privacyP2', 'privacyP3']} />; }
export function TermsPage() { return <Prose titleKey="termsTitle" paras={['termsP1', 'termsP2', 'termsP3']} />; }
export function FaqPage() {
  const { t } = useTranslation();
  const items = [['faqQ1', 'faqA1'], ['faqQ2', 'faqA2'], ['faqQ3', 'faqA3'], ['faqQ4', 'faqA4']] as const;
  return (
    <article className="mx-auto max-w-3xl py-10">
      <h1 className="text-3xl font-medium sm:text-4xl">{t('faqTitle')}</h1>
      <div className="mt-6 space-y-4">
        {items.map(([q, a]) => (
          <section key={q} className="card p-5">
            <h2 className="font-semibold">{t(q)}</h2>
            <p className="muted mt-2 leading-relaxed">{t(a)}</p>
          </section>
        ))}
      </div>
    </article>
  );
}
