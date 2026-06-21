export interface CravingLog {
  id: string;
  timestamp: string;
  intensity: 'Low' | 'Medium' | 'High';
  trigger: string;
  notes: string;
}

export type RiskLevel = 'Low' | 'Medium' | 'High';

export interface RiskAssessment {
  level: RiskLevel;
  score: number;
  message: string;
}

/**
 * A rule-based AI predictor for smoking cravings.
 * Calculates risk based on historical craving data.
 */
export const calculateSmokingRisk = (logs: CravingLog[], quitDateStr: string): RiskAssessment => {
  if (logs.length === 0) {
    return { level: 'Low', score: 0, message: 'Bạn đang làm rất tốt!' };
  }

  const now = new Date();
  const currentHour = now.getHours();

  // 1. Analyze time-of-day pattern (Recency and Frequency)
  // Higher risk if many cravings at current time of day in the past.
  const similarTimeLogs = logs.filter((log) => {
    const logDate = new Date(log.timestamp);
    const logHour = logDate.getHours();
    return Math.abs(logHour - currentHour) <= 1; // Within 1 hour
  });

  // 2. Analyze intensity
  const intensityScores = { 'Low': 1, 'Medium': 2, 'High': 3 };
  const avgIntensity = logs.length > 0
    ? logs.reduce((sum, log) => sum + intensityScores[log.intensity], 0) / logs.length
    : 0;

  // 3. Calculate raw score
  // Simple formula: (frequency_at_time * 2) + (avg_intensity * 2)
  let score = (similarTimeLogs.length * 2) + (avgIntensity * 2);

  // 4. Adjust based on how recently they quit (e.g., higher risk in first 30 days)
  const quitDate = new Date(quitDateStr);
  const diffDays = Math.floor((now.getTime() - quitDate.getTime()) / (1000 * 3600 * 24));
  if (diffDays < 30) {
    score += 5;
  }

  // 5. Determine level
  if (score > 12) return { level: 'High', score, message: 'Nguy cơ cao! Hãy hít thở sâu ngay lúc này.' };
  if (score > 6) return { level: 'Medium', score, message: 'Cẩn thận, hãy giữ vững quyết tâm.' };
  return { level: 'Low', score, message: 'Bạn đang làm rất tốt!' };
};
