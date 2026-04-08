import React from 'react';

// Simple scrollable code block – overscroll-behavior prevents scroll-chaining
// into the parent modal on mobile.
const CodeBlock = ({ code }) => (
  <pre
    className="bg-black/40 border border-white/10 rounded-lg p-3 my-2 overflow-x-auto text-sm font-mono text-blue-400 whitespace-pre"
    style={{ overscrollBehaviorX: 'contain', WebkitOverflowScrolling: 'touch' }}
  >
    {code}
  </pre>
);

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
  let tableRows = []; // For markdown tables
  
  const flushList = () => {
    if (listItems.length > 0) {
      if (listType === 'ol') {
        elements.push(
          <ol key={`ol-${elements.length}`} className="list-decimal list-outside pl-5 space-y-1 my-2">
            {listItems}
          </ol>
        );
      } else {
        elements.push(
          <ul key={`ul-${elements.length}`} className="list-disc list-outside pl-5 space-y-1 my-2">
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
        <CodeBlock key={`code-${elements.length}`} code={codeContent} />
      );
      codeBlockLines = [];
    }
  };

  const flushTable = () => {
    if (tableRows.length < 2) { tableRows = []; return; }
    const parseCells = (row) => row.replace(/^\|/, '').replace(/\|$/, '').split('|').map(c => c.trim());
    const headerCells = parseCells(tableRows[0]);
    // Skip separator row (index 1), rest are body rows
    const bodyRows = tableRows.slice(tableRows[1] && /^[\s|:-]+$/.test(tableRows[1]) ? 2 : 1);
    elements.push(
      <div key={`table-${elements.length}`} className="my-2 overflow-x-auto rounded-lg border border-white/10" style={{ overscrollBehaviorX: 'contain' }}>
        <table className="w-full text-sm text-left">
          <thead>
            <tr className="border-b border-white/15 bg-white/5">
              {headerCells.map((cell, i) => (
                <th key={i} className="px-3 py-2 font-semibold text-white whitespace-nowrap">{formatInline(cell)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {bodyRows.map((row, ri) => {
              const cells = parseCells(row);
              return (
                <tr key={ri} className="border-b border-white/5 last:border-b-0">
                  {headerCells.map((_, ci) => (
                    <td key={ci} className="px-3 py-2 text-gray-300">{formatInline(cells[ci] || '')}</td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
    tableRows = [];
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
    
    // Check for table row ( | ... | )
    if (/^\|/.test(line.trim())) {
      flushList();
      flushQuote();
      tableRows.push(line.trim());
      return;
    } else {
      flushTable();
    }

    // Check for quote (> )
    const quoteMatch = line.match(/^>\s*(.*)/);
    // Check for H3 heading (### )
    const h3Match = line.match(/^###\s+(.+)/);
    // Check for H2 heading (## )
    const h2Match = !h3Match && line.match(/^##\s+(.+)/);
    // Check for H1 heading (# )
    const h1Match = !h2Match && !h3Match && line.match(/^#\s+(.+)/);
    // Check for bullet list (- or *)
    const bulletMatch = line.match(/^\s*[-*]\s+(.+)/);
    // Check for numbered list (1. 2. etc)
    const numberedMatch = line.match(/^\s*\d+\.\s+(.+)/);
    
    if (quoteMatch) {
      flushList();
      quoteLines.push(quoteMatch[1]);
    } else if (h3Match) {
      flushList();
      flushQuote();
      const isFirst = elements.length === 0;
      elements.push(<h4 key={`h3-${index}`} className={`text-sm font-semibold text-gray-200 ${isFirst ? '' : 'mt-2'} mb-1`}>{formatInline(h3Match[1])}</h4>);
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
  flushTable();
  flushCodeBlock(); // In case code block wasn't closed
  return elements;
};
