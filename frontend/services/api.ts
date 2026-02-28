import { Platform } from 'react-native';
import { AnalysisResponse } from '@/types/api';
import { API_ENDPOINTS } from '@/utils/constants';

export type UploadableFile = File | { uri: string; name: string; type: string };

export async function uploadAndAnalyze(file: UploadableFile): Promise<AnalysisResponse> {
  const formData = new FormData();
  
  if (Platform.OS === 'web' && file instanceof File) {
    formData.append('file', file);
  } else {
    // For native platforms, FormData accepts file objects with uri, name, type
    const fileObj = file as { uri: string; name: string; type: string };
    formData.append('file', {
      uri: fileObj.uri,
      name: fileObj.name,
      type: fileObj.type,
    } as any);
  }

  const response = await fetch(API_ENDPOINTS.ANALYZE, {
    method: 'POST',
    body: formData,
    headers: Platform.OS === 'web' ? {} : {
      'Content-Type': 'multipart/form-data',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = 'Upload failed';
    
    try {
      const errorJson = JSON.parse(errorText);
      errorMessage = errorJson.detail || errorMessage;
    } catch {
      errorMessage = errorText || `Server error: ${response.status}`;
    }
    
    throw new Error(errorMessage);
  }

  const data: AnalysisResponse = await response.json();
  return data;
}
