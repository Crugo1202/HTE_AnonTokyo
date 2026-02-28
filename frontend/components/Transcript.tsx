import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { COLORS, FONTS, SPACING } from '@/utils/constants';

interface TranscriptProps {
  transcript: string;
  isCollapsible?: boolean;
  defaultCollapsed?: boolean;
}

export default function Transcript({
  transcript,
  isCollapsible = false,
  defaultCollapsed = false,
}: TranscriptProps) {
  const [isCollapsed, setIsCollapsed] = useState(
    isCollapsible && defaultCollapsed
  );

  if (isCollapsible && isCollapsed) {
    return (
      <View style={styles.container}>
        <TouchableOpacity
          style={styles.header}
          onPress={() => setIsCollapsed(false)}
        >
          <Text style={styles.headerText}>Transcript</Text>
          <Text style={styles.toggleText}>Show</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {isCollapsible && (
        <TouchableOpacity
          style={styles.header}
          onPress={() => setIsCollapsed(true)}
        >
          <Text style={styles.headerText}>Transcript</Text>
          <Text style={styles.toggleText}>Hide</Text>
        </TouchableOpacity>
      )}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        <Text style={styles.text}>{transcript}</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.SURFACE_1,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    borderRadius: 0,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  headerText: {
    fontSize: 18,
    fontFamily: FONTS.INTER,
    fontWeight: '600',
    color: COLORS.TEXT,
  },
  toggleText: {
    fontSize: 10,
    fontFamily: FONTS.INTER,
    fontWeight: '500',
    letterSpacing: 0.1,
    lineHeight: 12,
    textTransform: 'uppercase',
    color: COLORS.TEXT_SECONDARY,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.sm,
  },
  text: {
    fontSize: 18,
    fontFamily: FONTS.INTER,
    fontWeight: '400',
    lineHeight: 32,
    color: COLORS.TEXT,
  },
});
