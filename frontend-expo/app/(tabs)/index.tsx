import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Platform,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
  Text,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import FileUpload from '@/components/FileUpload';
import { uploadAndAnalyze, UploadableFile } from '@/services/api';
import { AnalysisResponse } from '@/types/api';
import { COLORS, FONTS, SPACING } from '@/utils/constants';

export default function UploadScreen() {
  const router = useRouter();
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<UploadableFile | null>(null);

  const handleFileSelect = (file: UploadableFile) => {
    setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      Alert.alert('Error', 'Please select a file first');
      return;
    }

    setIsUploading(true);

    try {
      const response: AnalysisResponse = await uploadAndAnalyze(selectedFile);

      let videoUri = '';
      if (Platform.OS === 'web' && selectedFile instanceof File) {
        videoUri = URL.createObjectURL(selectedFile);
      } else {
        videoUri = (selectedFile as { uri: string }).uri || '';
      }

      router.push({
        pathname: '/(tabs)/dashboard',
        params: {
          transcript: response.transcript,
          timeline: JSON.stringify(response.fluctuation_timeline),
          videoUri,
        },
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      Alert.alert('Error', errorMessage);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.container}>
        {/* Left column: Get Started + Upload */}
        <View style={styles.leftColumn}>
          <View style={styles.getStartedCard}>
            <Text style={styles.getStartedTitle}>Get Started</Text>
            <Text style={styles.getStartedLead}>
              Upload a recording of you teaching and receive valuable AI powered insights
            </Text>
          </View>
          <View style={styles.uploadZoneWrapper}>
            <FileUpload
              onFileSelect={handleFileSelect}
              isUploading={isUploading}
            />
            {selectedFile && (
              <View style={styles.uploadButtonContainer}>
                <TouchableOpacity
                  style={[styles.uploadButton, isUploading && styles.uploadButtonDisabled]}
                  onPress={handleUpload}
                  disabled={isUploading}
                  activeOpacity={0.9}
                >
                  {isUploading ? (
                    <ActivityIndicator color={COLORS.TEXT_ON_PRIMARY} />
                  ) : (
                    <Text style={styles.uploadButtonText}>Analyze Video</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        {/* Right column: Analyzed Videos */}
        <View style={styles.rightColumn}>
          <View style={styles.analyzedCard}>
            <Text style={styles.analyzedTitle}>Analyzed Videos</Text>
            <ScrollView
              style={styles.analyzedList}
              contentContainerStyle={styles.analyzedListContent}
              showsVerticalScrollIndicator={true}
            >
              {/* Empty state for now; can be populated from state/API later */}
              <Text style={styles.analyzedEmpty}>
                No analyzed videos yet. Upload a video to get started.
              </Text>
            </ScrollView>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND,
  },
  scrollContent: {
    flexGrow: 1,
  },
  container: {
    flexDirection: 'row',
    flex: 1,
    maxWidth: 1280,
    alignSelf: 'center',
    width: '100%',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.lg,
  },
  leftColumn: {
    flex: 1,
    minWidth: 0,
    marginRight: SPACING.lg,
  },
  getStartedCard: {
    backgroundColor: COLORS.SURFACE_1,
    padding: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    marginBottom: SPACING.lg,
  },
  getStartedTitle: {
    fontFamily: FONTS.INTER,
    fontSize: 22,
    fontWeight: '600',
    lineHeight: 28,
    color: COLORS.TEXT,
    marginBottom: SPACING.xs,
  },
  getStartedLead: {
    fontFamily: FONTS.INTER,
    fontSize: 18,
    fontWeight: '400',
    lineHeight: 28,
    color: COLORS.TEXT_SECONDARY,
  },
  uploadZoneWrapper: {
    flex: 1,
    minHeight: 280,
  },
  uploadButtonContainer: {
    marginTop: SPACING.lg,
    alignItems: 'flex-start',
  },
  uploadButton: {
    backgroundColor: COLORS.PRIMARY,
    paddingHorizontal: SPACING.md,
    height: 40,
    minWidth: 160,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 0,
  },
  uploadButtonDisabled: {
    opacity: 0.4,
  },
  uploadButtonText: {
    color: COLORS.TEXT_ON_PRIMARY,
    fontSize: 16,
    fontFamily: FONTS.INTER,
    fontWeight: '600',
  },
  rightColumn: {
    flex: 1,
    minWidth: 0,
    minHeight: 400,
  },
  analyzedCard: {
    flex: 1,
    backgroundColor: COLORS.SURFACE_1,
    padding: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    minHeight: 400,
  },
  analyzedTitle: {
    fontFamily: FONTS.INTER,
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.TEXT,
    marginBottom: SPACING.sm,
  },
  analyzedList: {
    flex: 1,
  },
  analyzedListContent: {
    paddingBottom: SPACING.lg,
  },
  analyzedEmpty: {
    fontFamily: FONTS.INTER,
    fontSize: 14,
    fontWeight: '400',
    color: COLORS.TEXT_TERTIARY,
    lineHeight: 20,
  },
});
