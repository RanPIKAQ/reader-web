import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
const { saveSettingsMock, getSettingsMock } = vi.hoisted(() => ({
  saveSettingsMock: vi.fn(async () => undefined),
  getSettingsMock: vi.fn(async () => null),
}));

vi.mock('../utils/storage', () => ({
  DEFAULT_SETTINGS: {
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
    customFonts: [],
    paragraphSpacing: 0,
    paragraphIndent: 0,
  },
  getSettings: getSettingsMock,
  saveSettings: saveSettingsMock,
}));

import { useSettings } from './useSettings';

describe('useSettings', () => {
  beforeEach(() => {
    saveSettingsMock.mockClear();
    getSettingsMock.mockClear();
  });

  it('连续更新时不会丢失前一次设置', async () => {
    const { result } = renderHook(() => useSettings());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await Promise.all([
        result.current.updateSettings({ theme: 'sepia' }),
        result.current.updateSettings({ fontSize: 22 }),
      ]);
    });

    expect(result.current.settings).toMatchObject({
      theme: 'sepia',
      fontSize: 22,
    });
    expect(saveSettingsMock).toHaveBeenLastCalledWith(expect.objectContaining({
      theme: 'sepia',
      fontSize: 22,
    }));
  });
});
