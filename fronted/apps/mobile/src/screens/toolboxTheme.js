const toolboxPalettes = Object.freeze({
  light: Object.freeze({
    background: '#ffffff',
    text: '#0f172a',
    muted: '#64748b',
    chevron: '#94a3b8',
    line: '#e2e8f0',
    pressed: '#f8fafc',
    iconBackground: '#e2e8f0',
    iconText: '#334155',
    controlBackground: '#ffffff',
    controlBorder: '#cbd5e1',
    controlText: '#334155',
  }),
  dark: Object.freeze({
    background: '#020617',
    text: '#f1f5f9',
    muted: '#94a3b8',
    chevron: '#64748b',
    line: '#1e293b',
    pressed: '#0f172a',
    iconBackground: '#1e293b',
    iconText: '#e2e8f0',
    controlBackground: '#0f172a',
    controlBorder: '#475569',
    controlText: '#f8fafc',
  }),
});

export const getToolboxPalette = mode =>
  toolboxPalettes[mode] ?? toolboxPalettes.light;
