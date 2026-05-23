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

vi.mock('./useTxtReaderProgress', () => ({
  default: vi.fn(() => ({
    captureTxtProgress: vi.fn(),
    clearTxtProgressTimer: vi.fn(),
    suspendTxtProgressCaptureRef: { current: false },
  })),
  useTxtReaderProgress: vi.fn(() => ({
    captureTxtProgress: vi.fn(),
    clearTxtProgressTimer: vi.fn(),
    suspendTxtProgressCaptureRef: { current: false },
  })),
}));

vi.mock('./useTxtReaderRestore', () => ({
  default: vi.fn(() => ({
    loadTxtChapter: vi.fn(),
    pendingTxtRestoreRef: { current: null },
    cancelPendingRestoreFrame: vi.fn(),
  })),
  useTxtReaderRestore: vi.fn(() => ({
    loadTxtChapter: vi.fn(),
    pendingTxtRestoreRef: { current: null },
    cancelPendingRestoreFrame: vi.fn(),
  })),
}));

vi.mock('./useTxtReaderInteractions', () => ({
  default: vi.fn(),
  useTxtReaderInteractions: vi.fn(),
}));

vi.mock('./txtReaderUtils', () => ({
  BOUNDARY_RESET_DELAY: 800,
  CHAPTER_TRANSITION_GUARD_DELAY: 600,
  buildTxtLineMap: vi.fn(() => []),
  createCollapsedVolumeState: vi.fn(() => ({})),
  normalizeTxtStructure: vi.fn(() => ({
    volumes: [],
    chapters: [],
    toc: [],
  })),
}));

import { useTxtReaderEngine } from './useTxtReaderEngine';

describe('useTxtReaderEngine 错误路径', () => {
  beforeEach(() => {
    getBookAssetMock.mockReset();
    getReadingProgressMock.mockReset();
    saveBookDataMock.mockReset();
  });

  it('缺失 TXT 资产时显示错误并结束 loading', async () => {
    getBookAssetMock.mockResolvedValue(null);
    getReadingProgressMock.mockResolvedValue(null);
    saveBookDataMock.mockResolvedValue(null);

    const { result } = renderHook(() =>
      useTxtReaderEngine({
        active: true,
        bookId: 'txt_1',
        bookMeta: {
          id: 'txt_1',
          type: 'txt',
          title: '测试书籍',
          assetMissingMessage: null,
        },
        settings: {
          fontSize: 18,
          fontFamily: 'Georgia, serif',
          fontWeight: 400,
          lineHeight: 1.6,
          contentWidth: 100,
        },
        onProgressUpdate: vi.fn(),
        onProgressFlush: vi.fn(),
        zenMode: false,
        onToggleZenMode: vi.fn(),
        showToc: false,
        readerContainerRef: { current: null },
        setBookMeta: vi.fn(),
      }),
    );

    await waitFor(() => {
      expect(result.current.error).toBe('书籍内容缺失，请重新导入该书籍。');
      expect(result.current.loading).toBe(false);
    });
  });

  it('storage 读取抛异常时被捕获并结束 loading', async () => {
    getBookAssetMock.mockRejectedValue(new Error('存储错误'));
    getReadingProgressMock.mockResolvedValue(null);
    saveBookDataMock.mockResolvedValue(null);

    const { result } = renderHook(() =>
      useTxtReaderEngine({
        active: true,
        bookId: 'txt_1',
        bookMeta: {
          id: 'txt_1',
          type: 'txt',
          title: '测试书籍',
        },
        settings: {
          fontSize: 18,
          fontFamily: 'Georgia, serif',
          fontWeight: 400,
          lineHeight: 1.6,
          contentWidth: 100,
        },
        onProgressUpdate: vi.fn(),
        onProgressFlush: vi.fn(),
        zenMode: false,
        onToggleZenMode: vi.fn(),
        showToc: false,
        readerContainerRef: { current: null },
        setBookMeta: vi.fn(),
      }),
    );

    await waitFor(() => {
      expect(result.current.error).toBe('存储错误');
      expect(result.current.loading).toBe(false);
    });
  });
});
