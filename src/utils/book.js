export const BOOK_SCHEMA_VERSION = 2;
export const BACKUP_SCHEMA_VERSION = 2;
export const IMPORT_FILE_ACCEPT = '.txt,.epub';
export const IMPORT_FILE_LABEL = 'TXT, EPUB';

function normalizeString(value, fallback = '') {
  return typeof value === 'string' && value.trim()
    ? value.trim()
    : fallback;
}

function normalizeNumber(value, fallback) {
  return Number.isFinite(value) ? value : fallback;
}

function normalizeTocItems(items = []) {
  if (!Array.isArray(items)) return [];

  return items.reduce((result, item) => {
    if (!item) return result;

    const href = typeof item.href === 'string' ? item.href : '';
    const label = normalizeString(item.label || item.title, href || '未命名章节');

    if (!href || !label) {
      return result;
    }

    result.push({ label, href });
    return result;
  }, []);
}

function normalizeFlatChapters(chapters = []) {
  if (!Array.isArray(chapters)) return [];

  return chapters.reduce((result, chapter, index) => {
    if (!chapter) return result;

    result.push({
      id: normalizeString(chapter.id, `ch_${index}`),
      title: normalizeString(chapter.title, '未命名章节'),
      start: normalizeNumber(chapter.start, 0),
      end: normalizeNumber(chapter.end, 0),
    });

    return result;
  }, []);
}

function normalizeVolumes(volumes = []) {
  if (!Array.isArray(volumes)) return [];

  return volumes.reduce((result, volume, index) => {
    if (!volume) return result;

    result.push({
      id: normalizeString(volume.id, `vol_${index}`),
      title: normalizeString(volume.title, '未命名分卷'),
      type: 'volume',
      start: normalizeNumber(volume.start, 0),
      end: normalizeNumber(volume.end, 0),
      children: normalizeFlatChapters(volume.children),
    });

    return result;
  }, []);
}

function createDefaultAssetMeta(type) {
  if (type === 'epub') {
    return {
      assetKind: 'epub',
      assetMimeType: 'application/epub+zip',
    };
  }

  return {
    assetKind: 'txt',
    assetMimeType: 'text/plain;charset=utf-8',
  };
}

export function createBookId(type) {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${type}_${crypto.randomUUID()}`;
  }

  return `${type}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export function normalizeBookRecord(book) {
  if (!book || typeof book !== 'object') return null;

  const type = book.type === 'epub' ? 'epub' : 'txt';
  const assetMeta = createDefaultAssetMeta(type);
  const flatChapters = normalizeFlatChapters(book.flatChapters || book.chapters);
  const toc = normalizeTocItems(
    book.toc || (type === 'txt'
      ? flatChapters.map((chapter) => ({ label: chapter.title, href: chapter.id }))
      : [])
  );

  return {
    schemaVersion: BOOK_SCHEMA_VERSION,
    id: normalizeString(book.id, createBookId(type)),
    type,
    title: normalizeString(book.title, '未命名书籍'),
    author: normalizeString(book.author, '未知作者'),
    fileName: normalizeString(book.fileName),
    addedAt: normalizeNumber(book.addedAt, Date.now()),
    cover: normalizeString(book.cover, null),
    toc,
    volumes: normalizeVolumes(book.volumes),
    flatChapters,
    assetKind: normalizeString(book.assetKind, assetMeta.assetKind),
    assetMimeType: normalizeString(book.assetMimeType, assetMeta.assetMimeType),
    locationMap: normalizeString(book.locationMap, null),
    assetMissing: Boolean(book.assetMissing),
    assetMissingMessage: normalizeString(book.assetMissingMessage, null),
  };
}

export function buildTxtBookRecord({
  id,
  title,
  author,
  fileName,
  addedAt,
  cover = null,
  volumes = [],
  flatChapters = [],
}) {
  return normalizeBookRecord({
    id: id || createBookId('txt'),
    type: 'txt',
    title,
    author,
    fileName,
    addedAt,
    cover,
    volumes,
    flatChapters,
  });
}

export function buildEpubBookRecord({
  id,
  title,
  author,
  fileName,
  addedAt,
  cover = null,
  toc = [],
  locationMap = null,
}) {
  return normalizeBookRecord({
    id: id || createBookId('epub'),
    type: 'epub',
    title,
    author,
    fileName,
    addedAt,
    cover,
    toc,
    locationMap,
  });
}
