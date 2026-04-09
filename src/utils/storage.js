import localforage from 'localforage';
import { BACKUP_SCHEMA_VERSION, BOOK_SCHEMA_VERSION, normalizeBookRecord } from './book';

const booksStorage = localforage.createInstance({
  name: 'reader-web',
  storeName: 'books',
});

const legacyChapterStorage = localforage.createInstance({
  name: 'reader-web',
  storeName: 'chapters',
});

const assetsStorage = localforage.createInstance({
  name: 'reader-web',
  storeName: 'assets',
});

const progressStorage = localforage.createInstance({
  name: 'reader-web',
  storeName: 'progress',
});

const settingsStorage = localforage.createInstance({
  name: 'reader-web',
  storeName: 'settings',
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
};

function createTextAsset(bookId, text) {
  return {
    schemaVersion: BOOK_SCHEMA_VERSION,
    bookId,
    kind: 'txt',
    text,
  };
}

function normalizeBookAsset(bookId, asset) {
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

function arrayBufferToBase64(buffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;

  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }

  return btoa(binary);
}

function base64ToUint8Array(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

async function serializeAssetForBackup(asset) {
  if (!asset) return null;

  if (asset.kind === 'txt') {
    return {
      bookId: asset.bookId,
      kind: 'txt',
      text: asset.text,
    };
  }

  if (asset.kind === 'epub') {
    const buffer = await asset.blob.arrayBuffer();

    return {
      bookId: asset.bookId,
      kind: 'epub',
      mimeType: asset.mimeType,
      dataBase64: arrayBufferToBase64(buffer),
    };
  }

  return null;
}

function deserializeAssetFromBackup(serializedAsset) {
  if (!serializedAsset || typeof serializedAsset !== 'object') return null;

  if (serializedAsset.kind === 'txt' && typeof serializedAsset.text === 'string') {
    return createTextAsset(serializedAsset.bookId, serializedAsset.text);
  }

  if (serializedAsset.kind === 'epub' && typeof serializedAsset.dataBase64 === 'string') {
    const bytes = base64ToUint8Array(serializedAsset.dataBase64);

    return {
      schemaVersion: BOOK_SCHEMA_VERSION,
      bookId: serializedAsset.bookId,
      kind: 'epub',
      mimeType: serializedAsset.mimeType || 'application/epub+zip',
      blob: new Blob([bytes], {
        type: serializedAsset.mimeType || 'application/epub+zip',
      }),
    };
  }

  return null;
}

function buildMissingAssetMessage(type) {
  if (type === 'epub') {
    return 'EPUB 源文件缺失，请重新导入该书籍。';
  }

  return '书籍内容缺失，请重新导入该书籍。';
}

function migrateLegacyBookEntry(legacyBook) {
  const { progress, txtContent, ...bookData } = legacyBook;
  const normalizedBook = normalizeBookRecord({
    ...bookData,
    schemaVersion: BOOK_SCHEMA_VERSION,
  });

  const asset = normalizedBook.type === 'txt' && typeof txtContent === 'string'
    ? createTextAsset(normalizedBook.id, txtContent)
    : null;

  return {
    book: normalizeBookRecord({
      ...normalizedBook,
      assetMissing: !asset && normalizedBook.type === 'epub',
      assetMissingMessage: !asset && normalizedBook.type === 'epub'
        ? buildMissingAssetMessage('epub')
        : null,
    }),
    asset,
    progress: progress || null,
  };
}

function migrateLegacyBackupData(data) {
  const migratedBooks = [];
  const migratedAssets = [];
  const migratedProgress = [];

  (data?.books || []).forEach((legacyBook) => {
    const migrated = migrateLegacyBookEntry(legacyBook);
    if (!migrated.book) return;

    migratedBooks.push(migrated.book);

    if (migrated.asset) {
      migratedAssets.push(migrated.asset);
    }

    if (migrated.progress) {
      migratedProgress.push({
        bookId: migrated.book.id,
        ...migrated.progress,
      });
    }
  });

  return {
    version: BACKUP_SCHEMA_VERSION,
    exportedAt: data?.exportedAt || Date.now(),
    books: migratedBooks,
    assets: migratedAssets,
    progress: migratedProgress,
    settings: data?.settings || null,
  };
}

export async function saveReadingProgress(bookId, progress) {
  await progressStorage.setItem(`progress_${bookId}`, {
    cfi: progress.cfi ?? null,
    percentage: progress.percentage ?? 0,
    chapterId: progress.chapterId ?? null,
    txtPosition: progress.txtPosition ?? null,
    timestamp: Date.now(),
  });
}

export async function getReadingProgress(bookId) {
  const nextProgress = await progressStorage.getItem(`progress_${bookId}`);
  if (nextProgress) return nextProgress;

  return await booksStorage.getItem(`progress_${bookId}`);
}

export async function saveBookRecord(book) {
  const normalizedBook = normalizeBookRecord(book);
  await booksStorage.setItem(`book_${normalizedBook.id}`, normalizedBook);
  return normalizedBook;
}

export async function getBookRecord(bookId) {
  const storedBook = await booksStorage.getItem(`book_${bookId}`);
  return normalizeBookRecord(storedBook);
}

export async function getAllBookRecords() {
  const books = [];

  await booksStorage.iterate((value, key) => {
    if (key.startsWith('book_')) {
      const normalized = normalizeBookRecord(value);
      if (normalized) {
        books.push(normalized);
      }
    }
  });

  books.sort((left, right) => right.addedAt - left.addedAt);
  return books;
}

export async function saveBookAsset(bookId, asset) {
  const normalizedAsset = normalizeBookAsset(bookId, asset);

  if (!normalizedAsset) {
    throw new Error('无效的书籍资源');
  }

  await assetsStorage.setItem(`asset_${bookId}`, normalizedAsset);

  if (normalizedAsset.kind === 'txt') {
    await legacyChapterStorage.removeItem(`txt_content_${bookId}`);
  }

  return normalizedAsset;
}

export async function getBookAsset(bookId) {
  const asset = await assetsStorage.getItem(`asset_${bookId}`);
  if (asset) {
    return normalizeBookAsset(bookId, asset);
  }

  const legacyTxtContent = await legacyChapterStorage.getItem(`txt_content_${bookId}`);
  if (typeof legacyTxtContent === 'string') {
    return createTextAsset(bookId, legacyTxtContent);
  }

  return null;
}

export async function removeBook(bookId) {
  await booksStorage.removeItem(`book_${bookId}`);
  await booksStorage.removeItem(`progress_${bookId}`);
  await progressStorage.removeItem(`progress_${bookId}`);
  await assetsStorage.removeItem(`asset_${bookId}`);
  await legacyChapterStorage.removeItem(`txt_content_${bookId}`);
}

export async function saveSettings(settings) {
  await settingsStorage.setItem('userSettings', settings);
}

export async function getSettings() {
  return await settingsStorage.getItem('userSettings');
}

export async function clearAllData() {
  await booksStorage.clear();
  await legacyChapterStorage.clear();
  await assetsStorage.clear();
  await progressStorage.clear();
  await settingsStorage.clear();
}

export async function exportAllData() {
  const books = await getAllBookRecords();
  const settings = await getSettings();
  const assets = [];
  const progress = [];

  for (const book of books) {
    const asset = await getBookAsset(book.id);
    const serializedAsset = await serializeAssetForBackup(asset);
    const bookProgress = await getReadingProgress(book.id);

    if (serializedAsset) {
      assets.push(serializedAsset);
    }

    if (bookProgress) {
      progress.push({
        bookId: book.id,
        ...bookProgress,
      });
    }
  }

  return {
    version: BACKUP_SCHEMA_VERSION,
    exportedAt: Date.now(),
    books,
    assets,
    progress,
    settings,
  };
}

export async function importAllData(data) {
  let normalizedData = data;

  if (normalizedData?.version !== BACKUP_SCHEMA_VERSION) {
    normalizedData = migrateLegacyBackupData(data);
  }

  if (normalizedData.settings) {
    await settingsStorage.setItem('userSettings', normalizedData.settings);
  }

  for (const rawBook of normalizedData.books || []) {
    const normalizedBook = normalizeBookRecord(rawBook);
    if (normalizedBook) {
      await saveBookRecord(normalizedBook);
    }
  }

  for (const serializedAsset of normalizedData.assets || []) {
    const asset = deserializeAssetFromBackup(serializedAsset);
    if (asset) {
      await saveBookAsset(asset.bookId, asset);
    }
  }

  for (const item of normalizedData.progress || []) {
    if (item?.bookId) {
      await saveReadingProgress(item.bookId, item);
    }
  }
}

export const saveBookData = async (_bookId, bookData) => {
  return await saveBookRecord(bookData);
};

export const getBookData = getBookRecord;
export const getAllBooks = getAllBookRecords;

export const saveTxtContent = async (bookId, content) => {
  return await saveBookAsset(bookId, {
    kind: 'txt',
    text: content,
  });
};

export const getTxtContent = async (bookId) => {
  const asset = await getBookAsset(bookId);
  if (asset?.kind === 'txt') {
    return asset.text;
  }

  return null;
};

export default booksStorage;
export { deserializeAssetFromBackup, migrateLegacyBackupData, serializeAssetForBackup };
