import { ExamData, Section } from '../types/exam';

const EXAM_BACKEND = 'http://localhost:8092/exam';

export const loadExamData = async (examCode: string): Promise<ExamData | null> => {
  try {
    const response = await fetch(`${EXAM_BACKEND}/api/exam/${examCode}`);
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
};

export const loadExamQuestions = async (
  examCode: string,
  jwtToken: string,
): Promise<Section[] | null> => {
  try {
    const response = await fetch(`${EXAM_BACKEND}/api/exam/${examCode}/questions`, {
      headers: { Authorization: `Bearer ${jwtToken}` },
    });
    if (!response.ok) return null;
    const data = await response.json();
    return (data.sections as Section[]) ?? null;
  } catch {
    return null;
  }
};

export const checkTokenUsed = async (jti: string): Promise<boolean> => {
  try {
    const res = await fetch(`${EXAM_BACKEND}/api/exam/check-token/${jti}`);
    const data = await res.json();
    return !!data.used;
  } catch {
    return false;
  }
};

export const EXAM_API_BASE = EXAM_BACKEND;

export const formatTime = (seconds: number): string => {
  const hrs  = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hrs > 0) {
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};
