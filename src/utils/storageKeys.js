/**
 * Centralized localStorage key constants.
 * Single source of truth for all persisted client-side state.
 *
 * Usage:
 *   import { STORAGE_KEYS } from '../utils/storageKeys';
 *   localStorage.getItem(STORAGE_KEYS.SORT_BY_DISTANCE);
 */
export const STORAGE_KEYS = {
  // Filter & display preferences
  ACTIVE_CATEGORY: 'activeCategory',
  SHOW_ONLY_OWNED: 'showOnlyOwned',
  SORT_BY_DISTANCE: 'sortByDistance',
  COMPACT_CARDS: 'compactCards',
  SHOW_DEMO_OBJECTS: 'showDemoObjects',
  CHILD_VIEW_MODE: 'ourspots-child-view-mode',

  // Quick-capture / GPS
  CAPTURES: 'ourspots_captures',
  KEEP_SCREEN_ON: 'keepScreenOn',
  SHOW_QUICK_CAPTURE: 'showQuickCapture',
  QUICK_CAPTURE_OBJECT_ID: 'quickCaptureObjectId',
  PRECISE_GPS: 'preciseGPS',

  // Menu section expansion
  MENU_ADMIN_EXPANDED: 'menuAdminExpanded',
  MENU_SETTINGS_EXPANDED: 'menuSettingsExpanded',
  MENU_QUICK_CAPTURE_EXPANDED: 'menuQuickCaptureExpanded',

  // Offline data
  PENDING_LOCATIONS: 'ourspots_pending_locations',
};
