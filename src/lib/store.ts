import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { db, loadAllFromSupabase, pushAllToSupabase } from './db';
import type {
  Subject, Todo, StudySession, Material, MaterialUnit,
  TodoRecord, ProofPhoto, ZoomSession, DailyReport, LifeLog, User
} from './types';

interface AppState {
  // Sync state
  initialized: boolean;
  loadAll: () => Promise<void>;

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

  // Daily Reports
  dailyReports: DailyReport[];
  addDailyReport: (report: DailyReport) => void;
  updateDailyReport: (id: string, updates: Partial<DailyReport>) => void;

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
    (set, get) => ({
      initialized: false,

      loadAll: async () => {
        const userId = get().user?.id ?? 'demo-user';
        const serverData = await loadAllFromSupabase(userId);

        if (!serverData) {
          // Supabase not configured — use localStorage only
          set({ initialized: true });
          return;
        }

        const hasServerData =
          serverData.subjects.length > 0 ||
          serverData.todos.length > 0 ||
          serverData.studySessions.length > 0;

        if (!hasServerData) {
          // First-time Supabase setup: migrate localStorage data to server
          const s = get();
          await pushAllToSupabase(userId, {
            subjects: s.subjects,
            todos: s.todos,
            studySessions: s.studySessions,
            materials: s.materials,
            materialUnits: s.materialUnits,
            todoRecords: s.todoRecords,
            proofPhotos: s.proofPhotos,
            zoomSessions: s.zoomSessions,
            dailyReports: s.dailyReports,
            lifeLogs: s.lifeLogs,
          });
        } else {
          set({
            subjects: serverData.subjects,
            todos: serverData.todos,
            studySessions: serverData.studySessions,
            materials: serverData.materials,
            materialUnits: serverData.materialUnits,
            todoRecords: serverData.todoRecords,
            proofPhotos: serverData.proofPhotos,
            zoomSessions: serverData.zoomSessions,
            dailyReports: serverData.dailyReports,
            lifeLogs: serverData.lifeLogs,
          });
        }

        set({ initialized: true });
      },

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
      addSubject: (subject) => {
        set((s) => ({ subjects: [...s.subjects, subject] }));
        db.subjects.upsert(subject);
      },
      updateSubject: (id, updates) => {
        set((s) => ({ subjects: s.subjects.map((sub) => sub.id === id ? { ...sub, ...updates } : sub) }));
        const sub = get().subjects.find((s) => s.id === id);
        if (sub) db.subjects.upsert(sub);
      },
      deleteSubject: (id) => {
        set((s) => ({ subjects: s.subjects.filter((sub) => sub.id !== id) }));
        db.subjects.delete(id);
      },

      todos: [],
      setTodos: (todos) => set({ todos }),
      addTodo: (todo) => {
        set((s) => ({ todos: [...s.todos, todo] }));
        db.todos.upsert(todo);
      },
      updateTodo: (id, updates) => {
        set((s) => ({ todos: s.todos.map((t) => t.id === id ? { ...t, ...updates } : t) }));
        const todo = get().todos.find((t) => t.id === id);
        if (todo) db.todos.upsert(todo);
      },
      deleteTodo: (id) => {
        set((s) => ({ todos: s.todos.filter((t) => t.id !== id) }));
        db.todos.delete(id);
      },

      studySessions: [],
      setStudySessions: (sessions) => set({ studySessions: sessions }),
      addStudySession: (session) => {
        set((s) => ({ studySessions: [...s.studySessions, session] }));
        db.studySessions.upsert(session);
      },
      updateStudySession: (id, updates) => {
        set((s) => ({
          studySessions: s.studySessions.map((sess) => sess.id === id ? { ...sess, ...updates } : sess),
        }));
        const sess = get().studySessions.find((s) => s.id === id);
        if (sess) db.studySessions.upsert(sess);
      },

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
      addMaterial: (material) => {
        set((s) => ({ materials: [...s.materials, material] }));
        db.materials.upsert(material);
      },
      updateMaterial: (id, updates) => {
        set((s) => ({ materials: s.materials.map((m) => m.id === id ? { ...m, ...updates } : m) }));
        const mat = get().materials.find((m) => m.id === id);
        if (mat) db.materials.upsert(mat);
      },
      deleteMaterial: (id) => {
        set((s) => ({ materials: s.materials.filter((m) => m.id !== id) }));
        db.materials.delete(id);
      },

      materialUnits: [],
      setMaterialUnits: (units) => set({ materialUnits: units }),
      addMaterialUnit: (unit) => {
        set((s) => ({ materialUnits: [...s.materialUnits, unit] }));
        db.materialUnits.upsert(unit);
      },
      updateMaterialUnit: (id, updates) => {
        set((s) => ({
          materialUnits: s.materialUnits.map((u) => u.id === id ? { ...u, ...updates } : u),
        }));
        const unit = get().materialUnits.find((u) => u.id === id);
        if (unit) db.materialUnits.upsert(unit);
      },

      todoRecords: [],
      addTodoRecord: (record) => {
        set((s) => ({ todoRecords: [...s.todoRecords, record] }));
        db.todoRecords.upsert(record);
      },
      updateTodoRecord: (id, updates) => {
        set((s) => ({
          todoRecords: s.todoRecords.map((r) => r.id === id ? { ...r, ...updates } : r),
        }));
        const rec = get().todoRecords.find((r) => r.id === id);
        if (rec) db.todoRecords.upsert(rec);
      },

      proofPhotos: [],
      addProofPhoto: (photo) => {
        set((s) => ({ proofPhotos: [...s.proofPhotos, photo] }));
        db.proofPhotos.upsert(photo);
      },
      deleteProofPhoto: (id) => {
        set((s) => ({ proofPhotos: s.proofPhotos.filter((p) => p.id !== id) }));
        db.proofPhotos.delete(id);
      },

      zoomSessions: [],
      addZoomSession: (session) => {
        set((s) => ({ zoomSessions: [...s.zoomSessions, session] }));
        db.zoomSessions.upsert(session);
      },
      updateZoomSession: (id, updates) => {
        set((s) => ({
          zoomSessions: s.zoomSessions.map((z) => z.id === id ? { ...z, ...updates } : z),
        }));
        const z = get().zoomSessions.find((z) => z.id === id);
        if (z) db.zoomSessions.upsert(z);
      },
      activeZoomSession: null,
      setActiveZoomSession: (session) => set({ activeZoomSession: session }),

      dailyReports: [],
      addDailyReport: (report) => {
        set((s) => ({ dailyReports: [...s.dailyReports, report] }));
        db.dailyReports.upsert(report);
      },
      updateDailyReport: (id, updates) => {
        set((s) => ({
          dailyReports: s.dailyReports.map((r) => r.id === id ? { ...r, ...updates } : r),
        }));
        const rep = get().dailyReports.find((r) => r.id === id);
        if (rep) db.dailyReports.upsert(rep);
      },

      lifeLogs: [],
      setLifeLogs: (logs) => set({ lifeLogs: logs }),
      addLifeLog: (log) => {
        set((s) => ({ lifeLogs: [...s.lifeLogs, log] }));
        db.lifeLogs.upsert(log);
      },
      updateLifeLog: (id, updates) => {
        set((s) => ({
          lifeLogs: s.lifeLogs.map((l) => l.id === id ? { ...l, ...updates } : l),
        }));
        const log = get().lifeLogs.find((l) => l.id === id);
        if (log) db.lifeLogs.upsert(log);
      },

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
        dailyReports: state.dailyReports,
        lifeLogs: state.lifeLogs,
        selectedDate: state.selectedDate,
      }),
    }
  )
);
