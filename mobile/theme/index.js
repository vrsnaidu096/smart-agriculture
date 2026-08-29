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

/**
 * Brand palette — the Surya Kshetra identity.
 *
 * Kept SEPARATE from the UI `colors` above on purpose. These are the logo,
 * splash and marketing colours; the app chrome still runs on its own green
 * system. Migrating the UI onto indigo is a design decision, not a side effect
 * of adding a logo — so make it deliberately if you want it.
 */
export const brand = {
  neel:   '#131E36', // indigo ground
  neelDeep: '#0C1426', // splash / adaptive-icon background
  haldi:  '#E9A93C', // turmeric — primary accent
  dhaan:  '#45A46C', // paddy green — reserved for the crop
  mitti:  '#B05A31', // earth
  chawal: '#EFE7D5', // husked rice — text on dark
  dhundh: '#8493B0', // mist — secondary text on dark
};

/** The tagline, in the three languages the app already ships. */
export const tagline = {
  hi: 'जय जवान जय किसान',
  te: 'జై జవాన్ జై కిసాన్',
  en: 'Jai Jawan Jai Kisan',
};

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };
export const radius = { sm: 8, md: 12, lg: 16, xl: 20, pill: 999 };

// Fallback static typography using Mukta for backward compatibility where useTypography isn't used yet
export const typography = {
  display: { fontSize: 30, fontFamily: 'Mukta_700Bold', color: colors.text },
  title: { fontSize: 22, fontFamily: 'Mukta_700Bold', color: colors.text },
  heading: { fontSize: 18, fontFamily: 'Mukta_700Bold', color: colors.text },
  subheading: { fontSize: 16, fontFamily: 'Mukta_600SemiBold', color: colors.text },
  body: { fontSize: 15, fontFamily: 'Mukta_400Regular', color: colors.text },
  bodySecondary: { fontSize: 14, fontFamily: 'Mukta_400Regular', color: colors.textSecondary },
  caption: { fontSize: 12, fontFamily: 'Mukta_500Medium', color: colors.textMuted },
  button: { fontSize: 16, fontFamily: 'Mukta_700Bold', color: colors.white }
};

export const getTypography = (language) => {
  const isTe = language === 'te';
  return {
    display: { fontSize: 30, fontFamily: isTe ? 'NotoSansTelugu_700Bold' : 'Mukta_700Bold', color: colors.text },
    title: { fontSize: 22, fontFamily: isTe ? 'NotoSansTelugu_700Bold' : 'Mukta_700Bold', color: colors.text },
    heading: { fontSize: 18, fontFamily: isTe ? 'NotoSansTelugu_700Bold' : 'Mukta_700Bold', color: colors.text },
    subheading: { fontSize: 16, fontFamily: isTe ? 'NotoSansTelugu_600SemiBold' : 'Mukta_600SemiBold', color: colors.text },
    body: { fontSize: 15, fontFamily: isTe ? 'NotoSansTelugu_400Regular' : 'Mukta_400Regular', color: colors.text },
    bodySecondary: { fontSize: 14, fontFamily: isTe ? 'NotoSansTelugu_400Regular' : 'Mukta_400Regular', color: colors.textSecondary },
    caption: { fontSize: 12, fontFamily: isTe ? 'NotoSansTelugu_500Medium' : 'Mukta_500Medium', color: colors.textMuted },
    button: { fontSize: 16, fontFamily: isTe ? 'NotoSansTelugu_700Bold' : 'Mukta_700Bold', color: colors.white }
  };
};

export const useAppTypography = () => {
  // Try to use i18n hook, fallback to static if not in context
  try {
    const { useTranslation } = require('react-i18next');
    const { i18n } = useTranslation();
    return getTypography(i18n.language);
  } catch (e) {
    return typography;
  }
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

export default { colors, brand, tagline, spacing, radius, typography, shadow, riskPalette };
