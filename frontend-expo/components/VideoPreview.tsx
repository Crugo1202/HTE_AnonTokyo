import React, { useRef } from 'react';
import { View, StyleSheet } from 'react-native';
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
        resizeMode={ResizeMode.COVER}
        isLooping={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    backgroundColor: COLORS.SURFACE_1,
    aspectRatio: 16 / 9,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    borderRadius: 0,
    overflow: 'hidden',
  },
  video: {
    width: '100%',
    height: '100%',
  },
});
