import { useMemo } from 'react';

/**
 * Hook for computing the filtered, sorted display list and child counts.
 * Encapsulates the full filter/sort pipeline for the main object list.
 */
export function useDisplayObjects({
  objects, categories, favorites, user,
  activeCategory, showFavoritesOnly, showOnlyOwned,
  viewFilter, searchQuery, showAllObjects,
  maxDistanceKm, userLocation, sortByDistance,
  getObjectDistance
}) {
  const searchTerm = searchQuery.trim().toLowerCase();

  const displayObjects = useMemo(() => {
    const matchesSearch = (obj) => {
      if (!searchTerm) return true;
      const values = [];
      const titleBlock = obj.blocks?.find(b => b.type === 'title');
      if (titleBlock?.data?.text) values.push(titleBlock.data.text);
      const locationBlock = obj.blocks?.find(b => b.type === 'location');
      if (locationBlock?.data?.address) values.push(locationBlock.data.address);
      obj.blocks?.forEach(block => {
        // Block title (section, rating, split, leaderboard, distribution, tiebreaker, audio, poll)
        if (block.title) values.push(block.title);

        if (block.type === 'text' && block.data?.text) {
          values.push(block.data.text);
        }
        if (block.type === 'table' && Array.isArray(block.data?.rows)) {
          block.data.rows.forEach(row => {
            Object.values(row).forEach(val => {
              if (typeof val === 'string') values.push(val);
            });
          });
        }
        if (block.type === 'datetag' && Array.isArray(block.data?.tags)) {
          block.data.tags.forEach(tag => {
            if (tag.type === 'year') {
              values.push(tag.value.toString());
            } else if (tag.type === 'range') {
              values.push(tag.start);
              values.push(tag.end);
            }
          });
        }
        if (block.type === 'contact') {
          if (block.data?.name) values.push(block.data.name);
          if (block.data?.email) values.push(block.data.email);
          if (block.data?.phone) values.push(block.data.phone);
        }
        if (block.type === 'links' && Array.isArray(block.data?.links)) {
          block.data.links.forEach(link => {
            if (link.title) values.push(link.title);
            if (link.url) values.push(link.url);
          });
        }
        if (block.type === 'poll') {
          if (block.data?.question) values.push(block.data.question);
          if (Array.isArray(block.data?.options)) {
            block.data.options.forEach(opt => {
              if (typeof opt === 'string') values.push(opt);
              else if (opt?.text) values.push(opt.text);
            });
          }
        }
      });
      return values.some(v => v.toString().toLowerCase().includes(searchTerm));
    };

    // Apply category filter
    let filtered = objects;
    if (activeCategory !== 'all' && activeCategory !== 'favorites') {
      filtered = filtered.filter(o => o.type === activeCategory);
    }

    // Apply favorites filter
    if (showFavoritesOnly) {
      filtered = filtered.filter(o => favorites.includes(o.id));
    }

    // Apply "only owned" filter
    if (showOnlyOwned && user) {
      filtered = filtered.filter(o => o.ownerId === user.uid);
    }

    // Apply view filter (collections vs objects)
    if (viewFilter === 'collections') {
      filtered = filtered.filter(o => o.isCollection === true);
    } else if (viewFilter === 'objects') {
      filtered = filtered.filter(o => !o.isCollection);
    }

    // Determine which objects to display
    let result;
    if (showAllObjects) {
      result = filtered;
    } else if (searchTerm) {
      result = filtered.filter(obj => matchesSearch(obj));
    } else {
      const accessibleIds = new Set(filtered.map(o => o.id));
      result = filtered.filter(o => {
        if (!o.parentId) return true;
        if (!accessibleIds.has(o.parentId)) return true;
        return false;
      });
    }

    if (maxDistanceKm && userLocation) {
      result = result.filter(obj => {
        const cat = categories.find(c => c.id === obj.type);
        if (cat?.hideLocation) return true;
        const dist = getObjectDistance(obj);
        return typeof dist === 'number' && dist <= maxDistanceKm;
      });
    }

    // Apply sorting
    if (sortByDistance && userLocation) {
      return [...result].sort((a, b) => {
        const catA = categories.find(c => c.id === a.type);
        const catB = categories.find(c => c.id === b.type);
        if (catA?.hideLocation && !catB?.hideLocation) return 1;
        if (!catA?.hideLocation && catB?.hideLocation) return -1;
        const distA = getObjectDistance(a);
        const distB = getObjectDistance(b);
        return (distA ?? Infinity) - (distB ?? Infinity);
      });
    } else {
      return [...result].sort((a, b) => {
        const titleA = (a.blocks?.find(bl => bl.type === 'title')?.data?.text || '').toLowerCase();
        const titleB = (b.blocks?.find(bl => bl.type === 'title')?.data?.text || '').toLowerCase();
        return titleA.localeCompare(titleB, 'sv');
      });
    }
  }, [objects, activeCategory, showFavoritesOnly, favorites, showOnlyOwned, user, viewFilter, searchTerm, showAllObjects, maxDistanceKm, userLocation, categories, getObjectDistance, sortByDistance]);

  // Pre-compute child counts for all objects (avoids O(n²) in render loop)
  const childCountMap = useMemo(() => {
    const map = {};
    for (const o of objects) {
      if (o.parentId) {
        map[o.parentId] = (map[o.parentId] || 0) + 1;
      }
    }
    return map;
  }, [objects]);

  return { displayObjects, childCountMap, searchTerm };
}
