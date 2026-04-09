import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ReaderTocPanel from './ReaderTocPanel';

describe('ReaderTocPanel', () => {
  it('在 TXT 模式下支持卷展开和章节选择', () => {
    const onClose = vi.fn();
    const onSelectItem = vi.fn();
    const onToggleVolume = vi.fn();

    render(
      <ReaderTocPanel
        open
        isTxt
        toc={[]}
        volumes={[
          {
            id: 'vol_1',
            title: '正文',
            children: [{ id: 'ch_1', title: '第一章' }],
          },
        ]}
        collapsedVolumes={{ vol_1: false }}
        flatChapters={[{ id: 'ch_1', title: '第一章' }]}
        currentChapterIndex={0}
        onClose={onClose}
        onSelectItem={onSelectItem}
        onToggleVolume={onToggleVolume}
        onExpandAll={vi.fn()}
        onCollapseAll={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: '第一章' }));
    fireEvent.click(screen.getByRole('button', { name: /正文/ }));

    expect(onSelectItem).toHaveBeenCalledWith('ch_1');
    expect(onToggleVolume).toHaveBeenCalledWith('vol_1');
  });
});
