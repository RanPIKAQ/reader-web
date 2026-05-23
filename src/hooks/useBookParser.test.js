import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { parseTxtChapters, useBookParser } from './useBookParser';

const { parseEpubAssetMock, buildTxtBookRecordMock, buildEpubBookRecordMock } = vi.hoisted(() => ({
  parseEpubAssetMock: vi.fn(),
  buildTxtBookRecordMock: vi.fn(),
  buildEpubBookRecordMock: vi.fn(),
}));

vi.mock('../utils/epub', () => ({
  parseEpubAsset: parseEpubAssetMock,
}));

vi.mock('../utils/book', () => ({
  buildTxtBookRecord: buildTxtBookRecordMock,
  buildEpubBookRecord: buildEpubBookRecordMock,
}));

describe('parseTxtChapters', () => {
  it('能解析卷和章节结构', () => {
    const text = [
      '第1卷 开始',
      '第1章 第一章',
      '正文 A',
      '第2章 第二章',
      '正文 B',
    ].join('\n');

    const result = parseTxtChapters(text);

    expect(result.volumes).toHaveLength(1);
    expect(result.volumes[0].title).toBe('第1卷 开始');
    expect(result.volumes[0].children).toHaveLength(2);
    expect(result.flatChapters.map((chapter) => chapter.title)).toEqual([
      '第1章 第一章',
      '第2章 第二章',
    ]);
  });

  it('未命中章节时回退为全文单章', () => {
    const text = '没有章节标题的正文';
    const result = parseTxtChapters(text);

    expect(result.volumes).toHaveLength(1);
    expect(result.flatChapters).toHaveLength(1);
    expect(result.flatChapters[0].title).toBe('全文');
    expect(result.flatChapters[0].end).toBe(text.length);
  });
});

describe('useBookParser.parseFile', () => {
  beforeEach(() => {
    parseEpubAssetMock.mockReset();
    buildTxtBookRecordMock.mockReset();
    buildEpubBookRecordMock.mockReset();
  });

  it('成功解析 TXT 文件并返回 book/asset/navigation', async () => {
    const txtFile = new File(['第1章\n正文内容'], '测试.txt', { type: 'text/plain' });
    buildTxtBookRecordMock.mockReturnValue({
      id: 'txt_book_1',
      type: 'txt',
      title: '测试',
      author: '未知作者',
      toc: [{ label: '第1章', href: 'ch_0' }],
      volumes: [],
      flatChapters: [{ id: 'ch_0', title: '第1章', start: 0, end: 12 }],
      addedAt: 123,
    });

    const { result } = renderHook(() => useBookParser());

    let parseResult;
    await act(async () => {
      parseResult = await result.current.parseFile(txtFile);
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(parseResult.book).toMatchObject({ type: 'txt', title: '测试' });
    expect(parseResult.asset).toEqual({ kind: 'txt', text: '第1章\n正文内容' });
    expect(parseResult.navigation.flatChapters).toHaveLength(1);
    expect(result.current.book).not.toBeNull();
  });

  it('成功解析 EPUB 文件并返回 book/asset/navigation', async () => {
    const epubFile = new File(['epub content'], '书籍.epub', { type: 'application/epub+zip' });
    parseEpubAssetMock.mockResolvedValue({
      title: 'EPUB 书籍',
      author: '作者 X',
      cover: 'data:cover',
      toc: [{ href: 'ch1', label: '章节1' }],
    });
    buildEpubBookRecordMock.mockReturnValue({
      id: 'epub_book_1',
      type: 'epub',
      title: 'EPUB 书籍',
      author: '作者 X',
      toc: [{ href: 'ch1', label: '章节1' }],
      cover: 'data:cover',
      addedAt: 123,
    });

    const { result } = renderHook(() => useBookParser());

    let parseResult;
    await act(async () => {
      parseResult = await result.current.parseFile(epubFile);
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(parseResult.book).toMatchObject({ type: 'epub', title: 'EPUB 书籍' });
    expect(parseResult.asset).toMatchObject({ kind: 'epub' });
    expect(parseResult.navigation.toc).toHaveLength(1);
  });

  it('不支持的文件格式返回 null 并设置 error', async () => {
    const pdfFile = new File(['pdf content'], '文档.pdf', { type: 'application/pdf' });

    const { result } = renderHook(() => useBookParser());

    let parseResult;
    await act(async () => {
      parseResult = await result.current.parseFile(pdfFile);
    });

    await waitFor(() => {
      expect(result.current.error).toBe('不支持的文件格式');
    });

    expect(parseResult).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it('文件读取失败时捕获异常并设置 error', async () => {
    const brokenFile = new File([''], 'broken.txt', { type: 'text/plain' });
    Object.defineProperty(brokenFile, 'text', {
      value: () => Promise.reject(new Error('读取文件失败')),
    });

    const { result } = renderHook(() => useBookParser());

    let parseResult;
    await act(async () => {
      parseResult = await result.current.parseFile(brokenFile);
    });

    await waitFor(() => {
      expect(result.current.error).toBe('读取文件失败');
    });

    expect(parseResult).toBeNull();
    expect(result.current.loading).toBe(false);
  });
});
