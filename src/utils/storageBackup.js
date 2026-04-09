import { BACKUP_SCHEMA_VERSION, BOOK_SCHEMA_VERSION, normalizeBookRecord } from './book';
import { buildMissingAssetMessage, createTextAsset } from './storageShared';

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

function isImportableBookRecord(book) {
  return Boolean(
    book
    && typeof book === 'object'
    && typeof book.id === 'string'
    && book.id.trim()
  );
}

function normalizeProgressRecord(progress) {
  if (
    !progress
    || typeof progress !== 'object'
    || typeof progress.bookId !== 'string'
    || !progress.bookId.trim()
  ) {
    return null;
  }

  return {
    bookId: progress.bookId,
    cfi: progress.cfi ?? null,
    percentage: progress.percentage ?? 0,
    chapterId: progress.chapterId ?? null,
    txtPosition: progress.txtPosition ?? null,
    timestamp: progress.timestamp ?? null,
  };
}

export async function serializeAssetForBackup(asset) {
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

export function deserializeAssetFromBackup(serializedAsset) {
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

function migrateLegacyBookEntry(legacyBook) {
  if (!legacyBook || typeof legacyBook !== 'object') {
    return {
      book: null,
      asset: null,
      progress: null,
    };
  }

  const { progress, txtContent, ...bookData } = legacyBook;

  if (typeof bookData.id !== 'string' || !bookData.id.trim()) {
    return {
      book: null,
      asset: null,
      progress: null,
    };
  }

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

export function migrateLegacyBackupData(data) {
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

function normalizeBackupDataShape(data) {
  const normalizedBooks = (data?.books || [])
    .filter(isImportableBookRecord)
    .map((book) => normalizeBookRecord(book));
  const knownBookIds = new Set(normalizedBooks.map((book) => book.id));
  const normalizedAssets = (data?.assets || [])
    .map((asset) => deserializeAssetFromBackup(asset))
    .filter((asset) => asset && knownBookIds.has(asset.bookId));
  const normalizedProgress = (data?.progress || [])
    .map((progress) => normalizeProgressRecord(progress))
    .filter((progress) => progress && knownBookIds.has(progress.bookId));

  return {
    version: BACKUP_SCHEMA_VERSION,
    exportedAt: data?.exportedAt || Date.now(),
    books: normalizedBooks,
    assets: normalizedAssets,
    progress: normalizedProgress,
    settings: data?.settings && typeof data.settings === 'object' && !Array.isArray(data.settings)
      ? data.settings
      : null,
  };
}

export function prepareBackupDataForImport(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('无效的备份文件');
  }

  if (!Array.isArray(data.books)) {
    throw new Error('无效的备份文件');
  }

  if (typeof data.version === 'number' && data.version > BACKUP_SCHEMA_VERSION) {
    throw new Error(`暂不支持导入版本 ${data.version} 的备份文件`);
  }

  const sourceData = data.version === BACKUP_SCHEMA_VERSION
    ? data
    : migrateLegacyBackupData(data);

  return normalizeBackupDataShape(sourceData);
}
