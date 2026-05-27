import type { GlobalThemeOverrides } from 'naive-ui'

/** Rounded Latin/JP stack; CJK falls back to system UI. */
const animeFont =
  '"M PLUS Rounded 1c", "Hiragino Maru Gothic ProN", "Yu Gothic UI", "Microsoft YaHei UI", system-ui, sans-serif'

const accentPink = '#e66a9b'
const accentPinkHover = '#d96190'
const accentPinkPressed = '#bf567f'
const accentPinkSuppl = '#f0a0c0'
const infoMuted = '#927080'

export const animeThemeOverridesLight: GlobalThemeOverrides = {
  common: {
    primaryColor: accentPink,
    primaryColorHover: accentPinkHover,
    primaryColorPressed: accentPinkPressed,
    primaryColorSuppl: accentPinkSuppl,
    infoColor: infoMuted,
    infoColorHover: '#836271',
    successColor: '#3d9e72',
    successColorHover: '#358f66',
    warningColor: '#e8a838',
    warningColorHover: '#d9982a',
    errorColor: '#d94a6a',
    errorColorHover: '#c43d5c',
    borderRadius: '14px',
    fontFamily: animeFont,
    bodyColor: '#fffafc',
    cardColor: '#ffffff',
    modalColor: '#ffffff',
    popoverColor: '#ffffff',
    tableColor: '#ffffff',
    textColor1: '#3d3138',
    textColor2: '#8c7a84',
    textColor3: 'rgba(61, 49, 56, 0.45)',
    actionColor: '#f5f2f4',
    hoverColor: '#00000008',
    borderColor: '#eadde3',
    dividerColor: '#eadde3',
  },
  Button: {
    borderRadiusMedium: '12px',
    borderRadiusLarge: '14px',
  },
  Input: {
    borderRadius: '12px',
  },
  Card: {
    borderRadius: '16px',
  },
  Tabs: {
    tabBorderRadius: '12px',
  },
  Tag: {
    borderRadius: '10px',
  },
  Layout: {
    color: 'transparent',
  },
}

export const animeThemeOverridesDark: GlobalThemeOverrides = {
  common: {
    primaryColor: '#ff7ab3',
    primaryColorHover: '#ff8fc1',
    primaryColorPressed: '#e86a9f',
    primaryColorSuppl: '#ffc0d9',
    infoColor: '#ffc0d9',
    infoColorHover: '#ffd0e3',
    successColor: '#5ccc9a',
    successColorHover: '#6dd4a5',
    warningColor: '#f0be5c',
    warningColorHover: '#f4c870',
    errorColor: '#f08090',
    errorColorHover: '#f498a5',
    borderRadius: '14px',
    fontFamily: animeFont,
    bodyColor: '#151322',
    cardColor: '#1f1b2b',
    modalColor: '#1f1b2b',
    popoverColor: '#282437',
    tableColor: '#1f1b2b',
    textColor1: '#f5edf3',
    textColor2: '#b8aabd',
    textColor3: 'rgba(184, 170, 189, 0.72)',
    textColorDisabled: 'rgba(184, 170, 189, 0.45)',
    placeholderColor: '#9d91a6',
    borderColor: '#3a3348',
    dividerColor: '#3a3348',
    actionColor: '#282437',
    hoverColor: '#332d42',
  },
  Button: {
    borderRadiusMedium: '12px',
    borderRadiusLarge: '14px',
  },
  Input: {
    borderRadius: '12px',
  },
  Card: {
    borderRadius: '16px',
  },
  Tabs: {
    tabBorderRadius: '12px',
  },
  Tag: {
    borderRadius: '10px',
  },
  Layout: {
    color: 'transparent',
  },
}
