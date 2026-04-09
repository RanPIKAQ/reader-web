import { describe, expect, it } from 'vitest';
import {
  deserializeAssetFromBackup,
  migrateLegacyBackupData,
  serializeAssetForBackup,
} from './storage';

describe('storage helpers', () => {
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
});
