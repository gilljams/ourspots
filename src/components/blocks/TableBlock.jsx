import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Edit2, ExternalLink, Phone } from 'lucide-react';
import { getIconComponent } from '../../utils/iconHelpers';
import { TABLE_TEMPLATES } from './tableTemplates';

// Table Block - collapsible tables/lists with checkboxes, progress bars, template-based rendering
export const TableBlock = ({ data, objectId, blockIndex, onUpdate, onExpand, onEditTable }) => {
  const [isCollapsed, setIsCollapsed] = useState(data.defaultCollapsed ?? false);
  const blockRef = useRef(null);
  const template = TABLE_TEMPLATES[data.template] || TABLE_TEMPLATES.tasks;
  const columns = (data.columns && data.columns.length > 0) ? data.columns : template.columns;
  const rows = data.rows || [];
  const title = data.title || '';

  // Sync collapsed state when defaultCollapsed changes
  useEffect(() => {
    setIsCollapsed(data.defaultCollapsed ?? false);
  }, [data.defaultCollapsed]);
  
  // Scroll into view when expanded
  const handleToggleCollapse = () => {
    const wasCollapsed = isCollapsed;
    setIsCollapsed(!isCollapsed);
    if (wasCollapsed && onExpand) {
      setTimeout(() => onExpand(blockRef.current), 100);
    }
  };

  const handleCheckboxToggle = async (rowIndex, colId) => {
    if (!onUpdate) return;
    const newRows = rows.map((row, i) => 
      i === rowIndex ? { ...row, [colId]: !row[colId] } : row
    );
    await onUpdate(objectId, blockIndex, { ...data, rows: newRows });
  };

  // Calculate sums for number columns
  const sums = {};
  const shouldShowSum = template.showSum !== false;
  if (shouldShowSum) {
    columns.forEach(col => {
      if (col.type === 'number') {
        sums[col.id] = rows.reduce((sum, row) => sum + (Number(row[col.id]) || 0), 0);
      }
    });
  }
  const hasNumberColumns = Object.keys(sums).length > 0;
  const hasSums = Object.values(sums).some(s => s > 0);

  // Count completed checkboxes (excluding header rows)
  const checkboxCol = (data.showCheckbox !== false) ? columns.find(c => c.type === 'checkbox') : null;
  const regularRows = rows.filter(r => !r.isHeader);
  const checkedCount = checkboxCol ? regularRows.filter(r => r[checkboxCol.id]).length : 0;
  const totalCount = regularRows.length;
  
  // Get non-checkbox columns for display
  const displayColumns = columns.filter(c => c.type !== 'checkbox');
  const mainTextCol = displayColumns.find(c => c.type === 'text');

  // For templates with collapse (all modern table types)
  if (template.useCollapse) {
    const Icon = getIconComponent(template.icon);
    
    // Determine icon color based on template
    const iconColorClass = {
      list: 'text-blue-400',
      table: 'text-amber-400',
      tasks: 'text-amber-400',
      shopping: 'text-green-400',
      contacts: 'text-cyan-400',
      fusebox: 'text-yellow-400'
    }[template.id] || 'text-amber-400';
    
    const progressColorClass = {
      list: 'from-blue-500 to-blue-400',
      table: 'from-amber-500 to-amber-400',
      tasks: 'from-amber-500 to-amber-400',
      shopping: 'from-green-500 to-green-400',
      contacts: 'from-cyan-500 to-cyan-400',
      fusebox: 'from-yellow-500 to-yellow-400'
    }[template.id] || 'from-amber-500 to-amber-400';
    
    const checkboxColorClass = {
      list: 'bg-blue-500 border-blue-500',
      table: 'bg-amber-500 border-amber-500',
      tasks: 'bg-amber-500 border-amber-500',
      shopping: 'bg-green-500 border-green-500',
      contacts: 'bg-cyan-500 border-cyan-500',
      fusebox: 'bg-yellow-500 border-yellow-500'
    }[template.id] || 'bg-amber-500 border-amber-500';
    
    const checkboxHoverClass = {
      list: 'hover:border-blue-400',
      table: 'hover:border-amber-400',
      tasks: 'hover:border-amber-400',
      shopping: 'hover:border-green-400',
      contacts: 'hover:border-cyan-400',
      fusebox: 'hover:border-yellow-400'
    }[template.id] || 'hover:border-amber-400';
    
    const headerColorClass = {
      list: 'text-blue-400',
      table: 'text-amber-400',
      tasks: 'text-amber-400',
      shopping: 'text-green-400',
      contacts: 'text-cyan-400',
      fusebox: 'text-yellow-400'
    }[template.id] || 'text-amber-400';

    return (
      <div ref={blockRef} className="space-y-2">
        {/* Collapsible header */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleToggleCollapse}
            className="flex-1 flex items-center gap-2.5 py-2 group touch-manipulation"
          >
            <div className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-colors">
              <ChevronDown 
                size={16} 
                className={`text-gray-400 group-hover:text-white transition-all ${isCollapsed ? '-rotate-90' : 'rotate-0'}`} 
              />
            </div>
            <div className="flex items-center gap-2.5 flex-1 min-w-0">
              <Icon size={16} className="text-gray-400 flex-shrink-0" />
              <span className="text-sm font-medium text-gray-300 group-hover:text-white transition-colors truncate">
                {title || template.name}
              </span>
            </div>
            {checkboxCol && totalCount > 0 && (
              <div className="flex items-center gap-2 ml-2">
                <div className="h-1.5 w-12 bg-white/10 rounded-full overflow-hidden">
                  <div 
                    className={`h-full bg-gradient-to-r ${progressColorClass} transition-all duration-300`}
                    style={{ width: `${(checkedCount / totalCount) * 100}%` }}
                  />
                </div>
                <span className="text-xs text-gray-500 tabular-nums">{checkedCount}/{totalCount}</span>
              </div>
            )}
          </button>
          {onEditTable && !isCollapsed && (
            <button
              onClick={onEditTable}
              className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
              title="Redigera lista"
            >
              <Edit2 size={14} />
            </button>
          )}
        </div>
        
        {/* Collapsible content */}
        {!isCollapsed && (
          <div className="bg-white/[0.03] rounded-xl overflow-hidden">
            {regularRows.length === 0 && rows.filter(r => r.isHeader).length === 0 ? (
              <div className="px-3 py-3 text-center text-sm text-gray-500">
                Inga rader ännu
              </div>
            ) : (
              <div className="py-1">
                {rows.map((row, rowIndex) => (
                  row.isHeader ? (
                    <div 
                      key={row.id || rowIndex} 
                      className="px-3 py-1.5 mt-2 first:mt-0"
                    >
                      <span className={`text-xs font-semibold ${headerColorClass} uppercase tracking-wider`}>
                        {row.col1 || row.item || row.task || row.name || row.label || row.num || row.description || 'Rubrik'}
                      </span>
                    </div>
                  ) : (
                    <div 
                      key={row.id || rowIndex} 
                      className={`flex items-start gap-3 px-3 py-2 hover:bg-white/[0.03] transition-colors ${checkboxCol ? 'cursor-pointer' : ''}`}
                      onClick={checkboxCol ? () => handleCheckboxToggle(rowIndex, checkboxCol.id) : undefined}
                    >
                      {/* Checkbox first (if exists) */}
                      {checkboxCol && (
                        <div className="flex-shrink-0 touch-manipulation mt-0.5">
                          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                            row[checkboxCol.id] ? checkboxColorClass : `border-gray-600 ${checkboxHoverClass}`
                          }`}>
                            {row[checkboxCol.id] && <Check size={12} className="text-white" />}
                          </div>
                        </div>
                      )}
                      
                      {/* Display columns */}
                      {displayColumns.map((col, colIndex) => {
                        const value = row[col.id];
                        const isChecked = checkboxCol && row[checkboxCol.id];
                        const effectiveWidth = col.id === 'col2' ? 'w-36' : col.width;
                        const widthClass = effectiveWidth === 'flex-1' ? 'flex-1' : `flex-shrink-0 ${effectiveWidth}`;
                        const baseClass = `text-sm text-left ${widthClass} ${
                          col.type === 'number' ? 'text-right tabular-nums' : ''
                        } ${isChecked ? 'text-gray-500/70 line-through decoration-gray-600' : (colIndex === 0 ? 'text-gray-200' : 'text-gray-400')}`;
                        
                        // Handle col2 with col2Type
                        if (col.id === 'col2' && data.col2Type && value) {
                          if (data.col2Type === 'tel') {
                            return (
                              <a 
                                key={col.id}
                                href={`tel:${value.replace(/\s/g, '')}`}
                                className={`${baseClass} flex items-center gap-1.5 text-blue-400 hover:text-blue-300`}
                                onClick={e => e.stopPropagation()}
                              >
                                <Phone size={14} className="flex-shrink-0" />
                                <span className={isChecked ? 'text-gray-500' : ''}>{value}</span>
                              </a>
                            );
                          }
                          if (data.col2Type === 'url') {
                            let url = value;
                            if (!value.startsWith('http')) {
                              url = value.startsWith('www.') ? `https://${value}` : `https://${value}`;
                            }
                            const displayText = value.length > 15 ? value.slice(0, 15) + '...' : value;
                            return (
                              <a 
                                key={col.id}
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`${baseClass} flex items-center gap-1.5 text-blue-400 hover:text-blue-300`}
                                onClick={e => e.stopPropagation()}
                              >
                                <ExternalLink size={14} className="flex-shrink-0" />
                                <span className={isChecked ? 'text-gray-500' : ''}>{displayText}</span>
                              </a>
                            );
                          }
                          if (data.col2Type === 'number') {
                            return (
                              <span key={col.id} className={`${baseClass} text-right tabular-nums w-16`}>
                                {value}
                              </span>
                            );
                          }
                        }
                        
                        // Handle legacy phone column
                        if (col.id === 'phone' && value) {
                          return (
                            <a 
                              key={col.id}
                              href={`tel:${value.replace(/\s/g, '')}`}
                              className={`${baseClass} flex items-center gap-1.5 text-blue-400 hover:text-blue-300`}
                              onClick={e => e.stopPropagation()}
                            >
                              <Phone size={14} className="flex-shrink-0" />
                              <span className={isChecked ? 'text-gray-500' : ''}>{value}</span>
                            </a>
                          );
                        }
                        
                        // Default text rendering
                        return (
                          <span key={col.id} className={baseClass}>
                            {value ? (col.suffix ? `${value}${col.suffix}` : value) : '–'}
                          </span>
                        );
                      })}
                    </div>
                  )
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // Legacy non-collapsible table rendering
  return (
    <div className="bg-white/[0.03] rounded-xl overflow-hidden">
      {/* Progress bar if has checkboxes */}
      {checkboxCol && totalCount > 0 && (
        <div className="flex items-center gap-3 px-4 py-2 border-b border-white/5">
          <div className="h-1.5 w-20 bg-gray-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-amber-500 to-orange-400 transition-all duration-300"
              style={{ width: `${(checkedCount / totalCount) * 100}%` }}
            />
          </div>
          <span className="text-xs text-gray-500">{checkedCount}/{totalCount}</span>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[300px]">
          {/* Header */}
          {!template.hideHeader && (
          <thead>
            <tr className="border-b border-white/10">
              {columns.map(col => (
                <th 
                  key={col.id} 
                  className={`px-3 py-2.5 text-left text-xs font-medium text-gray-400 uppercase tracking-wider ${col.width} ${col.type === 'checkbox' ? 'text-center' : ''} ${col.type === 'number' ? 'text-right' : ''}`}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          )}

          {/* Body */}
          <tbody className="divide-y divide-white/5">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-3 py-4 text-center text-sm text-gray-500">
                  Inga rader ännu
                </td>
              </tr>
            ) : (
              rows.map((row, rowIndex) => (
                <tr key={row.id || rowIndex} className="hover:bg-white/[0.02] transition-colors">
                  {columns.map(col => (
                    <td 
                      key={col.id} 
                      className={`px-3 py-2.5 ${col.width} ${col.type === 'number' ? 'text-right' : ''}`}
                    >
                      {col.type === 'checkbox' ? (
                        <button
                          onClick={() => handleCheckboxToggle(rowIndex, col.id)}
                          className="w-full flex justify-center py-1 touch-manipulation active:bg-white/[0.03]"
                        >
                          <div className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-all ${
                            row[col.id] ? 'bg-amber-500 border-amber-500' : 'border-gray-600 hover:border-amber-400'
                          }`}>
                            {row[col.id] && <Check size={16} className="text-white" />}
                          </div>
                        </button>
                      ) : col.type === 'number' ? (
                        <span className={`text-sm tabular-nums ${row[col.id] ? 'text-gray-200' : 'text-gray-500'}`}>
                          {row[col.id] || '–'}
                        </span>
                      ) : col.id === 'phone' && row[col.id] ? (
                        <a 
                          href={`tel:${row[col.id].replace(/\s/g, '')}`}
                          className="text-sm text-blue-400 hover:text-blue-300 underline"
                        >
                          {row[col.id]}
                        </a>
                      ) : (
                        <span className={`text-sm ${row[col.id] ? 'text-gray-200' : 'text-gray-500'}`}>
                          {row[col.id] || '–'}
                        </span>
                      )}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>

          {/* Footer with sums */}
          {hasNumberColumns && hasSums && (
            <tfoot>
              <tr className="border-t border-white/10 bg-white/[0.02]">
                {columns.map((col, i) => (
                  <td 
                    key={col.id} 
                    className={`px-3 py-2.5 ${col.width} ${col.type === 'number' ? 'text-right' : ''}`}
                  >
                    {i === 0 ? (
                      <span className="text-xs font-medium text-gray-400 uppercase">Summa</span>
                    ) : col.type === 'number' ? (
                      <span className="text-sm font-semibold text-amber-400 tabular-nums">
                        {sums[col.id]}
                      </span>
                    ) : null}
                  </td>
                ))}
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
};
