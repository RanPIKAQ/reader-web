import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  getBookAssetMock,
  getReadingProgressMock,
  saveBookDataMock,
} = vi.hoisted(() => ({
  getBookAssetMock: vi.fn(),
  getReadingProgressMock: vi.fn(),
  saveBookDataMock: vi.fn(),
}));

vi.mock('../../utils/storage', () => ({
  getBookAsset: getBookAssetMock,
  getReadingProgress: getReadingProgressMock,
  saveBookData: saveBookDataMock,
}));

vi.mock('../../utils/epub', () => ({
  createEpubBookFromBlob: vi.fn(),
  flattenEpubToc: vi.fn(() => []),
}));

import { useEpubReaderEngine } from './useEpubReaderEngine';

describe('useEpubReaderEngine', () => {
  beforeEach(() => {
    getBookAssetMock.mockReset();
    getReadingProgressMock.mockReset();
    saveBookDataMock.mockReset();
  });

  it('缺失 EPUB 源文件时返回明确错误并标记书籍', async () => {
    const setBookMeta = vi.fn();
    getBookAssetMock.mockResolvedValue(null);
    getReadingProgressMock.mockResolvedValue(null);
    saveBookDataMock.mockResolvedValue(null);

    const { result } = renderHook(() => useEpubReaderEngine({
      active: true,
      bookId: 'epub_1',
      bookMeta: {
        id: 'epub_1',
        type: 'epub',
        title: '测试 EPUB',
        assetMissingMessage: null,
      },
      settings: {
        fontSize: 18,
        fontFamily: 'Georgia, serif',
        fontWeight: 400,
      },
      onProgressUpdate: vi.fn(),
      setBookMeta,
    }));

    await waitFor(() => {
      expect(result.current.error).toBe('EPUB 源文件缺失，请重新导入该书籍。');
    });

    expect(saveBookDataMock).toHaveBeenCalledWith('epub_1', expect.objectContaining({
      assetMissing: true,
    }));
    expect(setBookMeta).toHaveBeenCalledWith(expect.objectContaining({
      assetMissing: true,
    }));
  });
});
