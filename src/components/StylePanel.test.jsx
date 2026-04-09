import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import StylePanel from './StylePanel';

const defaultSettings = {
  fontSize: 18,
  fontFamily: 'Georgia, serif',
  fontWeight: 400,
  lineHeight: 1.6,
  theme: 'day',
  customTextColor: null,
  customBgColor: null,
  customTextColors: [],
  customBgColors: [],
  pageMode: 'scroll',
  contentWidth: 100,
};

describe('StylePanel', () => {
  it('支持切换 tab 并透传设置更新', () => {
    const onUpdate = vi.fn();

    render(
      <StylePanel
        settings={defaultSettings}
        onUpdate={onUpdate}
        onClose={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: '布局' }));
    fireEvent.click(screen.getByRole('button', { name: '60%' }));

    expect(screen.getByText('内容宽度: 100%')).toBeInTheDocument();
    expect(onUpdate).toHaveBeenCalledWith({ contentWidth: 60 });
  });
});
