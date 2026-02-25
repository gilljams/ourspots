import React, { useState } from 'react';
import { X, ArrowUp, ArrowDown, ChevronDown, Phone, Mail, Globe } from 'lucide-react';

// Contact block editor component
function ContactBlockEditor({ block, onUpdate, onRemove, onMove, index, total, saving }) {
  const [phone, setPhone] = useState(block.phone || '');
  const [email, setEmail] = useState(block.email || '');
  const [website, setWebsite] = useState(block.website || '');
  const [isExpanded, setIsExpanded] = useState(false);

  // Use refs for blur handlers
  const phoneRef = React.useRef(phone);
  const emailRef = React.useRef(email);
  const websiteRef = React.useRef(website);
  phoneRef.current = phone;
  emailRef.current = email;
  websiteRef.current = website;

  const syncToParent = () => {
    onUpdate(block.id, { 
      phone: phoneRef.current, 
      email: emailRef.current, 
      website: websiteRef.current 
    });
  };

  // Summary for collapsed state
  const getSummary = () => {
    const parts = [];
    if (phone) parts.push(phone);
    if (email) parts.push(email);
    if (website) parts.push(website);
    return parts.length > 0 ? parts.join(' • ') : 'Ingen kontaktinfo';
  };

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 overflow-hidden">
      {/* Collapsible header */}
      <div className="flex items-center gap-2 p-3">
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 flex-1 min-w-0"
        >
          <ChevronDown 
            size={16} 
            className={`text-gray-500 transition-transform flex-shrink-0 ${isExpanded ? '' : '-rotate-90'}`} 
          />
          <Phone size={16} className="text-blue-400 flex-shrink-0" />
          <span className="text-sm font-medium text-gray-300 truncate">
            Kontaktinfo
          </span>
          {!isExpanded && (
            <span className="text-xs text-gray-500 truncate ml-1">
              {getSummary()}
            </span>
          )}
        </button>
        <div className="flex gap-1 flex-shrink-0">
          <button type="button" onClick={() => onMove(block.id, -1)} disabled={index === 0} className="w-7 h-7 rounded bg-white/5 text-gray-400 hover:bg-white/10 flex items-center justify-center disabled:opacity-30">
            <ArrowUp size={14} />
          </button>
          <button type="button" onClick={() => onMove(block.id, 1)} disabled={index === total - 1} className="w-7 h-7 rounded bg-white/5 text-gray-400 hover:bg-white/10 flex items-center justify-center disabled:opacity-30">
            <ArrowDown size={14} />
          </button>
          <button type="button" onClick={() => onRemove(block.id)} className="w-7 h-7 rounded bg-red-500/10 text-red-400 hover:bg-red-500/20 flex items-center justify-center">
            <X size={14} />
          </button>
        </div>
      </div>
      
      {/* Expandable content */}
      {isExpanded && (
      <div className="space-y-2 p-3 pt-0">
        <div className="flex items-center gap-2">
          <Phone size={16} className="text-blue-400 flex-shrink-0" />
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            onBlur={syncToParent}
            placeholder="Telefonnummer"
            disabled={saving}
            className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-base placeholder-gray-500 focus:outline-none focus:border-blue-500"
          />
        </div>
        <div className="flex items-center gap-2">
          <Mail size={16} className="text-blue-400 flex-shrink-0" />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onBlur={syncToParent}
            placeholder="E-postadress"
            disabled={saving}
            className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-base placeholder-gray-500 focus:outline-none focus:border-blue-500"
          />
        </div>
        <div className="flex items-center gap-2">
          <Globe size={16} className="text-blue-400 flex-shrink-0" />
          <input
            type="url"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            onBlur={syncToParent}
            placeholder="Hemsida (t.ex. example.com)"
            disabled={saving}
            className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-base placeholder-gray-500 focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>
      )}
    </div>
  );
}

export { ContactBlockEditor };
export default ContactBlockEditor;
