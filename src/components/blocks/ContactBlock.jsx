import React from 'react';

// Contact block - compact display of phone, email, website
export const ContactBlock = ({ data }) => {
  const { phone, email, website } = data || {};
  const hasAny = phone || email || website;
  
  if (!hasAny) {
    return <div className="text-sm text-gray-500">Ingen kontaktinfo</div>;
  }
  
  // Ensure website has protocol
  const websiteUrl = website && !/^https?:\/\//i.test(website) ? 'https://' + website : website;
  // Clean phone for tel: link
  const phoneClean = phone ? phone.replace(/\s/g, '') : '';
  
  return (
    <div className="flex flex-wrap items-center gap-3">
      {phone && (
        <a
          href={`tel:${phoneClean}`}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-blue-500/20 text-gray-300 hover:text-blue-400 transition-all group"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-400">
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
          </svg>
          <span className="text-sm">{phone}</span>
        </a>
      )}
      {email && (
        <a
          href={`mailto:${email}`}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-blue-500/20 text-gray-300 hover:text-blue-400 transition-all group"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-400">
            <rect width="20" height="16" x="2" y="4" rx="2"/>
            <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
          </svg>
          <span className="text-sm truncate max-w-[180px]">{email}</span>
        </a>
      )}
      {website && (
        <a
          href={websiteUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center w-10 h-10 rounded-lg bg-white/5 hover:bg-blue-500/20 text-blue-400 hover:text-blue-300 transition-all"
          title={website.replace(/^https?:\/\//, '')}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <line x1="2" y1="12" x2="22" y2="12"/>
            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
          </svg>
        </a>
      )}
    </div>
  );
};
