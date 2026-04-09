import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useTxtReaderInteractions } from './useTxtReaderInteractions';

function createHookProps(overrides = {}) {
  const container = document.createElement('div');
  const content = document.createElement('div');
  container.appendChild(content);

  return {
    active: true,
    zenMode: false,
    onToggleZenMode: vi.fn(),
    showToc: false,
    readerContainerRef: { current: container },
    txtContentRef: { current: content },
    flatChaptersRef: { current: [] },
    currentChapterIndexRef: { current: 0 },
    boundaryScrollStateRef: { current: null },
    isChapterTransitioningRef: { current: false },
    suspendTxtProgressCaptureRef: { current: false },
    captureTxtProgress: vi.fn(),
    loadTxtChapter: vi.fn(),
    prevChapter: vi.fn(),
    nextChapter: vi.fn(),
    resetBoundaryScroll: vi.fn(),
    clearChapterTransitionTimer: vi.fn(),
    scheduleBoundaryReset: vi.fn(),
    setBoundaryState: vi.fn(),
    startChapterTransitionGuard: vi.fn(),
    chapterLines: [],
    currentChapterIndex: 0,
    ...overrides,
  };
}

describe('useTxtReaderInteractions', () => {
  it('在挂起进度采集时忽略滚动和 pagehide 事件', () => {
    const props = createHookProps({
      suspendTxtProgressCaptureRef: { current: true },
    });

    const { unmount } = renderHook(() => useTxtReaderInteractions(props));

    act(() => {
      props.txtContentRef.current.dispatchEvent(new Event('scroll'));
      window.dispatchEvent(new Event('pagehide'));
    });

    expect(props.captureTxtProgress).not.toHaveBeenCalled();
    unmount();
  });

  it('在未挂起时响应滚动和 pagehide 事件', () => {
    const props = createHookProps();

    const { unmount } = renderHook(() => useTxtReaderInteractions(props));

    act(() => {
      props.txtContentRef.current.dispatchEvent(new Event('scroll'));
      window.dispatchEvent(new Event('pagehide'));
    });

    expect(props.captureTxtProgress).toHaveBeenNthCalledWith(1);
    expect(props.captureTxtProgress).toHaveBeenNthCalledWith(2, {
      immediate: true,
      flush: true,
    });

    unmount();
  });
});
