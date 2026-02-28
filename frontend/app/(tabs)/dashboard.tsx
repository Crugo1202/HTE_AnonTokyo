import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  Platform,
  ScrollView,
  TouchableOpacity,
  Text,
  useWindowDimensions,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import VideoPreview from '@/components/VideoPreview';
import Transcript from '@/components/Transcript';
import AnalysisPanel from '@/components/AnalysisPanel';
import { FluctuationWindow } from '@/types/api';
import { COLORS, FONTS, SPACING } from '@/utils/constants';

export default function DashboardScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const [transcript, setTranscript] = useState<string>('');
  const [timeline, setTimeline] = useState<FluctuationWindow[]>([]);
  const [videoUri, setVideoUri] = useState<string>('');

  useEffect(() => {
    if (params.transcript) {
      setTranscript(params.transcript as string);
    }
    if (params.timeline) {
      try {
        const parsed = JSON.parse(params.timeline as string);
        setTimeline(parsed);
      } catch (error) {
        console.error('Error parsing timeline:', error);
      }
    }
    if (params.videoUri) {
      setVideoUri(params.videoUri as string);
    }
  }, [params]);

  const handleUploadNew = () => {
    router.push('/(tabs)/');
  };

  if (!transcript || timeline.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.emptyText}>No analysis data available</Text>
        <TouchableOpacity style={styles.button} onPress={handleUploadNew} activeOpacity={0.9}>
          <Text style={styles.buttonText}>Upload New Video</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (isMobile) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        {videoUri && (
          <View style={styles.mobileVideoContainer}>
            <VideoPreview uri={videoUri} />
          </View>
        )}
        <View style={styles.mobileTranscriptContainer}>
          <Transcript
            transcript={transcript}
            isCollapsible={true}
            defaultCollapsed={true}
          />
        </View>
        <View style={styles.mobileAnalysisContainer}>
          <AnalysisPanel timeline={timeline} />
        </View>
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.button} onPress={handleUploadNew} activeOpacity={0.9}>
            <Text style={styles.buttonText}>Upload New Video</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.webLayout}>
        <View style={styles.leftColumn}>
          {videoUri && (
            <View style={styles.videoContainer}>
              <VideoPreview uri={videoUri} />
            </View>
          )}
          <View style={styles.transcriptContainer}>
            <Transcript transcript={transcript} />
          </View>
        </View>
        <View style={styles.rightColumn}>
          <AnalysisPanel timeline={timeline} />
        </View>
      </View>
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.button} onPress={handleUploadNew} activeOpacity={0.9}>
          <Text style={styles.buttonText}>Upload New Video</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND,
  },
  scrollContent: {
    paddingBottom: SPACING.lg,
    paddingHorizontal: SPACING.md,
  },
  webLayout: {
    flex: 1,
    flexDirection: 'row',
    maxWidth: 1280,
    alignSelf: 'center',
    width: '100%',
  },
  leftColumn: {
    flex: 1,
    borderRightWidth: 1,
    borderRightColor: COLORS.BORDER,
  },
  rightColumn: {
    flex: 1,
  },
  videoContainer: {
    padding: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
    backgroundColor: COLORS.SURFACE_1,
  },
  mobileVideoContainer: {
    width: '100%',
    marginBottom: SPACING.md,
  },
  transcriptContainer: {
    flex: 1,
    padding: SPACING.sm,
  },
  mobileTranscriptContainer: {
    width: '100%',
    marginBottom: SPACING.md,
  },
  mobileAnalysisContainer: {
    width: '100%',
    paddingHorizontal: SPACING.md,
  },
  buttonContainer: {
    padding: SPACING.md,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: COLORS.BORDER,
  },
  button: {
    backgroundColor: COLORS.PRIMARY,
    paddingHorizontal: SPACING.md,
    height: 40,
    minWidth: 160,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 0,
  },
  buttonText: {
    color: COLORS.TEXT_ON_PRIMARY,
    fontSize: 16,
    fontFamily: FONTS.INTER,
    fontWeight: '600',
  },
  emptyText: {
    fontSize: 18,
    fontFamily: FONTS.INTER,
    color: COLORS.TEXT_SECONDARY,
    textAlign: 'center',
    marginBottom: SPACING.lg,
  },
});
