import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { COLORS, FONTS, SPACING } from '@/utils/constants';
import { useUser } from '@/context/UserContext';
import { useHeaderExtra } from '@/context/HeaderExtraContext';

const APP_TITLE = 'TeachingStudio.AI';

export default function AppHeader() {
  const { user, toggleAdmin, isAdmin } = useUser();
  const { overallScore } = useHeaderExtra();

  return (
    <View style={styles.header}>
      <Text style={styles.title}>{APP_TITLE}</Text>
      <View style={styles.headerRight}>
        {overallScore !== null && (
          <View style={styles.scoreBlock}>
            <Text style={styles.scoreLabel}>Overall Score</Text>
            <View style={styles.scoreValueBox}>
              <Text style={styles.scoreValue}>{overallScore}</Text>
            </View>
          </View>
        )}
        <TouchableOpacity
          style={styles.userPill}
          onPress={toggleAdmin}
          activeOpacity={0.8}
          accessibilityLabel={`Signed in as ${user.displayName}. ${isAdmin ? 'Admin mode. Tap to switch to user.' : 'Tap to switch to admin.'}`}
        >
          <Text style={styles.userIcon}>👤</Text>
          <Text style={styles.userName} numberOfLines={1}>
            {user.displayName}
            {isAdmin && user.displayName !== 'Admin' ? ' (Admin)' : ''}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.BACKGROUND,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
    minHeight: 56,
  },
  title: {
    fontFamily: FONTS.INTER,
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.TEXT,
    letterSpacing: -0.01,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scoreBlock: {
    alignItems: 'flex-end',
    marginRight: SPACING.sm,
  },
  scoreLabel: {
    fontFamily: FONTS.INTER,
    fontSize: 10,
    fontWeight: '500',
    letterSpacing: 0.1,
    color: COLORS.TEXT_TERTIARY,
    marginBottom: SPACING['2xs'],
  },
  scoreValueBox: {
    backgroundColor: COLORS.PRIMARY,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING['2xs'],
  },
  scoreValue: {
    fontFamily: FONTS.INTER,
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.TEXT_ON_PRIMARY,
  },
  userPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    backgroundColor: COLORS.SURFACE_1,
    maxWidth: 280,
  },
  userIcon: {
    fontSize: 16,
  },
  userName: {
    fontFamily: FONTS.INTER,
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.TEXT,
    letterSpacing: 0.02,
    marginLeft: SPACING.xs,
  },
});
