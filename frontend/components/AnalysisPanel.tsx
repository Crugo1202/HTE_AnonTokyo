import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { FluctuationWindow } from '@/types/api';
import { COLORS, FONTS } from '@/utils/constants';

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
    backgroundColor: COLORS.BACKGROUND,
    padding: 16,
  },
  title: {
    fontSize: 20,
    fontFamily: FONTS.INTER,
    color: COLORS.TEXT,
    fontWeight: '600',
    marginBottom: 24,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 32,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    fontFamily: FONTS.INTER,
    color: COLORS.PLACEHOLDER,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  statValue: {
    fontSize: 24,
    fontFamily: FONTS.INTER,
    color: COLORS.TEXT,
    fontWeight: '600',
  },
  timelineContainer: {
    flex: 1,
  },
  timelineTitle: {
    fontSize: 16,
    fontFamily: FONTS.INTER,
    color: COLORS.TEXT,
    fontWeight: '500',
    marginBottom: 16,
  },
  timelineScroll: {
    flex: 1,
  },
  timelineItem: {
    marginBottom: 16,
  },
  timelineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  timelineTime: {
    fontSize: 12,
    fontFamily: FONTS.INTER,
    color: COLORS.TEXT,
  },
  timelineScore: {
    fontSize: 14,
    fontFamily: FONTS.INTER,
    color: COLORS.TEXT,
    fontWeight: '600',
  },
  scoreBarContainer: {
    height: 4,
    backgroundColor: COLORS.BORDER,
    width: '100%',
  },
  scoreBar: {
    height: '100%',
    backgroundColor: COLORS.TEXT,
  },
});
