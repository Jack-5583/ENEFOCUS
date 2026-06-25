import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  Subject, Todo, StudySession, Material, MaterialUnit,
  TodoRecord, ProofPhoto, ZoomSession, LifeLog, User
} from './types';

interface AppState {
  // User
  user: User | null;
  setUser: (user: User | null) => void;

  // Subjects
  subjects: Subject[];
  setSubjects: (subjects: Subject[]) => void;
  addSubject: (subject: Subject) => void;
  updateSubject: (id: string, updates: Partial<Subject>) => void;
  deleteSubject: (id: string) => void;

  // Todos
  todos: Todo[];
  setTodos: (todos: Todo[]) => void;
  addTodo: (todo: Todo) => void;
  updateTodo: (id: string, updates: Partial<Todo>) => void;
  deleteTodo: (id: string) => void;

  // Study Sessions
  studySessions: StudySession[];
  setStudySessions: (sessions: StudySession[]) => void;
  addStudySession: (session: StudySession) => void;
  updateStudySession: (id: string, updates: Partial<StudySession>) => void;

  // Active Timer
  activeSessionId: string | null;
  activeTodoId: string | null;
  timerStartedAt: number | null;
  setActiveTimer: (sessionId: string | null, todoId: string | null, startedAt: number | null) => void;

  // Materials
  materials: Material[];
  setMaterials: (materials: Material[]) => void;
  addMaterial: (material: Material) => void;
  updateMaterial: (id: string, updates: Partial<Material>) => void;
  deleteMaterial: (id: string) => void;

  // Material Units
  materialUnits: MaterialUnit[];
  setMaterialUnits: (units: MaterialUnit[]) => void;
  addMaterialUnit: (unit: MaterialUnit) => void;
  updateMaterialUnit: (id: string, updates: Partial<MaterialUnit>) => void;

  // Todo Records
  todoRecords: TodoRecord[];
  addTodoRecord: (record: TodoRecord) => void;
  updateTodoRecord: (id: string, updates: Partial<TodoRecord>) => void;

  // Proof Photos
  proofPhotos: ProofPhoto[];
  addProofPhoto: (photo: ProofPhoto) => void;
  deleteProofPhoto: (id: string) => void;

  // Zoom Sessions
  zoomSessions: ZoomSession[];
  addZoomSession: (session: ZoomSession) => void;
  updateZoomSession: (id: string, updates: Partial<ZoomSession>) => void;
  activeZoomSession: ZoomSession | null;
  setActiveZoomSession: (session: ZoomSession | null) => void;

  // Life Logs
  lifeLogs: LifeLog[];
  setLifeLogs: (logs: LifeLog[]) => void;
  addLifeLog: (log: LifeLog) => void;
  updateLifeLog: (id: string, updates: Partial<LifeLog>) => void;

