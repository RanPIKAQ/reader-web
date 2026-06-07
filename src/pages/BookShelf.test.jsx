import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const {
  clearAllDataMock,
  exportAllDataMock,
  getBookshelfEntriesMock,
  importAllDataMock,
  removeBookMock,
} = vi.hoisted(() => ({
  clearAllDataMock: vi.fn(),
  exportAllDataMock: vi.fn(),
  getBookshelfEntriesMock: vi.fn(),
  importAllDataMock: vi.fn(),
  removeBookMock: vi.fn(),
}));

vi.mock('../utils/storage', () => ({
  clearAllData: clearAllDataMock,
  exportAllData: exportAllDataMock,
  getBookshelfEntries: getBookshelfEntriesMock,
  importAllData: importAllDataMock,
  removeBook: removeBookMock,
}));

import BookShelf from './BookShelf';

function renderBookShelf() {
  return render(
    <MemoryRouter>
      <BookShelf />
    </MemoryRouter>,
  );
}

describe('BookShelf', () => {
  beforeEach(() => {
    clearAllDataMock.mockReset();
    exportAllDataMock.mockReset();
    getBookshelfEntriesMock.mockReset();
    importAllDataMock.mockReset();
    removeBookMock.mockReset();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('使用聚合书架数据渲染阅读状态和缺失资源提示', async () => {
    getBookshelfEntriesMock.mockResolvedValue([
      {
        id: 'epub_1',
        title: '缺失资源',
        author: '作者 B',
        cover: null,
        progress: null,
        assetMissing: true,
        assetMissingMessage: 'EPUB 源文件缺失，请重新导入该书籍。',
      },
      {
        id: 'txt_1',
        title: '正常书籍',
        author: '作者 A',
        cover: null,
        progress: { percentage: 35 },
        assetMissing: false,
        assetMissingMessage: null,
      },
    ]);

    renderBookShelf();

    expect(await screen.findByText('正常书籍')).toBeInTheDocument();
    expect(screen.getByText('35%')).toBeInTheDocument();
    expect(screen.getByText('EPUB 源文件缺失，请重新导入该书籍。')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '继续阅读' })).toHaveAttribute('href', '/read/txt_1');
    expect(screen.getByRole('link', { name: '重新导入' })).toHaveAttribute('href', '/import');
  });

  it('导入无效备份文件时显示错误提示', async () => {
    getBookshelfEntriesMock.mockResolvedValue([]);

    const { container } = renderBookShelf();

    expect(await screen.findByText('还没有藏书')).toBeInTheDocument();

    const fileInput = container.querySelector('input[type="file"]');
    const invalidFile = new File(['{"invalid":true}'], 'backup.json', {
      type: 'application/json',
    });

    fireEvent.change(fileInput, {
      target: {
        files: [invalidFile],
      },
    });

    await waitFor(() => {
      expect(screen.getByText('无效的备份文件')).toBeInTheDocument();
    });

    expect(importAllDataMock).not.toHaveBeenCalled();
  });

  it('删除书籍后会重新加载书架', async () => {
    getBookshelfEntriesMock
      .mockResolvedValueOnce([
        {
          id: 'txt_1',
          title: '待删除书籍',
          author: '作者 A',
          cover: null,
          progress: null,
          assetMissing: false,
          assetMissingMessage: null,
        },
      ])
      .mockResolvedValueOnce([]);

    renderBookShelf();

    expect(await screen.findByText('待删除书籍')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '删除' }));

    await waitFor(() => {
      expect(removeBookMock).toHaveBeenCalledWith('txt_1');
    });
    await waitFor(() => {
      expect(screen.getByText('还没有藏书')).toBeInTheDocument();
    });
  });

  it('清除所有数据后直接清空书架', async () => {
    getBookshelfEntriesMock.mockResolvedValue([
      {
        id: 'txt_1',
        title: '待清空书籍',
        author: '作者 A',
        cover: null,
        progress: null,
        assetMissing: false,
        assetMissingMessage: null,
      },
    ]);

    renderBookShelf();

    expect(await screen.findByText('待清空书籍')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '清除所有数据' }));

    await waitFor(() => {
      expect(clearAllDataMock).toHaveBeenCalled();
    });
    expect(screen.getByText('数据已清空')).toBeInTheDocument();
    expect(screen.getByText('还没有藏书')).toBeInTheDocument();
  });
});
