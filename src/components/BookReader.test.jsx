import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  useReaderBookMock,
  useTxtReaderEngineMock,
  useEpubReaderEngineMock,
} = vi.hoisted(() => ({
  useReaderBookMock: vi.fn(),
  useTxtReaderEngineMock: vi.fn(),
  useEpubReaderEngineMock: vi.fn(),
}));

vi.mock('../hooks/reader/useReaderBook', () => ({
  useReaderBook: useReaderBookMock,
}));

vi.mock('../hooks/reader/useTxtReaderEngine', () => ({
  useTxtReaderEngine: useTxtReaderEngineMock,
}));

vi.mock('../hooks/reader/useEpubReaderEngine', () => ({
  useEpubReaderEngine: useEpubReaderEngineMock,
}));

import BookReader from './BookReader';

const defaultSettings = {
  fontSize: 18,
  fontFamily: 'Georgia, serif',
  fontWeight: 400,
  lineHeight: 1.6,
  theme: 'day',
  customTextColor: null,
  customBgColor: null,
  contentWidth: 100,
};

describe('BookReader', () => {
  beforeEach(() => {
    useReaderBookMock.mockReset();
    useTxtReaderEngineMock.mockReset();
    useEpubReaderEngineMock.mockReset();

    useTxtReaderEngineMock.mockReturnValue({
      type: 'txt',
      loading: false,
      error: '',
      toc: [{ label: '第一章', href: 'ch_1' }],
      volumes: [],
      flatChapters: [{ id: 'ch_1', title: '第一章' }],
      currentChapterIndex: 0,
      chapterLines: [{ lineIndex: 0, startOffset: 0, text: 'TXT 内容' }],
      collapsedVolumes: {},
      boundaryScrollState: null,
      contentRef: { current: null },
      readerStyle: {},
      progressLabel: '第一章',
      canGoPrev: false,
      canGoNext: true,
      prev: vi.fn(),
      next: vi.fn(),
      selectTocItem: vi.fn(),
      toggleVolume: vi.fn(),
      expandAll: vi.fn(),
      collapseAll: vi.fn(),
    });

    useEpubReaderEngineMock.mockReturnValue({
      type: 'epub',
      loading: false,
      error: '',
      toc: [{ label: '目录', href: 'epub-1' }],
      currentLocation: null,
      contentRef: { current: null },
      progressLabel: '24%',
      prev: vi.fn(),
      next: vi.fn(),
      canGoPrev: true,
      canGoNext: true,
      selectTocItem: vi.fn(),
    });
  });

  it('在 TXT 模式下使用 TXT 引擎渲染内容和底栏', () => {
    useReaderBookMock.mockReturnValue({
      bookMeta: { id: 'txt_1', type: 'txt' },
      setBookMeta: vi.fn(),
      loading: false,
      error: '',
    });

    render(
      <BookReader
        bookId="txt_1"
        settings={defaultSettings}
        onProgressUpdate={vi.fn()}
        onProgressFlush={vi.fn()}
        zenMode={false}
        onToggleZenMode={vi.fn()}
      />,
    );

    expect(screen.getByText('TXT 内容')).toBeInTheDocument();
    expect(screen.getByText('第一章')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '下一章' })).toBeInTheDocument();
  });

  it('在 EPUB 模式加载中时保留容器并显示加载态', () => {
    useReaderBookMock.mockReturnValue({
      bookMeta: { id: 'epub_1', type: 'epub' },
      setBookMeta: vi.fn(),
      loading: false,
      error: '',
    });

    useEpubReaderEngineMock.mockReturnValue({
      type: 'epub',
      loading: true,
      error: '',
      toc: [],
      currentLocation: null,
      contentRef: { current: null },
      progressLabel: '',
      prev: vi.fn(),
      next: vi.fn(),
      canGoPrev: true,
      canGoNext: true,
      selectTocItem: vi.fn(),
    });

    const { container } = render(
      <BookReader
        bookId="epub_1"
        settings={defaultSettings}
        onProgressUpdate={vi.fn()}
        onProgressFlush={vi.fn()}
        zenMode={false}
        onToggleZenMode={vi.fn()}
      />,
    );

    expect(screen.getByText('加载中...')).toBeInTheDocument();
    expect(container.querySelector('.epub-container')).toBeInTheDocument();
  });
});
