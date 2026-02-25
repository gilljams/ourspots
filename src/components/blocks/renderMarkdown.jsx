import React, { useState } from 'react';
import { Check, Copy } from 'lucide-react';

// Copyable code block component with touch support
const CodeBlockCopyable = ({ code }) => {
  const [copied, setCopied] = useState(false);
  
  const handleCopy = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    try {
      // Try modern clipboard API first
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(code);
      } else {
        // Fallback for older browsers/mobile
        const textArea = document.createElement('textarea');
        textArea.value = code;
        textArea.style.position = 'fixed';
        textArea.style.left = '-9999px';
        textArea.style.top = '-9999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };
  
  return (
    <pre 
      className="bg-black/40 border border-white/10 rounded-lg p-3 my-2 overflow-x-auto cursor-pointer hover:bg-black/50 active:bg-black/60 transition-colors group relative touch-manipulation"
      onClick={handleCopy}
      onTouchEnd={handleCopy}
    >
      <code className="text-sm font-mono text-blue-400 whitespace-pre">
        {code}
      </code>
      <span className={`absolute top-2 right-2 flex items-center gap-1 text-xs transition-all ${copied ? 'text-green-400 opacity-100 scale-110' : 'text-gray-400 opacity-70 sm:opacity-0 sm:group-hover:opacity-100'}`}>
        {copied ? (
          <Check size={16} />
        ) : (
          <Copy size={16} />
        )}
      </span>
    </pre>
  );
};

// Lightweight markdown renderer - supports **bold**, *italic*, [links](url), > quotes, # headings, - bullets, numbered lists
export const renderMarkdown = (text) => {
  if (!text) return null;
  
  const lines = text.split('\n');
  const elements = [];
  let listItems = [];
  let listType = null; // 'ul' or 'ol'
  let quoteLines = []; // For multi-line quotes
  let codeBlockLines = []; // For code blocks
  let inCodeBlock = false;
  
  const flushList = () => {
    if (listItems.length > 0) {
      if (listType === 'ol') {
        elements.push(
          <ol key={`ol-${elements.length}`} className="list-decimal list-inside space-y-1 my-2">
            {listItems}
          </ol>
        );
      } else {
        elements.push(
          <ul key={`ul-${elements.length}`} className="list-disc list-inside space-y-1 my-2">
            {listItems}
          </ul>
        );
      }
      listItems = [];
      listType = null;
    }
  };
  
  const flushQuote = () => {
    if (quoteLines.length > 0) {
      elements.push(
        <blockquote key={`quote-${elements.length}`} className="border-l-2 border-blue-500/50 pl-3 my-2 text-gray-400 italic">
          {quoteLines.map((line, i) => <p key={i}>{formatInline(line)}</p>)}
        </blockquote>
      );
      quoteLines = [];
    }
  };
  
  const flushCodeBlock = () => {
    if (codeBlockLines.length > 0) {
      const codeContent = codeBlockLines.join('\n');
      elements.push(
        <CodeBlockCopyable key={`code-${elements.length}`} code={codeContent} />
      );
      codeBlockLines = [];
    }
  };
  
  const formatInline = (line) => {
    // Process links, bold and italic
    const parts = [];
    let remaining = line;
    let keyIndex = 0;
    
    while (remaining.length > 0) {
      // Check for [link](url)
      const linkMatch = remaining.match(/\[([^\]]+)\]\(([^)]+)\)/);
      // Check for **bold**
      const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
      // Check for *italic* (but not **)
      const italicMatch = remaining.match(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/);
      // Check for ~~strikethrough~~
      const strikeMatch = remaining.match(/~~(.+?)~~/);
      // Check for `inline code`
      const codeMatch = remaining.match(/`([^`]+)`/);      
      // Find the first match
      let firstMatch = null;
      let matchType = null;
      let matchIndex = Infinity;
      
      if (linkMatch && linkMatch.index < matchIndex) {
        firstMatch = linkMatch;
        matchType = 'link';
        matchIndex = linkMatch.index;
      }
      if (boldMatch && boldMatch.index < matchIndex) {
        firstMatch = boldMatch;
        matchType = 'bold';
        matchIndex = boldMatch.index;
      }
      if (italicMatch && italicMatch.index < matchIndex) {
        firstMatch = italicMatch;
        matchType = 'italic';
        matchIndex = italicMatch.index;
      }
      if (strikeMatch && strikeMatch.index < matchIndex) {
        firstMatch = strikeMatch;
        matchType = 'strike';
        matchIndex = strikeMatch.index;
      }
      if (codeMatch && codeMatch.index < matchIndex) {
        firstMatch = codeMatch;
        matchType = 'code';
        matchIndex = codeMatch.index;
      }
      
      if (firstMatch) {
        // Add text before match
        if (firstMatch.index > 0) {
          parts.push(remaining.substring(0, firstMatch.index));
        }
        // Add formatted text
        if (matchType === 'link') {
          // Ensure URL is absolute
          let url = firstMatch[2];
          if (!/^https?:\/\//i.test(url)) {
            url = 'https://' + url;
          }
          parts.push(
            <a 
              key={keyIndex++} 
              href={url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 underline"
            >
              {firstMatch[1]}
            </a>
          );
        } else if (matchType === 'bold') {
          parts.push(<strong key={keyIndex++} className="font-semibold text-white">{firstMatch[1]}</strong>);
        } else if (matchType === 'strike') {
          parts.push(<del key={keyIndex++} className="line-through text-gray-500">{firstMatch[1]}</del>);
        } else if (matchType === 'code') {
          parts.push(<code key={keyIndex++} className="px-1.5 py-0.5 rounded bg-white/10 text-amber-300 text-[0.85em] font-mono">{firstMatch[1]}</code>);
        } else {
          parts.push(<em key={keyIndex++} className="italic text-gray-300">{firstMatch[1]}</em>);
        }
        remaining = remaining.substring(firstMatch.index + firstMatch[0].length);
      } else {
        parts.push(remaining);
        break;
      }
    }
    
    return parts.length > 0 ? parts : line;
  };
  
  lines.forEach((line, index) => {
    // Check for code block start/end (```)
    if (line.trim().startsWith('```')) {
      if (inCodeBlock) {
        // End of code block
        flushCodeBlock();
        inCodeBlock = false;
      } else {
        // Start of code block
        flushList();
        flushQuote();
        inCodeBlock = true;
      }
      return; // Skip the ``` line itself
    }
    
    // If inside code block, just collect lines
    if (inCodeBlock) {
      codeBlockLines.push(line);
      return;
    }
    
    // Check for horizontal rule (--- or ___ or ***)
    if (/^[-_*]{3,}\s*$/.test(line.trim())) {
      flushList();
      flushQuote();
      elements.push(<hr key={`hr-${index}`} className="border-t border-white/10 my-3" />);
      return;
    }
    
    // Check for quote (> )
    const quoteMatch = line.match(/^>\s*(.*)/);
    // Check for H1 heading (# )
    const h1Match = line.match(/^#\s+(.+)/);
    // Check for H2 heading (## )
    const h2Match = line.match(/^##\s+(.+)/);
    // Check for bullet list (- or *)
    const bulletMatch = line.match(/^\s*[-*]\s+(.+)/);
    // Check for numbered list (1. 2. etc)
    const numberedMatch = line.match(/^\s*\d+\.\s+(.+)/);
    
    if (quoteMatch) {
      flushList();
      quoteLines.push(quoteMatch[1]);
    } else if (h2Match) {
      flushList();
      flushQuote();
      const isFirst = elements.length === 0;
      elements.push(<h3 key={`h2-${index}`} className={`text-base font-semibold text-white ${isFirst ? '' : 'mt-3'} mb-1`}>{formatInline(h2Match[1])}</h3>);
    } else if (h1Match) {
      flushList();
      flushQuote();
      const isFirst = elements.length === 0;
      elements.push(<h2 key={`h1-${index}`} className={`text-lg font-bold text-white ${isFirst ? '' : 'mt-4'} mb-2`}>{formatInline(h1Match[1])}</h2>);
    } else if (bulletMatch) {
      flushQuote();
      if (listType !== 'ul') flushList();
      listType = 'ul';
      listItems.push(<li key={`li-${index}`} className="text-gray-200">{formatInline(bulletMatch[1])}</li>);
    } else if (numberedMatch) {
      flushQuote();
      if (listType !== 'ol') flushList();
      listType = 'ol';
      listItems.push(<li key={`li-${index}`} className="text-gray-200">{formatInline(numberedMatch[1])}</li>);
    } else {
      flushList();
      flushQuote();
      if (line.trim() === '') {
        elements.push(<div key={`br-${index}`} className="h-2" />);
      } else {
        elements.push(<p key={`p-${index}`} className="text-gray-200">{formatInline(line)}</p>);
      }
    }
  });
  
  flushList();
  flushQuote();
  flushCodeBlock(); // In case code block wasn't closed
  return elements;
};
