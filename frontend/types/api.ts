export interface FluctuationWindow {
  timestamp_start: number;
  timestamp_end: number;
  fluctuation_score: number;
}

export interface AnalysisResponse {
  status: string;
  transcript: string;
  fluctuation_timeline: FluctuationWindow[];
}
