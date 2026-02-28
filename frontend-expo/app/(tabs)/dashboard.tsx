import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Text,
  useWindowDimensions,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import VideoPreview from '@/components/VideoPreview';
import VideoPlaceholder from '@/components/VideoPlaceholder';
import Transcript from '@/components/Transcript';
import AnalysisPanel from '@/components/AnalysisPanel';
import { useHeaderExtra } from '@/context/HeaderExtraContext';
import { FluctuationWindow } from '@/types/api';
import { COLORS, FONTS, SPACING } from '@/utils/constants';

const TEMPLATE_FILE_NAME = 'file_name';
const TEMPLATE_SUMMARY =
  'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.';
const TEMPLATE_TRANSCRIPT = '00:01 - hey, this it\n00:20 - Yes';

export default function DashboardScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const { setOverallScore } = useHeaderExtra();
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const [transcript, setTranscript] = useState<string>('');
  const [timeline, setTimeline] = useState<FluctuationWindow[]>([]);
  const [videoUri, setVideoUri] = useState<string>('');

  const hasAnalysis = Boolean(transcript && timeline.length > 0 && videoUri);

  useEffect(() => {
    if (params.transcript) setTranscript(params.transcript as string);
    if (params.timeline) {
      try {
        setTimeline(JSON.parse(params.timeline as string));
      } catch {
        setTimeline([]);
      }
    }
    if (params.videoUri) setVideoUri(params.videoUri as string);
  }, [params]);

  useEffect(() => {
    if (hasAnalysis) {
      const scores = timeline.map((w) => w.fluctuation_score);
      const avg = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
      setOverallScore(`${avg.toFixed(1)}/10`);
    } else {
      setOverallScore('—');
    }
    return () => setOverallScore(null);
  }, [hasAnalysis, timeline, setOverallScore]);

  const handleUploadNew = () => {
    router.push('/(tabs)/');
  };

  const fileName = hasAnalysis ? (params.fileName as string) || 'Recording' : TEMPLATE_FILE_NAME;
  const summaryText = hasAnalysis ? '' : TEMPLATE_SUMMARY;
  const transcriptText = hasAnalysis ? transcript : TEMPLATE_TRANSCRIPT;

  const leftContent = (
    <>
      <View style={styles.section}>
        <Text style={styles.fileLabel}>File analyzed: {fileName}</Text>
      </View>
      <View style={styles.videoSection}>
        {videoUri ? (
          <VideoPreview uri={videoUri} />
        ) : (
          <VideoPlaceholder />
        )}
      </View>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>AI Summary</Text>
        <Text style={styles.bodyText}>
          {summaryText || 'Summary will appear here after analysis.'}
        </Text>
      </View>
      <View style={styles.transcriptSection}>
        <Transcript transcript={transcriptText} />
      </View>
    </>
  );

  const rightContent = hasAnalysis ? (
    <AnalysisPanel timeline={timeline} />
  ) : (
    <View style={styles.analysisTemplate}>
      <Text style={styles.analysisTitle}>Analysis</Text>
      <View style={styles.templateSection}>
        <Text style={styles.sectionTitle}>Tone</Text>
        <Text style={styles.bodyText}>You spoke very____</Text>
      </View>
      <View style={styles.templateSection}>
        <Text style={styles.sectionTitle}>Areas of improvement</Text>
        <View style={styles.bulletList}>
          <Text style={styles.bulletItem}>1</Text>
          <Text style={styles.bulletItem}>2</Text>
          <Text style={styles.bulletItem}>3</Text>
        </View>
      </View>
    </View>
  );

  if (isMobile) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        <View style={styles.mobileContent}>
          {leftContent}
          <View style={styles.rightColumn}>{rightContent}</View>
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
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.webLayout}>
          <View style={styles.leftColumn}>{leftContent}</View>
          <View style={styles.rightColumn}>{rightContent}</View>
        </View>
      </ScrollView>
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
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: SPACING.lg,
  },
  webLayout: {
    flexDirection: 'row',
    maxWidth: 1280,
    alignSelf: 'center',
    width: '100%',
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.lg,
  },
  leftColumn: {
    flex: 1,
    minWidth: 0,
    paddingRight: SPACING.lg,
    borderRightWidth: 1,
    borderRightColor: COLORS.BORDER,
  },
  rightColumn: {
    flex: 1,
    minWidth: 0,
    paddingLeft: SPACING.lg,
    padding: SPACING.sm,
  },
  mobileContent: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.lg,
  },
  section: {
    marginBottom: SPACING.lg,
  },
  fileLabel: {
    fontFamily: FONTS.INTER,
    fontSize: 14,
    fontWeight: '400',
    color: COLORS.TEXT_SECONDARY,
  },
  videoSection: {
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    fontFamily: FONTS.INTER,
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.TEXT,
    marginBottom: SPACING.sm,
  },
  bodyText: {
    fontFamily: FONTS.INTER,
    fontSize: 18,
    fontWeight: '400',
    lineHeight: 28,
    color: COLORS.TEXT_SECONDARY,
  },
  transcriptSection: {
    flex: 1,
    minHeight: 120,
  },
  analysisTemplate: {
    flex: 1,
    backgroundColor: COLORS.SURFACE_1,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    padding: SPACING.sm,
  },
  analysisTitle: {
    fontFamily: FONTS.INTER,
    fontSize: 36,
    fontWeight: '600',
    lineHeight: 44,
    color: COLORS.TEXT,
    marginBottom: SPACING.lg,
  },
  templateSection: {
    marginBottom: SPACING.lg,
  },
  bulletList: {
    marginTop: SPACING.xs,
  },
  bulletItem: {
    fontFamily: FONTS.INTER,
    fontSize: 18,
    fontWeight: '400',
    lineHeight: 28,
    color: COLORS.TEXT_SECONDARY,
    marginBottom: SPACING.xs,
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
  },
  buttonText: {
    color: COLORS.TEXT_ON_PRIMARY,
    fontSize: 16,
    fontFamily: FONTS.INTER,
    fontWeight: '600',
  },
});
