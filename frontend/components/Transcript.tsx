import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { COLORS, FONTS } from '@/utils/constants';

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
    backgroundColor: COLORS.BACKGROUND,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  headerText: {
    fontSize: 16,
    fontFamily: FONTS.INTER,
    color: COLORS.TEXT,
    fontWeight: '500',
  },
  toggleText: {
    fontSize: 14,
    fontFamily: FONTS.INTER,
    color: COLORS.TEXT,
    textTransform: 'uppercase',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  text: {
    fontSize: 14,
    fontFamily: FONTS.INTER,
    color: COLORS.TEXT,
    lineHeight: 22,
  },
});
