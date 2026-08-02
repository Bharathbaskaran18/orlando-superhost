// Module-level store for ID file between SPA page navigations
export let pendingIdFile = null;
export function setPendingIdFile(file) { pendingIdFile = file; }
export function clearPendingIdFile() { pendingIdFile = null; }
