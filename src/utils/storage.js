import { BACKUP_SCHEMA_VERSION, normalizeBookRecord } from './book';
import {
  assetsStorage,
  booksStorage,
  buildMissingAssetMessage,
  createAssetStorageKey,
  createBookStorageKey,
  createLegacyTxtStorageKey,
  createTextAsset,
  createProgressStorageKey,
  DEFAULT_SETTINGS,
  legacyChapterStorage,
  normalizeBookAsset,
  progressStorage,
  settingsStorage,
} from './storageShared';
import {
  deserializeAssetFromBackup,
  migrateLegacyBackupData,
  prepareBackupDataForImport,
  serializeAssetForBackup,
} from './storageBackup';

export async function saveReadingProgress(bookId, progress) {
  await progressStorage.setItem(createProgressStorageKey(bookId), {
    cfi: progress.cfi ?? null,
    percentage: progress.percentage ?? 0,
    chapterId: progress.chapterId ?? null,
    txtPosition: progress.txtPosition ?? null,
    timestamp: Date.now(),
  });
}

export async function getReadingProgress(bookId) {
  const nextProgress = await progressStorage.getItem(createProgressStorageKey(bookId));
  if (nextProgress) return nextProgress;

  return await booksStorage.getItem(createProgressStorageKey(bookId));
}

export async function saveBookRecord(book) {
  const normalizedBook = normalizeBookRecord(book);
  await booksStorage.setItem(createBookStorageKey(normalizedBook.id), normalizedBook);
  return normalizedBook;
}

export async function getBookRecord(bookId) {
  const storedBook = await booksStorage.getItem(createBookStorageKey(bookId));
  return normalizeBookRecord(storedBook);
}

export async function patchBookRecord(bookId, patch) {
  const stored = await getBookRecord(bookId);
  if (!stored) return null;
  const merged = normalizeBookRecord({ ...stored, ...patch });
  await booksStorage.setItem(createBookStorageKey(merged.id), merged);
  return merged;
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

  await assetsStorage.setItem(createAssetStorageKey(bookId), normalizedAsset);

  if (normalizedAsset.kind === 'txt') {
    await legacyChapterStorage.removeItem(createLegacyTxtStorageKey(bookId));
  }

  return normalizedAsset;
}

export async function getBookAsset(bookId) {
  const asset = await assetsStorage.getItem(createAssetStorageKey(bookId));
  if (asset) {
    return normalizeBookAsset(bookId, asset);
  }

  const legacyTxtContent = await legacyChapterStorage.getItem(createLegacyTxtStorageKey(bookId));
  if (typeof legacyTxtContent === 'string') {
    return createTextAsset(bookId, legacyTxtContent);
  }

  return null;
}

export async function removeBook(bookId) {
  await booksStorage.removeItem(createBookStorageKey(bookId));
  await booksStorage.removeItem(createProgressStorageKey(bookId));
  await progressStorage.removeItem(createProgressStorageKey(bookId));
  await assetsStorage.removeItem(createAssetStorageKey(bookId));
  await legacyChapterStorage.removeItem(createLegacyTxtStorageKey(bookId));
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
    try {
      const asset = await getBookAsset(book.id);
      const serializedAsset = await serializeAssetForBackup(asset);

      if (serializedAsset) {
        assets.push(serializedAsset);
      }
    } catch {
      // 跳过损坏的资产，继续导出其他书籍
    }

    try {
      const bookProgress = await getReadingProgress(book.id);

      if (bookProgress) {
        progress.push({
          bookId: book.id,
          ...bookProgress,
        });
      }
    } catch {
      // 跳过损坏的进度记录
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

export async function getBookshelfEntries() {
  const books = await getAllBookRecords();

  const results = await Promise.all(
    books.map(async (book) => {
      try {
        const [progress, asset] = await Promise.all([
          getReadingProgress(book.id),
          getBookAsset(book.id),
        ]);
        const assetMissing = book.assetMissing || !asset;

        return {
          ...book,
          progress,
          assetMissing,
          assetMissingMessage: assetMissing
            ? (book.assetMissingMessage || buildMissingAssetMessage(book.type))
            : null,
        };
      } catch {
        return {
          ...book,
          progress: null,
          assetMissing: true,
          assetMissingMessage: buildMissingAssetMessage(book.type),
        };
      }
    })
  );

  return results;
}

export async function importAllData(data) {
  const normalizedData = prepareBackupDataForImport(data);

  if (normalizedData.settings) {
    await settingsStorage.setItem('userSettings', normalizedData.settings);
  }

  for (const rawBook of normalizedData.books || []) {
    await saveBookRecord(rawBook);
  }

  for (const asset of normalizedData.assets || []) {
    await saveBookAsset(asset.bookId, asset);
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

export { DEFAULT_SETTINGS };
export default booksStorage;
export {
  deserializeAssetFromBackup,
  migrateLegacyBackupData,
  prepareBackupDataForImport,
  serializeAssetForBackup,
};
