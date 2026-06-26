export type SubjectColor =
  | 'red' | 'blue' | 'purple' | 'green' | 'navy' | 'orange' | 'sky' | 'gray' | 'gold';

export interface Subject {
  id: string;
  userId: string;
  name: string;
  color: SubjectColor;
  icon?: string;
  order: number;
  createdAt: string;
}

export type TodoType =
  | 'problem-solving'
  | 'exam'
  | 'concept'
  | 'review'
  | 'memorization'
  | 'reading'
  | 'life';

export type TodoStatus =
  | 'pending'
  | 'in-progress'
  | 'paused'
  | 'verification-pending'
  | 'completed'
  | 'incomplete'
  | 'carried-over';

export interface Todo {
  id: string;
  userId: string;
  subjectId: string;
  materialId?: string;
  title: string;
  type: TodoType;
  targetAmount?: number;
  estimatedMinutes?: number;
  status: TodoStatus;
  date: string;
  dueAt?: string;
  requiresPhoto: boolean;
  createdAt: string;
  completedAt?: string;
  subjectName?: string;
  subjectColor?: SubjectColor;
}

export interface StudySession {
  id: string;
  userId: string;
  todoId?: string;
  subjectId?: string;
  startedAt: string;
  endedAt?: string;
  durationSeconds: number;
  source: 'manual' | 'timer' | 'zoom' | 'adjusted';
  isCamstudy: boolean;
  zoomSessionId?: string;
  note?: string;
}

export type MaterialType =
  | 'n-je' | 'kichuljemun' | 'gaenyeom' | 'siheomji' | 'print' | 'daneojiang';

export interface Material {
  id: string;
  userId: string;
  subjectId: string;
  title: string;
  type: MaterialType;
  totalUnits?: number;
  totalQuestions?: number;
  createdAt: string;
  subjectName?: string;
  subjectColor?: SubjectColor;
}

export interface MaterialUnit {
  id: string;
  materialId: string;
  title: string;
  order: number;
  questionStart?: number;
  questionEnd?: number;
  status: 'not-started' | 'in-progress' | 'first-complete' | 'reviewing' | 'complete';
}

export interface TodoRecord {
  id: string;
  todoId: string;
  recordType: string;
  problemsSolved?: number;
  problemsCorrect?: number;
  score?: number;
  grade?: number;
  memo?: string;
  reviewDate?: string;
  createdAt: string;
}

export interface ProofPhoto {
  id: string;
  userId: string;
  todoId?: string;
  studySessionId?: string;
  imageUrl: string;
  source: 'manual_camera' | 'upload' | 'zoom_capture' | 'webcam_snapshot';
  storageType?: 'supabase' | 'local';
  capturedAt: string;
  memo?: string;
}

export interface ZoomSession {
  id: string;
  userId: string;
  meetingId: string;
  meetingName?: string;
  joinedAt: string;
  leftAt?: string;
  durationSeconds?: number;
  linkedTodoId?: string;
  cameraDeviceLabel?: string;
  createdAt: string;
}

export interface DailyReport {
  id: string;
  userId: string;
  reportDate: string;
  rangeStart: string;
  rangeEnd: string;
  totalStudySeconds: number;
  camstudySeconds: number;
  completedTodosCount: number;
  totalTodosCount: number;
  publicShareId?: string;
  visibility: 'private' | 'link' | 'mentor' | 'guardian';
  createdAt: string;
}

export interface LifeLog {
  id: string;
  userId: string;
  date: string;
  wakeTime?: string;
  sleepTime?: string;
  conditionScore?: number;
  focusScore?: number;
  fatigueScore?: number;
  medicineMorning?: boolean;
  medicineLunch?: boolean;
  medicineEvening?: boolean;
  memo?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  timezone: string;
  dayStartHour: number;
  createdAt: string;
}

export interface TimelineBlock {
  id: string;
  startTime: string;
  endTime?: string;
  type: 'study' | 'camstudy' | 'rest' | 'meal' | 'sleep' | 'life' | 'unclassified';
  subjectId?: string;
  subjectColor?: SubjectColor;
  subjectName?: string;
  todoId?: string;
  todoTitle?: string;
  isCamstudy?: boolean;
  label?: string;
}
