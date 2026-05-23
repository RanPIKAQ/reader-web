import localforage from 'localforage';
import { BOOK_SCHEMA_VERSION } from './book';

export const booksStorage = localforage.createInstance({
  name: 'reader-web',
  storeName: 'books',
});

export const legacyChapterStorage = localforage.createInstance({
  name: 'reader-web',
  storeName: 'chapters',
});

export const assetsStorage = localforage.createInstance({
  name: 'reader-web',
  storeName: 'assets',
});

export const progressStorage = localforage.createInstance({
  name: 'reader-web',
  storeName: 'progress',
});

export const settingsStorage = localforage.createInstance({
  name: 'reader-web',
  storeName: 'settings',
});

export const statsStorage = localforage.createInstance({
  name: 'reader-web',
  storeName: 'stats',
});

export const DEFAULT_SETTINGS = {
  fontSize: 18,
  fontFamily: 'Georgia, serif',
  fontWeight: 400,
  lineHeight: 1.6,
  theme: 'day',
  customTextColor: null,
  customBgColor: null,
  customTextColors: [],
  customBgColors: [],
  pageMode: 'scroll',
  contentWidth: 100,
  customFonts: [],
  paragraphSpacing: 0,
  paragraphIndent: 0,
};

export function createBookStorageKey(bookId) {
  return `book_${bookId}`;
}

export function createProgressStorageKey(bookId) {
  return `progress_${bookId}`;
}

export function createAssetStorageKey(bookId) {
  return `asset_${bookId}`;
}

export function createLegacyTxtStorageKey(bookId) {
  return `txt_content_${bookId}`;
}

export function createTextAsset(bookId, text) {
  return {
    schemaVersion: BOOK_SCHEMA_VERSION,
    bookId,
    kind: 'txt',
    text,
  };
}

export function normalizeBookAsset(bookId, asset) {
  if (!asset || typeof asset !== 'object') return null;

  if (asset.kind === 'epub' && asset.blob instanceof Blob) {
    return {
      schemaVersion: BOOK_SCHEMA_VERSION,
      bookId,
      kind: 'epub',
      mimeType: asset.mimeType || asset.blob.type || 'application/epub+zip',
      blob: asset.blob,
    };
  }

  if (asset.kind === 'txt' && typeof asset.text === 'string') {
    return createTextAsset(bookId, asset.text);
  }

  return null;
}

export function buildMissingAssetMessage(type) {
  if (type === 'epub') {
    return 'EPUB 源文件缺失，请重新导入该书籍。';
  }

  return '书籍内容缺失，请重新导入该书籍。';
}
