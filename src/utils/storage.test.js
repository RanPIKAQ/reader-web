import { beforeEach, describe, expect, it, vi } from 'vitest';

const { storeMaps, storeInstances } = vi.hoisted(() => ({
  storeMaps: new Map(),
  storeInstances: new Map(),
}));

vi.mock('localforage', () => ({
  default: {
    createInstance: ({ storeName }) => {
      if (!storeInstances.has(storeName)) {
        const store = new Map();
        storeMaps.set(storeName, store);
        storeInstances.set(storeName, {
          getItem: vi.fn(async (key) => (store.has(key) ? store.get(key) : null)),
          setItem: vi.fn(async (key, value) => {
            store.set(key, value);
            return value;
          }),
          removeItem: vi.fn(async (key) => {
            store.delete(key);
          }),
          clear: vi.fn(async () => {
            store.clear();
          }),
          iterate: vi.fn(async (iteratee) => {
            for (const [key, value] of store.entries()) {
              iteratee(value, key);
            }
          }),
        });
      }

      return storeInstances.get(storeName);
    },
  },
}));

import {
  deserializeAssetFromBackup,
  exportAllData,
  getBookAsset,
  getBookRecord,
  getBookshelfEntries,
  getReadingProgress,
  getSettings,
  importAllData,
  migrateLegacyBackupData,
  prepareBackupDataForImport,
  removeBook,
  saveBookAsset,
  saveBookRecord,
  saveReadingProgress,
  serializeAssetForBackup,
} from './storage';

