import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import BrandMark from './BrandMark';
import { tagline, brand, colors, useAppTypography } from '../theme';

export default function BrandLockup({ orientation = 'vertical', size = 80, animated = false }) {
  const { i18n } = useTranslation();
  const typography = useAppTypography();
  const isTe = i18n.language === 'te';
  
  const currentTagline = tagline[i18n.language] || tagline.en;
  
  const displayFont = isTe ? 'NotoSansTelugu_700Bold' : 'RozhaOne_400Regular';
  
  const isVertical = orientation === 'vertical';

  return (
    <View style={[styles.container, isVertical ? styles.vertical : styles.horizontal]}>
      <BrandMark size={size} animated={animated} />
      <View style={[styles.textBlock, isVertical ? styles.textVertical : styles.textHorizontal]}>
        <Text style={[styles.title, { fontFamily: displayFont }]}>
          Smart Agriculture / स्मार्ट कृषि
        </Text>
        <Text style={[styles.tagline, { fontFamily: displayFont }]}>
          {currentTagline}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  vertical: {
    flexDirection: 'column',
  },
  horizontal: {
    flexDirection: 'row',
  },
  textBlock: {
    justifyContent: 'center',
  },
  textVertical: {
    alignItems: 'center',
    marginTop: 16,
  },
  textHorizontal: {
    alignItems: 'flex-start',
    marginLeft: 16,
  },
  title: {
    fontSize: 22,
    color: brand.haldi,
    textAlign: 'center',
    marginBottom: 4,
  },
  tagline: {
    fontSize: 16,
    color: brand.chawal,
    textAlign: 'center',
  }
});
