import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
const {
  getBookDataMock,
  getBookAssetMock,
  getReadingProgressMock,
  saveBookDataMock,
} = vi.hoisted(() => ({
  getBookDataMock: vi.fn(),
  getBookAssetMock: vi.fn(),
  getReadingProgressMock: vi.fn(),
  saveBookDataMock: vi.fn(),
}));

vi.mock('../utils/storage', () => ({
  getBookData: getBookDataMock,
  getBookAsset: getBookAssetMock,
  getReadingProgress: getReadingProgressMock,
  saveBookData: saveBookDataMock,
}));

import BookReader from './BookReader';

describe('BookReader', () => {
  beforeEach(() => {
    getBookDataMock.mockReset();
    getBookAssetMock.mockReset();
    getReadingProgressMock.mockReset();
    saveBookDataMock.mockReset();
  });

  it('缺失 EPUB 源文件时显示明确错误', async () => {
    getBookDataMock.mockResolvedValue({
      id: 'epub_1',
      type: 'epub',
      title: '测试 EPUB',
      author: '作者',
      toc: [],
      assetMissingMessage: null,
    });
    getBookAssetMock.mockResolvedValue(null);
    getReadingProgressMock.mockResolvedValue(null);
    saveBookDataMock.mockResolvedValue(null);

    render(
      <BookReader
        bookId="epub_1"
        settings={{
          fontSize: 18,
          fontFamily: 'Georgia, serif',
          fontWeight: 400,
          lineHeight: 1.6,
          theme: 'day',
          customTextColor: null,
          customBgColor: null,
          contentWidth: 100,
        }}
        onProgressUpdate={vi.fn()}
        onProgressFlush={vi.fn()}
        zenMode={false}
        onToggleZenMode={vi.fn()}
      />
    );

    expect(await screen.findByText('EPUB 源文件缺失，请重新导入该书籍。')).toBeInTheDocument();
    expect(saveBookDataMock).toHaveBeenCalledWith('epub_1', expect.objectContaining({
      assetMissing: true,
    }));
  });
});
