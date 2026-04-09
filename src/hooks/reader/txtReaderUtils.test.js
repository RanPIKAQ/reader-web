import { describe, expect, it } from 'vitest';
import {
  createCollapsedVolumeState,
  resolveTxtRestoreScrollTop,
} from './txtReaderUtils';

const readerSettings = {
  fontSize: 18,
  fontFamily: 'Georgia, serif',
  fontWeight: 400,
  lineHeight: 1.6,
  contentWidth: 100,
};

describe('txtReaderUtils', () => {
  it('为所有卷创建默认折叠状态', () => {
    expect(createCollapsedVolumeState([
      { id: 'vol_1' },
      { id: 'vol_2' },
    ])).toEqual({
      vol_1: true,
      vol_2: true,
    });
  });

  it('布局指纹一致时优先恢复原始 scrollTop', () => {
    const content = {
      scrollHeight: 1400,
      clientHeight: 400,
      children: [],
    };

    expect(resolveTxtRestoreScrollTop({
      content,
      lines: [],
      settings: readerSettings,
      pendingRestore: {
        mode: 'saved',
        savedPosition: {
          scrollTop: 280,
          layoutFingerprint: readerSettings,
        },
      },
    })).toBe(280);
  });

  it('布局变化时根据匹配行恢复阅读位置', () => {
    const content = {
      scrollHeight: 1400,
      clientHeight: 400,
      children: [
        { offsetTop: 0, offsetHeight: 24 },
        { offsetTop: 320, offsetHeight: 40 },
      ],
    };
    const lines = [
      { lineIndex: 0, startOffset: 0, text: '第一行' },
      { lineIndex: 1, startOffset: 5, text: '第二行内容' },
    ];

    expect(resolveTxtRestoreScrollTop({
      content,
      lines,
      settings: {
        ...readerSettings,
        fontSize: 20,
      },
      pendingRestore: {
        mode: 'saved',
        savedPosition: {
          lineIndex: 1,
          lineStartOffset: 5,
          lineOffsetRatio: 0.5,
          anchorText: '第二行',
          layoutFingerprint: readerSettings,
        },
      },
    })).toBe(140);
  });

  it('找不到匹配行时回退到 scrollRatio', () => {
    const content = {
      scrollHeight: 1200,
      clientHeight: 400,
      children: [],
    };

    expect(resolveTxtRestoreScrollTop({
      content,
      lines: [],
      settings: {
        ...readerSettings,
        contentWidth: 90,
      },
      pendingRestore: {
        mode: 'saved',
        savedPosition: {
          lineIndex: 8,
          lineStartOffset: 108,
          anchorText: '不存在',
          scrollRatio: 0.25,
          layoutFingerprint: readerSettings,
        },
      },
    })).toBe(200);
  });
});
