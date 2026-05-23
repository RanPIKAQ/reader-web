import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  clearTimer,
  formatHexColor,
  getVisibleCustomColors,
  isDefaultThemeColor,
  normalizeColor,
  parseHexInput,
} from './colorUtils';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('normalizeColor', () => {
  it('去除首尾空白并转为小写', () => {
    expect(normalizeColor('  #FF0000  ')).toBe('#ff0000');
  });

  it('空值返回空字符串', () => {
    expect(normalizeColor('')).toBe('');
    expect(normalizeColor(null)).toBe('');
    expect(normalizeColor(undefined)).toBe('');
  });
});

describe('formatHexColor', () => {
  it('标准 #RRGGBB 格式转为大写', () => {
    expect(formatHexColor('#ff0000')).toBe('#FF0000');
    expect(formatHexColor('#FF0000')).toBe('#FF0000');
  });

  it('无 # 前缀的 6 位 hex 自动补全', () => {
    expect(formatHexColor('ff0000')).toBe('#FF0000');
    expect(formatHexColor('FF0000')).toBe('#FF0000');
  });

  it('无效格式返回 fallback', () => {
    expect(formatHexColor('red')).toBe('#000000');
    expect(formatHexColor('#12345')).toBe('#000000');
    expect(formatHexColor('')).toBe('#000000');
  });

  it('可选自定义 fallback', () => {
    expect(formatHexColor('invalid', '#FFFFFF')).toBe('#FFFFFF');
  });
});

describe('parseHexInput', () => {
  it('空输入返回 empty', () => {
    expect(parseHexInput('')).toEqual({ kind: 'empty' });
    expect(parseHexInput('   ')).toEqual({ kind: 'empty' });
  });

  it('标准 6 位 hex 返回 valid', () => {
    expect(parseHexInput('#FF0000')).toEqual({ kind: 'valid', value: '#FF0000' });
    expect(parseHexInput('FF0000')).toEqual({ kind: 'valid', value: '#FF0000' });
  });

  it('不完整的 hex 返回 partial', () => {
    expect(parseHexInput('#FF0')).toEqual({ kind: 'partial' });
    expect(parseHexInput('FF0')).toEqual({ kind: 'partial' });
    expect(parseHexInput('#12345')).toEqual({ kind: 'partial' });
  });

  it('无效输入返回 invalid', () => {
    expect(parseHexInput('red')).toEqual({ kind: 'invalid' });
    expect(parseHexInput('#GGGGGG')).toEqual({ kind: 'invalid' });
    expect(parseHexInput('1234567')).toEqual({ kind: 'invalid' });
  });
});

describe('isDefaultThemeColor', () => {
  it('空值与默认颜色匹配', () => {
    expect(isDefaultThemeColor('', '#FF0000')).toBe(true);
    expect(isDefaultThemeColor(null, '#FF0000')).toBe(true);
  });

  it('相同颜色忽略大小写匹配', () => {
    expect(isDefaultThemeColor('#ff0000', '#FF0000')).toBe(true);
  });

  it('不同颜色不匹配', () => {
    expect(isDefaultThemeColor('#00FF00', '#FF0000')).toBe(false);
  });
});

describe('getVisibleCustomColors', () => {
  it('过滤默认颜色', () => {
    const result = getVisibleCustomColors(
      ['#FF0000', '#0000FF', '#000000'],
      '#0000FF',
    );
    expect(result).toEqual(['#FF0000', '#000000']);
  });

  it('过滤重复颜色', () => {
    const result = getVisibleCustomColors(
      ['#FF0000', '#ff0000', '#FF0000'],
      '#000000',
    );
    expect(result).toEqual(['#FF0000']);
  });

  it('空数组返回空结果', () => {
    expect(getVisibleCustomColors([], '#000000')).toEqual([]);
    expect(getVisibleCustomColors(null, '#000000')).toEqual([]);
  });

  it('格式化后与默认颜色匹配时同样过滤', () => {
    const result = getVisibleCustomColors(
      ['ff0000'],
      '#FF0000',
    );
    expect(result).toEqual([]);
  });
});

describe('clearTimer', () => {
  it('清除未过期的定时器并置 null', () => {
    const timerRef = { current: 999 };
    const clearSpy = vi.spyOn(window, 'clearTimeout');

    clearTimer(timerRef);

    expect(clearSpy).toHaveBeenCalledWith(999);
    expect(timerRef.current).toBeNull();
  });

  it('timerRef 为 null 时无操作', () => {
    const timerRef = { current: null };
    const clearSpy = vi.spyOn(window, 'clearTimeout');

    clearTimer(timerRef);

    expect(clearSpy).not.toHaveBeenCalled();
    expect(timerRef.current).toBeNull();
  });
});
