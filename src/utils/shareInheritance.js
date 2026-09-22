/**
 * Helpers for cascading shares down an object hierarchy.
 *
 * A share cascades if it was created with "inkludera barn", or if it is itself
 * an inherited share - otherwise the cascade would stop after one generation
 * and grandchildren created later would never gain access.
 */

export function cascadesToChildren(shareData) {
  if (!shareData) return false;
  return shareData.includeChildren === true || shareData.status === 'inherited';
}

/**
 * Builds the share entry a child should get from `parentShare`.
 * `inheritedFrom` always points at the object where the share originated, so
 * revoking/declining/leaving at the root still finds every descendant.
 */
export function buildInheritedShare(parentShare, parentId) {
  return {
    ...parentShare,
    status: 'inherited',
    includeChildren: false,
    inheritedFrom: parentShare.inheritedFrom || parentId
  };
}
