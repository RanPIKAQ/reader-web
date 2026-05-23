import { describe, expect, it } from 'vitest';
import { normalizeBookRecord } from './book';

describe('normalizeBookRecord', () => {
  it('完整 TXT 书籍记录被正确规范化', () => {
    const result = normalizeBookRecord({
      id: 'book_1',
      type: 'txt',
      title: '测试书籍',
      author: '作者',
      fileName: 'test.txt',
      addedAt: 100,
      volumes: [
        {
          id: 'vol_0',
          title: '第一卷',
          type: 'volume',
          children: [
            { id: 'ch_0', title: '第一章', start: 0, end: 100 },
          ],
        },
      ],
      flatChapters: [
        { id: 'ch_0', title: '第一章', start: 0, end: 100 },
      ],
    });

    expect(result).not.toBeNull();
    expect(result.type).toBe('txt');
    expect(result.title).toBe('测试书籍');
    expect(result.author).toBe('作者');
    expect(result.volumes).toHaveLength(1);
    expect(result.flatChapters).toHaveLength(1);
    expect(result.flatChapters[0].title).toBe('第一章');
    expect(result.toc).toHaveLength(1);
    expect(result.toc[0]).toEqual({ label: '第一章', href: 'ch_0' });
    expect(result.schemaVersion).toBe(2);
  });

  it('完整 EPUB 书籍记录被正确规范化', () => {
    const result = normalizeBookRecord({
      id: 'epub_1',
      type: 'epub',
      title: 'EPUB 书',
      author: '作者B',
      fileName: 'book.epub',
      addedAt: 200,
      cover: 'data:cover',
      toc: [{ href: 'ch1', label: '章节1' }],
      locationMap: 'base64loc',
    });

    expect(result).not.toBeNull();
    expect(result.type).toBe('epub');
    expect(result.title).toBe('EPUB 书');
    expect(result.author).toBe('作者B');
    expect(result.cover).toBe('data:cover');
    expect(result.toc).toHaveLength(1);
    expect(result.locationMap).toBe('base64loc');
  });

  it('null 入参返回 null', () => {
    expect(normalizeBookRecord(null)).toBeNull();
  });

  it('undefined 入参返回 null', () => {
    expect(normalizeBookRecord(undefined)).toBeNull();
  });

  it('非 object 入参返回 null', () => {
    expect(normalizeBookRecord('string')).toBeNull();
    expect(normalizeBookRecord(42)).toBeNull();
    expect(normalizeBookRecord(true)).toBeNull();
  });

  it('缺失字段被填充为默认值', () => {
    const result = normalizeBookRecord({ id: 'book_1', type: 'txt' });

    expect(result.title).toBe('未命名书籍');
    expect(result.author).toBe('未知作者');
    expect(result.addedAt).toBeGreaterThan(0);
    expect(result.volumes).toEqual([]);
    expect(result.flatChapters).toEqual([]);
    expect(result.toc).toEqual([]);
    expect(result.cover).toBeNull();
    expect(result.favorite).toBe(false);
    expect(result.lastReadAt).toBeNull();
    expect(result.finishedAt).toBeNull();
    expect(result.totalReadingMinutes).toBe(0);
  });
});
