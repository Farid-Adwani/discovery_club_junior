import { useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { resolveSite, type Site } from '../../data/siteContent';
import { useLanguage, useT } from '../../i18n';
import { visitorMessages } from '../../i18n/messages/visitor';

/** The club's details (contact, address, FAQ…): the defaults with the changes made in Admin → Landing page */
export function useSite(): Site {
  const { landing } = useApp();
  return useMemo(() => resolveSite(landing.site), [landing.site]);
}

/** The public site's texts, with the wording changed in Admin → Landing page winning over the default one */
export function useLandingT() {
  const { landing } = useApp();
  const { lang } = useLanguage();
  const tDefault = useT(visitorMessages);
  return ((key, vars) => {
    const custom = landing.text?.[lang]?.[key];
    return custom ? custom.replace(/\{(\w+)\}/g, (m: string, name: string) => (vars && name in vars ? String(vars[name]) : m)) : tDefault(key, vars);
  }) as typeof tDefault;
}
