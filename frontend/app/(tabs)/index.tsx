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
import { COLORS, FONTS } from '@/utils/constants';

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
      
      // Create video URI for preview
      let videoUri = '';
      if (Platform.OS === 'web' && selectedFile instanceof File) {
        videoUri = URL.createObjectURL(selectedFile);
      } else {
        videoUri = (selectedFile as { uri: string }).uri || '';
      }
      
      // Navigate to dashboard with results
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
          >
            {isUploading ? (
              <ActivityIndicator color={COLORS.BACKGROUND} />
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
    padding: 24,
    justifyContent: 'center',
  },
  uploadButtonContainer: {
    marginTop: 24,
    alignItems: 'center',
  },
  uploadButton: {
    backgroundColor: COLORS.TEXT,
    paddingHorizontal: 32,
    paddingVertical: 12,
    minWidth: 160,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadButtonDisabled: {
    opacity: 0.6,
  },
  uploadButtonText: {
    color: COLORS.BACKGROUND,
    fontSize: 14,
    fontFamily: FONTS.INTER,
    fontWeight: '500',
  },
});
