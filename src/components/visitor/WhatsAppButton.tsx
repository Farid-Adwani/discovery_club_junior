import React from 'react';
import { useT } from '../../i18n';
import { visitorMessages } from '../../i18n/messages/visitor';
import { whatsappLink } from '../../data/siteContent';

/** WhatsApp logo (lucide has none) */
export const WhatsAppIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
    <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.9 9.9 0 0 0 4.74 1.21h.01c5.46 0 9.9-4.45 9.9-9.91A9.85 9.85 0 0 0 12.04 2Zm0 18.15h-.01a8.23 8.23 0 0 1-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.2 8.2 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.25-8.24a8.2 8.2 0 0 1 8.24 8.25c0 4.54-3.7 8.23-8.24 8.23Zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.13-.16.24-.64.8-.78.97-.15.16-.29.18-.54.06-.25-.12-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.01-.38.11-.5.11-.11.25-.29.37-.43.13-.15.17-.25.25-.41.08-.17.04-.31-.02-.43-.06-.13-.56-1.34-.76-1.84-.2-.48-.41-.42-.56-.42h-.48a.92.92 0 0 0-.66.31c-.23.25-.87.85-.87 2.07 0 1.22.89 2.4 1.01 2.56.12.17 1.75 2.67 4.24 3.74.59.26 1.05.41 1.41.52.6.19 1.13.16 1.56.1.48-.07 1.47-.6 1.67-1.18.21-.58.21-1.07.15-1.18-.06-.1-.22-.16-.47-.28Z" />
  </svg>
);

/** Floating "chat with us" button, shown on public pages once a WhatsApp number is set in siteContent. */
export const WhatsAppButton: React.FC = () => {
  const t = useT(visitorMessages);
  const href = whatsappLink(t('whatsappHello'));
  if (!href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={t('whatsappFloat')}
      title={t('whatsappFloat')}
      className="fixed bottom-5 end-5 z-40 grid place-items-center w-14 h-14 rounded-full bg-[#25d366] text-white shadow-[0_10px_30px_-6px_rgba(37,211,102,0.7)] hover:scale-105 transition-transform"
    >
      <WhatsAppIcon className="w-7 h-7" />
    </a>
  );
};
