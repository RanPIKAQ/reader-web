import { describe, expect, it } from 'vitest';
import { parseTxtChapters } from './useBookParser';

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
