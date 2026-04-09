import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { getReadingProgressMock, saveReadingProgressMock } = vi.hoisted(() => ({
  getReadingProgressMock: vi.fn(),
  saveReadingProgressMock: vi.fn(),
}));

vi.mock('../utils/storage', () => ({
  getReadingProgress: getReadingProgressMock,
  saveReadingProgress: saveReadingProgressMock,
}));

import { useReadingProgress } from './useReadingProgress';

describe('useReadingProgress', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    getReadingProgressMock.mockReset();
    saveReadingProgressMock.mockReset();
    getReadingProgressMock.mockResolvedValue(null);
    saveReadingProgressMock.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('loadProgress 会加载已保存进度并结束 loading', async () => {
    getReadingProgressMock.mockResolvedValue({
      cfi: 'epubcfi(/6/2)',
      percentage: 28,
    });

    const { result } = renderHook(() => useReadingProgress('book_1'));

    await act(async () => {
      await result.current.loadProgress();
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.progress).toMatchObject({
      cfi: 'epubcfi(/6/2)',
      percentage: 28,
    });
  });

  it('updateProgress 会防抖保存并仅落最后一次进度', async () => {
    const { result } = renderHook(() => useReadingProgress('book_1'));

    act(() => {
      result.current.updateProgress({ percentage: 10 });
      result.current.updateProgress({ percentage: 35, chapterId: 'ch_2' });
    });

    expect(saveReadingProgressMock).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });

    expect(saveReadingProgressMock).toHaveBeenCalledTimes(1);
    expect(saveReadingProgressMock).toHaveBeenCalledWith('book_1', {
      percentage: 35,
      chapterId: 'ch_2',
    });
  });

  it('flushProgress 会立即保存并取消待执行的防抖写入', async () => {
    const { result } = renderHook(() => useReadingProgress('book_1'));

    act(() => {
      result.current.updateProgress({ percentage: 12 });
    });

    await act(async () => {
      await result.current.flushProgress({ percentage: 50, chapterId: 'ch_5' });
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });

    expect(saveReadingProgressMock).toHaveBeenCalledTimes(1);
    expect(saveReadingProgressMock).toHaveBeenCalledWith('book_1', {
      percentage: 50,
      chapterId: 'ch_5',
    });
  });

  it('卸载时会清理待执行的保存定时器', async () => {
    const { result, unmount } = renderHook(() => useReadingProgress('book_1'));

    act(() => {
      result.current.updateProgress({ percentage: 18 });
    });

    unmount();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });

    expect(saveReadingProgressMock).not.toHaveBeenCalled();
  });
});
