import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Platform,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
  Text,
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
    <View style={styles.container}>
      <View style={styles.appDetails}>
        <Text style={styles.headline}>Teaching Analysis</Text>
        <Text style={styles.lead}>Upload a lesson recording to get an AI summary, transcript, and fluctuation analysis.</Text>
      </View>
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
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND,
    padding: SPACING.md,
    paddingHorizontal: SPACING.md,
    justifyContent: 'center',
    maxWidth: 1280,
    alignSelf: 'center',
    width: '100%',
  },
  appDetails: {
    marginBottom: SPACING.xl,
  },
  headline: {
    fontFamily: FONTS.INTER,
    fontSize: 36,
    fontWeight: '600',
    lineHeight: 44,
    letterSpacing: -0.01,
    color: COLORS.TEXT,
    marginBottom: SPACING.sm,
  },
  lead: {
    fontFamily: FONTS.INTER,
    fontSize: 22,
    fontWeight: '400',
    lineHeight: 36,
    color: COLORS.TEXT_SECONDARY,
  },
  uploadButtonContainer: {
    marginTop: SPACING.lg,
    alignItems: 'center',
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
});
