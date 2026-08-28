/**
 * Design tokens for the Smart Agriculture app.
 * Every colour, radius and spacing value used by a screen comes from here so
 * the look stays consistent and can be re-themed in one place.
 */

export const colors = {
  primary: '#1B7A3E',
  primaryDark: '#14602F',
  primarySoft: '#E8F5EC',
  accent: '#1FA34A',

  background: '#F4F7F5',
  surface: '#FFFFFF',
  surfaceAlt: '#F7FAF8',

  text: '#1C2B21',
  textSecondary: '#5F6F66',
  textMuted: '#8A9990',
  border: '#E3EAE5',

  white: '#FFFFFF',
  overlay: 'rgba(0,0,0,0.55)',

  risk: {
    HIGH: { fg: '#C62F1B', bg: '#FDECEA', border: '#F5C6BF', dot: '#E23D28' },
    MEDIUM: { fg: '#A66A00', bg: '#FEF6E7', border: '#F5DFB0', dot: '#F2A614' },
    LOW: { fg: '#1B7A3E', bg: '#EAF7EE', border: '#BEE3CB', dot: '#2E9E4F' },
    UNKNOWN: { fg: '#5F6F66', bg: '#EFF2F0', border: '#DCE3DE', dot: '#8A9990' }
  },

  zone: {
    HIGH_RISK: '#E23D28',
    MONITORING: '#F2A614',
    HEALTHY: '#2E9E4F'
  }
};

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };

export const radius = { sm: 8, md: 12, lg: 16, xl: 20, pill: 999 };

export const typography = {
  display: { fontSize: 30, fontWeight: '700', color: colors.text },
  title: { fontSize: 22, fontWeight: '700', color: colors.text },
  heading: { fontSize: 18, fontWeight: '700', color: colors.text },
  subheading: { fontSize: 16, fontWeight: '600', color: colors.text },
  body: { fontSize: 15, fontWeight: '400', color: colors.text },
  bodySecondary: { fontSize: 14, fontWeight: '400', color: colors.textSecondary },
  caption: { fontSize: 12, fontWeight: '500', color: colors.textMuted },
  button: { fontSize: 16, fontWeight: '700', color: colors.white }
};

export const shadow = {
  card: {
    shadowColor: '#0B2C18',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2
  },
  raised: {
    shadowColor: '#0B2C18',
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 6
  }
};

/** Resolve a risk level string to its palette, tolerating null/unknown. */
export const riskPalette = (level) => colors.risk[level] || colors.risk.UNKNOWN;

export default { colors, spacing, radius, typography, shadow, riskPalette };
