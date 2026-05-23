import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  getBookAssetMock,
  getReadingProgressMock,
  saveBookDataMock,
  createEpubBookFromBlobMock,
  flattenEpubTocMock,
} = vi.hoisted(() => ({
  getBookAssetMock: vi.fn(),
  getReadingProgressMock: vi.fn(),
  saveBookDataMock: vi.fn(),
  createEpubBookFromBlobMock: vi.fn(),
  flattenEpubTocMock: vi.fn(() => []),
}));

vi.mock('../../utils/storage', () => ({
  getBookAsset: getBookAssetMock,
  getReadingProgress: getReadingProgressMock,
  saveBookData: saveBookDataMock,
}));

vi.mock('../../utils/epub', () => ({
  createEpubBookFromBlob: createEpubBookFromBlobMock,
  flattenEpubToc: flattenEpubTocMock,
}));

import { useEpubReaderEngine } from './useEpubReaderEngine';

function createFakeEpubBook() {
  const rendition = {
    themes: {
      fontSize: vi.fn(),
      fontFamily: vi.fn(),
      fontWeight: vi.fn(),
    },
    display: vi.fn(async () => undefined),
    on: vi.fn(),
    destroy: vi.fn(),
  };

  const book = {
    loaded: {
      navigation: Promise.resolve({
        toc: [{ href: 'ch1', label: 'Chapter 1' }],
      }),
    },
    locations: {
      load: vi.fn(),
      generate: vi.fn(async () => undefined),
      save: vi.fn(() => 'fake-location-map'),
      percentageFromCfi: vi.fn(() => 0.5),
      total: 1,
    },
    renderTo: vi.fn(() => rendition),
    destroy: vi.fn(),
  };

  return { book, rendition };
}

describe('useEpubReaderEngine', () => {
  beforeEach(() => {
    getBookAssetMock.mockReset();
    getReadingProgressMock.mockReset();
    saveBookDataMock.mockReset();
    createEpubBookFromBlobMock.mockReset();
    flattenEpubTocMock.mockReset();
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

  it('完整加载流程：创建 book → 生成 locations → 设置目录', async () => {
    const setBookMeta = vi.fn();
    const { book } = createFakeEpubBook();

    createEpubBookFromBlobMock.mockResolvedValue(book);
    flattenEpubTocMock.mockReturnValue([{ href: 'ch1', label: 'Chapter 1' }]);
    getBookAssetMock.mockResolvedValue({
      kind: 'epub',
      blob: new Blob(['epub binary']),
      mimeType: 'application/epub+zip',
    });
    getReadingProgressMock.mockResolvedValue(null);
    saveBookDataMock.mockResolvedValue(null);

    const { result } = renderHook(() => useEpubReaderEngine({
      active: true,
      bookId: 'epub_2',
      bookMeta: {
        id: 'epub_2',
        type: 'epub',
        title: '正常 EPUB',
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
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('');
    expect(result.current.toc).toHaveLength(1);
    expect(result.current.type).toBe('epub');
    expect(book.locations.generate).toHaveBeenCalledWith(1600);
    expect(saveBookDataMock).toHaveBeenCalledWith('epub_2', expect.objectContaining({
      locationMap: 'fake-location-map',
    }));
  });
});