describe('storage helpers', () => {
  beforeEach(async () => {
    storeMaps.forEach((store) => store.clear());
  });

  it('能迁移旧版备份，并标记缺失的 EPUB 资源', () => {
    const migrated = migrateLegacyBackupData({
      version: 1,
      settings: { theme: 'night' },
      books: [
        {
          id: 'txt_1',
          type: 'txt',
          title: 'TXT 书籍',
          txtContent: '正文内容',
          progress: { percentage: 35, chapterId: 'ch_0' },
        },
        {
          id: 'epub_1',
          type: 'epub',
          title: 'EPUB 书籍',
        },
      ],
    });

    expect(migrated.version).toBe(2);
    expect(migrated.assets).toHaveLength(1);
    expect(migrated.assets[0]).toMatchObject({
      bookId: 'txt_1',
      kind: 'txt',
      text: '正文内容',
    });
    expect(migrated.progress).toHaveLength(1);
    expect(migrated.books.find((book) => book.id === 'epub_1')).toMatchObject({
      assetMissing: true,
      assetMissingMessage: 'EPUB 源文件缺失，请重新导入该书籍。',
    });
  });

  it('能序列化并恢复 EPUB 资源备份', async () => {
    const asset = {
      bookId: 'epub_1',
      kind: 'epub',
      mimeType: 'application/epub+zip',
      blob: new Blob(['epub binary'], { type: 'application/epub+zip' }),
    };

    const serialized = await serializeAssetForBackup(asset);
    const restored = deserializeAssetFromBackup(serialized);

    expect(serialized).toMatchObject({
      bookId: 'epub_1',
      kind: 'epub',
      mimeType: 'application/epub+zip',
    });
    expect(restored.kind).toBe('epub');
    expect(restored.mimeType).toBe('application/epub+zip');
    await expect(restored.blob.text()).resolves.toBe('epub binary');
  });

  it('能拒绝未来版本的备份且不写入任何数据', async () => {
    await expect(importAllData({
      version: 99,
      books: [],
    })).rejects.toThrow('暂不支持导入版本 99 的备份文件');

    await expect(getBookshelfEntries()).resolves.toEqual([]);
  });

  it('导入时会规范化数据并过滤无效条目', async () => {
    const backup = {
      version: 2,
      exportedAt: 123,
      books: [
        {
          id: 'txt_1',
          type: 'txt',
          title: '可导入 TXT',
          author: '作者 A',
          addedAt: 100,
        },
        {},
      ],
      assets: [
        {
          bookId: 'txt_1',
          kind: 'txt',
          text: '正文内容',
        },
        {
          bookId: 'missing_book',
          kind: 'txt',
          text: '应被过滤',
        },
      ],
      progress: [
        {
          bookId: 'txt_1',
          percentage: 42,
          chapterId: 'ch_1',
        },
        {
          bookId: 'missing_book',
          percentage: 99,
        },
      ],
      settings: {
        theme: 'night',
      },
    };

    const prepared = prepareBackupDataForImport(backup);

    expect(prepared.books).toHaveLength(1);
    expect(prepared.assets).toHaveLength(1);
    expect(prepared.progress).toHaveLength(1);

    await importAllData(backup);

    await expect(getBookRecord('txt_1')).resolves.toMatchObject({
      title: '可导入 TXT',
      author: '作者 A',
    });
    await expect(getBookAsset('txt_1')).resolves.toMatchObject({
      kind: 'txt',
      text: '正文内容',
    });
    await expect(getReadingProgress('txt_1')).resolves.toMatchObject({
      percentage: 42,
      chapterId: 'ch_1',
    });
    await expect(getSettings()).resolves.toMatchObject({
      theme: 'night',
    });
  });

  it('removeBook 会清理元数据、资源、进度和旧版 TXT 缓存', async () => {
    await saveBookRecord({
      id: 'txt_1',
      type: 'txt',
      title: '待删除书籍',
      addedAt: 100,
    });
    await saveBookAsset('txt_1', {
      kind: 'txt',
      text: '正文',
    });
    await saveReadingProgress('txt_1', {
      percentage: 12,
      chapterId: 'ch_0',
    });
    storeMaps.get('chapters').set('txt_content_txt_1', 'legacy text');

    await removeBook('txt_1');

    await expect(getBookRecord('txt_1')).resolves.toBeNull();
    await expect(getBookAsset('txt_1')).resolves.toBeNull();
    await expect(getReadingProgress('txt_1')).resolves.toBeNull();
    expect(storeMaps.get('chapters').has('txt_content_txt_1')).toBe(false);
  });

  it('getBookshelfEntries 返回聚合后的书架数据', async () => {
    await saveBookRecord({
      id: 'txt_1',
      type: 'txt',
      title: 'TXT 书籍',
      author: '作者 A',
      addedAt: 100,
    });
    await saveBookAsset('txt_1', {
      kind: 'txt',
      text: '正文',
    });
    await saveReadingProgress('txt_1', {
      percentage: 35,
      chapterId: 'ch_0',
    });

    await saveBookRecord({
      id: 'epub_1',
      type: 'epub',
      title: 'EPUB 书籍',
      author: '作者 B',
      addedAt: 200,
    });

    const entries = await getBookshelfEntries();

    expect(entries).toHaveLength(2);
    expect(entries[0]).toMatchObject({
      id: 'epub_1',
      assetMissing: true,
      assetMissingMessage: 'EPUB 源文件缺失，请重新导入该书籍。',
    });
    expect(entries[1]).toMatchObject({
      id: 'txt_1',
      assetMissing: false,
      progress: expect.objectContaining({
        percentage: 35,
      }),
    });
  });

  it('exportAllData 维持 v2 备份结构', async () => {
    await saveBookRecord({
      id: 'txt_1',
      type: 'txt',
      title: 'TXT 书籍',
      addedAt: 100,
    });
    await saveBookAsset('txt_1', {
      kind: 'txt',
      text: '正文',
    });
    await saveReadingProgress('txt_1', {
      percentage: 21,
      chapterId: 'ch_0',
    });

    const exported = await exportAllData();

    expect(exported).toMatchObject({
      version: 2,
      books: [
        expect.objectContaining({
          id: 'txt_1',
        }),
      ],
      assets: [
        expect.objectContaining({
          bookId: 'txt_1',
          kind: 'txt',
        }),
      ],
      progress: [
        expect.objectContaining({
          bookId: 'txt_1',
          percentage: 21,
        }),
      ],
    });
  });
});
