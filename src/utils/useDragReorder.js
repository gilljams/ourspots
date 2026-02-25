import { useState, useRef, useEffect, useCallback } from 'react';

/**
 * Hook for drag-and-drop + touch-based row reordering.
 * Shared by ListEditorModal, SimpleTableEditorModal, and MultiColumnTableEditorModal.
 *
 * @param {Object} options
 * @param {Array} options.rows - Current rows array
 * @param {Function} options.setRows - Row state setter
 * @param {boolean} options.selectMode - Whether multi-select mode is active
 * @param {Set} options.selectedIds - Currently selected row IDs
 * @param {React.RefObject} options.listRef - Ref to the scrollable list container
 * @returns {Object} Drag state and handler functions
 */
export function useDragReorder({ rows, setRows, selectMode, selectedIds, listRef }) {
  const [draggedId, setDraggedId] = useState(null);
  const [dragOverId, setDragOverId] = useState(null);
  const [touchDragId, setTouchDragId] = useState(null);
  const [touchY, setTouchY] = useState(0);
  const touchStartY = useRef(0);
  const touchRowRef = useRef(null);

  // --- Desktop drag-and-drop ---

  const handleDragStart = (e, rowId) => {
    setDraggedId(rowId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', rowId);
  };

  const handleDragOver = (e, rowId) => {
    e.preventDefault();
    if (rowId !== draggedId) setDragOverId(rowId);
  };

  const handleDragLeave = () => setDragOverId(null);

  const handleDrop = (e, targetId) => {
    e.preventDefault();
    if (!draggedId || draggedId === targetId) {
      setDraggedId(null);
      setDragOverId(null);
      return;
    }
    reorderRows(draggedId, targetId);
    setDraggedId(null);
    setDragOverId(null);
  };

  const handleDragEnd = () => {
    setDraggedId(null);
    setDragOverId(null);
  };

  // --- Touch-based reordering ---

  const handleTouchStart = (e, rowId) => {
    touchStartY.current = e.touches[0].clientY;
    touchRowRef.current = rowId;
  };

  const handleTouchMove = useCallback((e) => {
    if (!touchRowRef.current) return;
    const touch = e.touches[0];
    const deltaY = touch.clientY - touchStartY.current;

    if (Math.abs(deltaY) > 10 && !touchDragId) {
      setTouchDragId(touchRowRef.current);
    }

    if (touchDragId) {
      setTouchY(deltaY);
      const elements = listRef.current?.querySelectorAll('[data-row-id]');
      elements?.forEach(el => {
        const rect = el.getBoundingClientRect();
        const rowId = el.dataset.rowId;
        if (touch.clientY >= rect.top && touch.clientY <= rect.bottom && rowId !== touchDragId) {
          setDragOverId(rowId);
        }
      });
    }
  }, [touchDragId, listRef]);

  const handleTouchEnd = useCallback(() => {
    if (touchDragId && dragOverId) {
      reorderRows(touchDragId, dragOverId);
    }
    setTouchDragId(null);
    setTouchY(0);
    setDragOverId(null);
    touchRowRef.current = null;
  }, [touchDragId, dragOverId, rows, selectMode, selectedIds]); // eslint-disable-line react-hooks/exhaustive-deps

  // Attach/detach touch listeners
  useEffect(() => {
    if (touchDragId) {
      document.addEventListener('touchmove', handleTouchMove, { passive: false });
      document.addEventListener('touchend', handleTouchEnd);
      return () => {
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', handleTouchEnd);
      };
    }
  }, [touchDragId, handleTouchMove, handleTouchEnd]);

  // --- Shared reorder logic ---

  function reorderRows(sourceId, targetId) {
    const targetIdx = rows.findIndex(r => r.id === targetId);

    if (selectMode && selectedIds.size > 0 && selectedIds.has(sourceId)) {
      // Move all selected rows to target position
      const selectedRows = rows.filter(r => selectedIds.has(r.id));
      const remainingRows = rows.filter(r => !selectedIds.has(r.id));
      const targetRow = rows[targetIdx];
      let insertIdx = remainingRows.findIndex(r => r.id === targetRow?.id);
      if (insertIdx === -1) insertIdx = remainingRows.length;
      setRows([
        ...remainingRows.slice(0, insertIdx),
        ...selectedRows,
        ...remainingRows.slice(insertIdx),
      ]);
    } else {
      // Single row move
      const draggedIdx = rows.findIndex(r => r.id === sourceId);
      const newRows = [...rows];
      const [removed] = newRows.splice(draggedIdx, 1);
      newRows.splice(targetIdx, 0, removed);
      setRows(newRows);
    }
  }

  return {
    draggedId,
    dragOverId,
    touchDragId,
    touchY,
    handleDragStart,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleDragEnd,
    handleTouchStart,
  };
}
