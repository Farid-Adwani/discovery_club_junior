import React from 'react';
import { useApp } from '../../context/AppContext';
import { PAGE_PATHS, type PublicPage } from '../../utils/routes';

/** A plain left click (not Ctrl/Cmd/Shift/middle click, which should open a new tab as usual) */
export const isPlainClick = (e: React.MouseEvent) => !e.defaultPrevented && e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey;

type Props = Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & {
  page: PublicPage;
  /** Runs before the page opens (e.g. to close a menu) */
  onNavigate?: () => void;
};

/**
 * A real link to a public page: search engines follow it and it opens in a new tab like any link,
 * while a normal click opens the page inside the app without reloading.
 */
export const PageLink: React.FC<Props> = ({ page, onNavigate, onClick, children, ...rest }) => {
  const { navigateTo } = useApp();
  return (
    <a
      href={PAGE_PATHS[page]}
      onClick={(e) => {
        onClick?.(e);
        if (!isPlainClick(e)) return;
        e.preventDefault();
        onNavigate?.();
        navigateTo(page);
      }}
      {...rest}
    >
      {children}
    </a>
  );
};
