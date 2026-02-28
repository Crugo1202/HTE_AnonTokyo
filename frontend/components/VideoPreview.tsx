import React, { useRef } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { COLORS } from '@/utils/constants';

interface VideoPreviewProps {
  uri: string;
}

export default function VideoPreview({ uri }: VideoPreviewProps) {
  const videoRef = useRef<Video>(null);

  return (
    <View style={styles.container}>
      <Video
        ref={videoRef}
        source={{ uri }}
        style={styles.video}
        useNativeControls
        resizeMode={ResizeMode.CONTAIN}
        isLooping={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    backgroundColor: COLORS.BACKGROUND,
    aspectRatio: 16 / 9,
  },
  video: {
    width: '100%',
    height: '100%',
  },
});
