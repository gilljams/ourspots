import React, { useState } from 'react';
import { X, ArrowUp, ArrowDown, ChevronDown, BarChart3, Calendar, Trophy, Plus } from 'lucide-react';
import { useConfirm } from '../../utils/useConfirm';

// Poll block editor component - for admin to create poll options
function PollBlockEditor({ block, onUpdate, onRemove, onMove, index, total, saving }) {
  const [title, setTitle] = useState(block.title || '');
  const [pollType, setPollType] = useState(block.pollType || 'date');
  const [options, setOptions] = useState(block.options || []);
  const [allowSuggestions, setAllowSuggestions] = useState(block.allowSuggestions || false);
  const [defaultCollapsed, setDefaultCollapsed] = useState(block.defaultCollapsed ?? false);
  const [isExpanded, setIsExpanded] = useState(false);
  const confirm = useConfirm();

  // Use refs to always have latest values
  const titleRef = React.useRef(title);
  const optionsRef = React.useRef(options);
  const pollTypeRef = React.useRef(pollType);
  titleRef.current = title;
  optionsRef.current = options;
  pollTypeRef.current = pollType;

  const syncToParent = (newTitle, newOptions, newVotes = block.votes || {}, newPollType = pollType, newClosed = block.closed || false, newAllowSuggestions = allowSuggestions, newDefaultCollapsed = defaultCollapsed) => {
    titleRef.current = newTitle;
    optionsRef.current = newOptions;
    pollTypeRef.current = newPollType;
    onUpdate(block.id, { title: newTitle, options: newOptions, votes: newVotes, pollType: newPollType, closed: newClosed, allowSuggestions: newAllowSuggestions, defaultCollapsed: newDefaultCollapsed });
  };

  const handleDefaultCollapsedChange = (value) => {
    setDefaultCollapsed(value);
    syncToParent(title, options, block.votes || {}, pollType, block.closed || false, allowSuggestions, value);
  };

  const handleAllowSuggestionsChange = (value) => {
    setAllowSuggestions(value);
    syncToParent(title, options, block.votes || {}, pollType, block.closed || false, value);
  };

  const handlePollTypeChange = async (newType) => {
    if (voteCount > 0) {
      if (!await confirm({ title: 'Byta typ?', message: 'Att byta typ nollställer alla röster.', confirmText: 'Byt typ', variant: 'warning' })) {
        return;
      }
    }
    setPollType(newType);
    // Reset votes when changing type as vote formats differ
    syncToParent(title, options, {}, newType, false);
  };

  const voteCount = Object.keys(block.votes || {}).length;

  const addOption = () => {
    const newOpt = {
      id: Math.random().toString(36).substr(2, 9),
      label: '',
      ...(pollType === 'ranked' ? { url: '' } : {})
    };
    const newOptions = [...options, newOpt];
    setOptions(newOptions);
    syncToParent(title, newOptions);
    
    // Focus on the new option's label input
    setTimeout(() => {
      const input = document.querySelector(`[data-poll-label="${newOpt.id}"]`);
      if (input) input.focus();
    }, 10);
  };
  
  // Handle Enter key navigation like in table blocks
  const handleOptionKeyDown = (e, optionId, field) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    
    const optionIndex = options.findIndex(opt => opt.id === optionId);
    const isLastOption = optionIndex === options.length - 1;
    
    if (pollType === 'ranked') {
      // For ranked polls: label -> url -> next label (or add new)
      if (field === 'label') {
        // Go to URL field for this option
        const urlInput = document.querySelector(`[data-poll-url="${optionId}"]`);
        if (urlInput) urlInput.focus();
      } else if (field === 'url') {
        // Go to next option's label, or add new option
        if (isLastOption) {
          addOption();
        } else {
          const nextLabel = document.querySelector(`[data-poll-label="${options[optionIndex + 1].id}"]`);
          if (nextLabel) nextLabel.focus();
        }
      }
    } else {
      // For date polls: label -> next label (or add new)
      if (isLastOption) {
        addOption();
      } else {
        const nextLabel = document.querySelector(`[data-poll-label="${options[optionIndex + 1].id}"]`);
        if (nextLabel) nextLabel.focus();
      }
    }
  };

  const updateOption = (optionId, updates) => {
    const newOptions = options.map(opt => 
      opt.id === optionId ? { ...opt, ...updates } : opt
    );
    setOptions(newOptions);
    optionsRef.current = newOptions;
  };

  const syncOption = () => {
    syncToParent(titleRef.current, optionsRef.current);
  };

  const removeOption = (optionId) => {
    const newOptions = options.filter(opt => opt.id !== optionId);
    setOptions(newOptions);
    syncToParent(title, newOptions);
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
          <BarChart3 size={16} className="text-blue-400 flex-shrink-0" />
          <span className="text-sm font-medium text-gray-300 truncate">
            {title || 'Omröstning'}
          </span>
          {options.length > 0 && (
            <span className="text-xs text-gray-500 flex-shrink-0">({options.length} alt)</span>
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
        <div className="px-3 pb-3 space-y-3">
          {/* Poll type selector */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => handlePollTypeChange('date')}
              className={`flex-1 px-3 py-2 rounded-lg text-sm transition-colors ${
                pollType === 'date' 
                  ? 'bg-blue-500/20 text-blue-400 ring-1 ring-blue-500/50' 
                  : 'bg-white/5 text-gray-400 hover:bg-white/10'
              }`}
            >
              <Calendar size={14} className="inline mr-1" />Datum/tid
            </button>
            <button
              type="button"
              onClick={() => handlePollTypeChange('ranked')}
              className={`flex-1 px-3 py-2 rounded-lg text-sm transition-colors ${
                pollType === 'ranked' 
                  ? 'bg-blue-500/20 text-blue-400 ring-1 ring-blue-500/50' 
                  : 'bg-white/5 text-gray-400 hover:bg-white/10'
              }`}
            >
              <Trophy size={14} className="inline mr-1" />Rankning
            </button>
          </div>
          
          {/* Poll title */}
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Fråga</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() => syncToParent(title, options)}
              placeholder={pollType === 'ranked' ? "Fråga (t.ex. 'Bästa pizzerian?')" : "Fråga (t.ex. 'När passar helgen?')"}
              disabled={saving}
              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-base placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Options list */}
          {options.length > 0 && (
            <div className="space-y-2">
              {options.map((option, i) => (
                <div key={option.id} className="flex items-start gap-2">
                  <span className="text-gray-500 text-sm w-5 pt-2.5">{i + 1}.</span>
                  <div className="flex-1 space-y-1">
                    <input
                      type="text"
                      data-poll-label={option.id}
                      value={option.label}
                      onChange={(e) => updateOption(option.id, { label: e.target.value })}
                      onBlur={syncOption}
                      onKeyDown={(e) => handleOptionKeyDown(e, option.id, 'label')}
                      placeholder={pollType === 'ranked' ? "Alternativ (t.ex. 'Pizzeria X')" : "Alternativ (t.ex. '1-3 maj')"}
                      disabled={saving}
                      className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-base placeholder-gray-500 focus:outline-none focus:border-blue-500"
                    />
                    {/* URL field for ranked polls */}
                    {pollType === 'ranked' && (
                      <input
                        type="text"
                        data-poll-url={option.id}
                        value={option.url || ''}
                        onChange={(e) => updateOption(option.id, { url: e.target.value })}
                        onBlur={syncOption}
                        onKeyDown={(e) => handleOptionKeyDown(e, option.id, 'url')}
                        placeholder="www.example.com"
                        disabled={saving}
                        className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-blue-400 text-base placeholder-gray-500 focus:outline-none focus:border-blue-500"
                      />
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeOption(option.id)}
                    className="w-8 h-8 mt-1 flex-shrink-0 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 flex items-center justify-center"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Add option button */}
          <div>
            {options.length === 0 && allowSuggestions && (
              <p className="text-xs text-emerald-400/80 flex items-center gap-1.5 mb-2">
                <span className="text-emerald-400">✓</span>
                Deltagare kan föreslå egna alternativ
              </p>
            )}
            <button
              type="button"
              onClick={addOption}
              disabled={saving}
              className="py-1.5 px-3 text-sm text-blue-400 hover:bg-blue-500/10 rounded-lg flex items-center gap-1.5 transition-colors border border-blue-500/20"
            >
              <Plus size={14} />
              Lägg till alternativ
            </button>
          </div>

          {/* Instructions */}
          <p className="text-xs text-gray-500">
            {pollType === 'ranked' 
              ? 'Deltagare röstar 1:a, 2:a, 3:a (3p, 2p, 1p)' 
              : 'Deltagare kan rösta Ja/Nej/Kanske'}
          </p>

          {/* Allow suggestions toggle */}
          <div className="flex items-center justify-between py-2">
            <span className="text-xs text-gray-400">Tillåt förslag</span>
            <button
              type="button"
              onClick={() => handleAllowSuggestionsChange(!allowSuggestions)}
              className={`relative w-10 h-5 rounded-full transition-colors ${
                allowSuggestions ? 'bg-blue-500' : 'bg-gray-600'
              }`}
            >
              <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                allowSuggestions ? 'translate-x-5' : 'translate-x-0.5'
              }`} />
            </button>
          </div>

          {/* Default collapsed toggle */}
          <div className="flex items-center justify-between py-2">
            <span className="text-xs text-gray-400">Ihopfälld som standard</span>
            <button
              type="button"
              onClick={() => handleDefaultCollapsedChange(!defaultCollapsed)}
              className={`relative w-10 h-5 rounded-full transition-colors ${
                defaultCollapsed ? 'bg-blue-500' : 'bg-gray-600'
              }`}
            >
              <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                defaultCollapsed ? 'translate-x-5' : 'translate-x-0.5'
              }`} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export { PollBlockEditor };
export default PollBlockEditor;
