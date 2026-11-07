import { Link, NavLink, useLocation, type LinkProps, type NavLinkProps } from 'react-router-dom';
import { DEFAULT_LOCALE, getLocaleFromPath, localizePath } from '../lib/locales';

// Internal links must keep the current locale prefix: on the Hindi site,
// `/about` links to `/hi/about`. The locale is read from the URL, so adding
// a locale needs no changes here. External URLs and objects pass through.
function useLocalizedTo(to: LinkProps['to']): LinkProps['to'] {
  const { pathname } = useLocation();
  if (typeof to !== 'string') return to;
  const locale = getLocaleFromPath(pathname) ?? DEFAULT_LOCALE;
  return localizePath(to, locale);
}

export function LocalizedLink({ to, ...rest }: LinkProps) {
  return <Link to={useLocalizedTo(to)} {...rest} />;
}

export function LocalizedNavLink({ to, ...rest }: NavLinkProps) {
  return <NavLink to={useLocalizedTo(to)} {...rest} />;
}