  // UI State
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  selectedDate: string;
  setSelectedDate: (date: string) => void;
}

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      user: {
        id: 'demo-user',
        name: '김성현',
        email: 'demo@enefocus.kr',
        timezone: 'Asia/Seoul',
        dayStartHour: 2,
        createdAt: new Date().toISOString(),
      },
      setUser: (user) => set({ user }),

      subjects: [
        { id: 'sub1', userId: 'demo-user', name: '국어', color: 'red', order: 0, createdAt: new Date().toISOString() },
        { id: 'sub2', userId: 'demo-user', name: '수학', color: 'blue', order: 1, createdAt: new Date().toISOString() },
        { id: 'sub3', userId: 'demo-user', name: '영어', color: 'purple', order: 2, createdAt: new Date().toISOString() },
        { id: 'sub4', userId: 'demo-user', name: '생명과학Ⅰ', color: 'green', order: 3, createdAt: new Date().toISOString() },
        { id: 'sub5', userId: 'demo-user', name: '지구과학Ⅰ', color: 'navy', order: 4, createdAt: new Date().toISOString() },
      ],
      setSubjects: (subjects) => set({ subjects }),
      addSubject: (subject) => set((s) => ({ subjects: [...s.subjects, subject] })),
      updateSubject: (id, updates) => set((s) => ({
        subjects: s.subjects.map((sub) => sub.id === id ? { ...sub, ...updates } : sub),
      })),
      deleteSubject: (id) => set((s) => ({ subjects: s.subjects.filter((sub) => sub.id !== id) })),

      todos: [],
      setTodos: (todos) => set({ todos }),
      addTodo: (todo) => set((s) => ({ todos: [...s.todos, todo] })),
      updateTodo: (id, updates) => set((s) => ({
        todos: s.todos.map((t) => t.id === id ? { ...t, ...updates } : t),
      })),
      deleteTodo: (id) => set((s) => ({ todos: s.todos.filter((t) => t.id !== id) })),

      studySessions: [],
      setStudySessions: (sessions) => set({ studySessions: sessions }),
      addStudySession: (session) => set((s) => ({ studySessions: [...s.studySessions, session] })),
      updateStudySession: (id, updates) => set((s) => ({
        studySessions: s.studySessions.map((sess) => sess.id === id ? { ...sess, ...updates } : sess),
      })),

      activeSessionId: null,
      activeTodoId: null,
      timerStartedAt: null,
      setActiveTimer: (sessionId, todoId, startedAt) => set({
        activeSessionId: sessionId,
        activeTodoId: todoId,
        timerStartedAt: startedAt,
      }),

      materials: [],
      setMaterials: (materials) => set({ materials }),
      addMaterial: (material) => set((s) => ({ materials: [...s.materials, material] })),
      updateMaterial: (id, updates) => set((s) => ({
        materials: s.materials.map((m) => m.id === id ? { ...m, ...updates } : m),
      })),
      deleteMaterial: (id) => set((s) => ({ materials: s.materials.filter((m) => m.id !== id) })),

      materialUnits: [],
      setMaterialUnits: (units) => set({ materialUnits: units }),
      addMaterialUnit: (unit) => set((s) => ({ materialUnits: [...s.materialUnits, unit] })),
      updateMaterialUnit: (id, updates) => set((s) => ({
        materialUnits: s.materialUnits.map((u) => u.id === id ? { ...u, ...updates } : u),
      })),

      todoRecords: [],
      addTodoRecord: (record) => set((s) => ({ todoRecords: [...s.todoRecords, record] })),
      updateTodoRecord: (id, updates) => set((s) => ({
        todoRecords: s.todoRecords.map((r) => r.id === id ? { ...r, ...updates } : r),
      })),

      proofPhotos: [],
      addProofPhoto: (photo) => set((s) => ({ proofPhotos: [...s.proofPhotos, photo] })),
      deleteProofPhoto: (id) => set((s) => ({ proofPhotos: s.proofPhotos.filter((p) => p.id !== id) })),

      zoomSessions: [],
      addZoomSession: (session) => set((s) => ({ zoomSessions: [...s.zoomSessions, session] })),
      updateZoomSession: (id, updates) => set((s) => ({
        zoomSessions: s.zoomSessions.map((z) => z.id === id ? { ...z, ...updates } : z),
      })),
      activeZoomSession: null,
      setActiveZoomSession: (session) => set({ activeZoomSession: session }),

      lifeLogs: [],
      setLifeLogs: (logs) => set({ lifeLogs: logs }),
      addLifeLog: (log) => set((s) => ({ lifeLogs: [...s.lifeLogs, log] })),
      updateLifeLog: (id, updates) => set((s) => ({
        lifeLogs: s.lifeLogs.map((l) => l.id === id ? { ...l, ...updates } : l),
      })),

      currentTab: 'today',
      setCurrentTab: (tab) => set({ currentTab: tab }),
      selectedDate: new Date().toISOString().split('T')[0],
      setSelectedDate: (date) => set({ selectedDate: date }),
    }),
    {
      name: 'enefocus-storage',
      partialize: (state) => ({
        user: state.user,
        subjects: state.subjects,
        todos: state.todos,
        studySessions: state.studySessions,
        materials: state.materials,
        materialUnits: state.materialUnits,
        todoRecords: state.todoRecords,
        proofPhotos: state.proofPhotos,
        zoomSessions: state.zoomSessions,
        lifeLogs: state.lifeLogs,
        selectedDate: state.selectedDate,
      }),
    }
  )
);
