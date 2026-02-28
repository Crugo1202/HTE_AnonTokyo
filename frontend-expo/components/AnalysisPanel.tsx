import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { FluctuationWindow } from '@/types/api';
import { COLORS, FONTS, SPACING } from '@/utils/constants';

interface AnalysisPanelProps {
  timeline: FluctuationWindow[];
}

export default function AnalysisPanel({ timeline }: AnalysisPanelProps) {
  const scores = timeline.map((w) => w.fluctuation_score);
  const average = scores.reduce((a, b) => a + b, 0) / scores.length;
  const min = Math.min(...scores);
  const max = Math.max(...scores);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Analysis</Text>
      
      <View style={styles.statsContainer}>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>Average</Text>
          <Text style={styles.statValue}>{average.toFixed(1)}</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>Minimum</Text>
          <Text style={styles.statValue}>{min.toFixed(1)}</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>Maximum</Text>
          <Text style={styles.statValue}>{max.toFixed(1)}</Text>
        </View>
      </View>

      <View style={styles.timelineContainer}>
        <Text style={styles.timelineTitle}>Fluctuation Timeline</Text>
        <ScrollView style={styles.timelineScroll}>
          {timeline.map((window, index) => (
            <View key={index} style={styles.timelineItem}>
              <View style={styles.timelineHeader}>
                <Text style={styles.timelineTime}>
                  {formatTime(window.timestamp_start)} - {formatTime(window.timestamp_end)}
                </Text>
                <Text style={styles.timelineScore}>
                  {window.fluctuation_score.toFixed(1)}
                </Text>
              </View>
              <View style={styles.scoreBarContainer}>
                <View
                  style={[
                    styles.scoreBar,
                    { width: `${window.fluctuation_score}%` },
                  ]}
                />
              </View>
            </View>
          ))}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.SURFACE_1,
    padding: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    borderRadius: 0,
  },
  title: {
    fontSize: 36,
    fontFamily: FONTS.INTER,
    fontWeight: '600',
    lineHeight: 44,
    letterSpacing: -0.01,
    color: COLORS.TEXT,
    marginBottom: SPACING.lg,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.xl,
    paddingBottom: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.xs,
    backgroundColor: COLORS.BACKGROUND,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    marginHorizontal: SPACING['2xs'],
  },
  statLabel: {
    fontSize: 10,
    fontFamily: FONTS.INTER,
    fontWeight: '500',
    letterSpacing: 0.1,
    lineHeight: 12,
    textTransform: 'uppercase',
    color: COLORS.TEXT_TERTIARY,
    marginBottom: SPACING['2xs'],
  },
  statValue: {
    fontSize: 36,
    fontFamily: FONTS.INTER,
    fontWeight: '700',
    lineHeight: 44,
    color: COLORS.TEXT,
  },
  timelineContainer: {
    flex: 1,
  },
  timelineTitle: {
    fontSize: 18,
    fontFamily: FONTS.INTER,
    fontWeight: '600',
    color: COLORS.TEXT,
    marginBottom: SPACING.md,
  },
  timelineScroll: {
    flex: 1,
  },
  timelineItem: {
    marginBottom: SPACING.md,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    backgroundColor: COLORS.BACKGROUND,
  },
  timelineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING['2xs'],
  },
  timelineTime: {
    fontSize: 12,
    fontFamily: FONTS.INTER,
    fontWeight: '400',
    letterSpacing: 0.02,
    color: COLORS.TEXT_SECONDARY,
  },
  timelineScore: {
    fontSize: 18,
    fontFamily: FONTS.INTER,
    fontWeight: '600',
    color: COLORS.TEXT,
  },
  scoreBarContainer: {
    height: 8,
    backgroundColor: COLORS.BORDER_DIVIDER,
    width: '100%',
  },
  scoreBar: {
    height: '100%',
    backgroundColor: COLORS.ACCENT,
  },
});
