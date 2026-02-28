import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, FONTS, SPACING } from '@/utils/constants';

export default function VideoPlaceholder() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>No video</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    backgroundColor: COLORS.SURFACE_1,
    aspectRatio: 16 / 9,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontFamily: FONTS.INTER,
    fontSize: 14,
    fontWeight: '400',
    color: COLORS.TEXT_TERTIARY,
  },
});
