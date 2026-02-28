import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ActivityIndicator,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { COLORS, FONTS } from '@/utils/constants';
import { UploadableFile } from '@/services/api';

interface FileUploadProps {
  onFileSelect: (file: UploadableFile) => void;
  onDragOver?: (isDragging: boolean) => void;
  isUploading?: boolean;
}

export default function FileUpload({
  onFileSelect,
  onDragOver,
  isUploading = false,
}: FileUploadProps) {
  const [selectedFile, setSelectedFile] = useState<UploadableFile | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFilePick = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'video/mp4',
        copyToCacheDirectory: false,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        
        // Convert to File object for web compatibility
        if (Platform.OS === 'web') {
          const response = await fetch(asset.uri);
          const blob = await response.blob();
          const file = new File([blob], asset.name || 'video.mp4', {
            type: 'video/mp4',
          });
          setSelectedFile(file);
          onFileSelect(file);
        } else {
          // For native, we need to create a File-like object
          const file = {
            name: asset.name || 'video.mp4',
            size: asset.size || 0,
            type: 'video/mp4',
            uri: asset.uri,
          } as any;
          setSelectedFile(file);
          onFileSelect(file);
        }
      }
    } catch (error) {
      console.error('Error picking file:', error);
    }
  }, [onFileSelect]);

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(true);
      onDragOver?.(true);
    },
    [onDragOver]
  );

  const handleDragLeave = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      onDragOver?.(false);
    },
    [onDragOver]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      onDragOver?.(false);

      const files = Array.from(e.dataTransfer.files);
      const mp4File = files.find((f) => f.name.toLowerCase().endsWith('.mp4'));

      if (mp4File) {
        setSelectedFile(mp4File);
        onFileSelect(mp4File);
      }
    },
    [onFileSelect, onDragOver]
  );

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  if (Platform.OS === 'web') {
    return (
      <View
        style={[
          styles.container,
          styles.webContainer,
          isDragging && styles.dragging,
        ]}
        // @ts-ignore - React Native Web View supports drag events
        onDragOver={handleDragOver}
        // @ts-ignore
        onDragLeave={handleDragLeave}
        // @ts-ignore
        onDrop={handleDrop}
      >
        <Text style={styles.label}>Upload MP4 Video</Text>
        <Text style={styles.hint}>
          Drag and drop a file here, or click to select
        </Text>
        <TouchableOpacity
          style={styles.button}
          onPress={handleFilePick}
          disabled={isUploading}
        >
          {isUploading ? (
            <ActivityIndicator color={COLORS.TEXT} />
          ) : (
            <Text style={styles.buttonText}>Select File</Text>
          )}
        </TouchableOpacity>
        {selectedFile && (
          <View style={styles.fileInfo}>
            <Text style={styles.fileName}>
              {selectedFile instanceof File ? selectedFile.name : selectedFile.name}
            </Text>
            <Text style={styles.fileSize}>
              {formatFileSize(
                selectedFile instanceof File 
                  ? selectedFile.size 
                  : (selectedFile as any).size || 0
              )}
            </Text>
          </View>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Upload MP4 Video</Text>
      <TouchableOpacity
        style={styles.button}
        onPress={handleFilePick}
        disabled={isUploading}
      >
        {isUploading ? (
          <ActivityIndicator color={COLORS.TEXT} />
        ) : (
          <Text style={styles.buttonText}>Select File</Text>
        )}
      </TouchableOpacity>
      {selectedFile && (
        <View style={styles.fileInfo}>
          <Text style={styles.fileName}>{selectedFile.name}</Text>
          <Text style={styles.fileSize}>
            {formatFileSize(selectedFile.size || 0)}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  webContainer: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: COLORS.BORDER,
    backgroundColor: COLORS.BACKGROUND,
    minHeight: 200,
  },
  dragging: {
    borderColor: COLORS.TEXT,
    backgroundColor: '#F5F5F5',
  },
  label: {
    fontSize: 18,
    fontFamily: FONTS.INTER,
    color: COLORS.TEXT,
    marginBottom: 8,
    fontWeight: '500',
  },
  hint: {
    fontSize: 14,
    fontFamily: FONTS.INTER,
    color: COLORS.PLACEHOLDER,
    marginBottom: 24,
  },
  button: {
    backgroundColor: COLORS.TEXT,
    paddingHorizontal: 32,
    paddingVertical: 12,
    minWidth: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: COLORS.BACKGROUND,
    fontSize: 14,
    fontFamily: FONTS.INTER,
    fontWeight: '500',
  },
  fileInfo: {
    marginTop: 24,
    alignItems: 'center',
  },
  fileName: {
    fontSize: 14,
    fontFamily: FONTS.INTER,
    color: COLORS.TEXT,
    marginBottom: 4,
  },
  fileSize: {
    fontSize: 12,
    fontFamily: FONTS.INTER,
    color: COLORS.PLACEHOLDER,
  },
});
