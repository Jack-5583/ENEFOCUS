import { supabase } from './supabase';
import type {
  Subject, Todo, StudySession, Material, MaterialUnit,
  TodoRecord, ProofPhoto, ZoomSession, DailyReport, LifeLog,
} from './types';

type AnyRow = Record<string, unknown>;

async function upsertRow(table: string, row: AnyRow): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from(table).upsert(row as never);
  if (error) console.error(`[db] upsert ${table}:`, error.message);
}

async function deleteRow(table: string, id: string): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from(table).delete().eq('id', id);
  if (error) console.error(`[db] delete ${table}:`, error.message);
}

async function fetchByUser<T>(table: string, userId: string): Promise<T[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.from(table).select('*').eq('userId', userId);
  if (error) console.error(`[db] fetch ${table}:`, error.message);
  return (data ?? []) as T[];
}

async function fetchByIds<T>(table: string, field: string, ids: string[]): Promise<T[]> {
  if (!supabase || ids.length === 0) return [];
  const { data, error } = await supabase.from(table).select('*').in(field, ids);
  if (error) console.error(`[db] fetchByIds ${table}:`, error.message);
  return (data ?? []) as T[];
}

export async function loadAllFromSupabase(userId: string) {
  if (!supabase) return null;

  const [subjects, todos, studySessions, materials, proofPhotos, zoomSessions, dailyReports, lifeLogs] =
    await Promise.all([
      fetchByUser<Subject>('subjects', userId),
      fetchByUser<Todo>('todos', userId),
      fetchByUser<StudySession>('studySessions', userId),
      fetchByUser<Material>('materials', userId),
      fetchByUser<ProofPhoto>('proofPhotos', userId),
      fetchByUser<ZoomSession>('zoomSessions', userId),
      fetchByUser<DailyReport>('dailyReports', userId),
      fetchByUser<LifeLog>('lifeLogs', userId),
    ]);

  const [materialUnits, todoRecords] = await Promise.all([
    fetchByIds<MaterialUnit>('materialUnits', 'materialId', materials.map((m) => m.id)),
    fetchByIds<TodoRecord>('todoRecords', 'todoId', todos.map((t) => t.id)),
  ]);

  return { subjects, todos, studySessions, materials, materialUnits, todoRecords, proofPhotos, zoomSessions, dailyReports, lifeLogs };
}

export async function pushAllToSupabase(userId: string, data: {
  subjects: Subject[];
  todos: Todo[];
  studySessions: StudySession[];
  materials: Material[];
  materialUnits: MaterialUnit[];
  todoRecords: TodoRecord[];
  proofPhotos: ProofPhoto[];
  zoomSessions: ZoomSession[];
  dailyReports: DailyReport[];
  lifeLogs: LifeLog[];
}) {
  if (!supabase) return;
  const strip = <T extends Record<string, unknown>>(arr: T[], fields: string[]) =>
    arr.map((row) => {
      const r = { ...row };
      fields.forEach((f) => delete r[f]);
      return r;
    });

  await Promise.all([
    data.subjects.length > 0 && supabase.from('subjects').upsert(data.subjects as never),
    data.todos.length > 0 && supabase.from('todos').upsert(strip(data.todos as never[], ['subjectName', 'subjectColor']) as never),
    data.studySessions.length > 0 && supabase.from('studySessions').upsert(data.studySessions as never),
    data.materials.length > 0 && supabase.from('materials').upsert(strip(data.materials as never[], ['subjectName', 'subjectColor']) as never),
    data.materialUnits.length > 0 && supabase.from('materialUnits').upsert(data.materialUnits as never),
    data.todoRecords.length > 0 && supabase.from('todoRecords').upsert(data.todoRecords as never),
    data.proofPhotos.length > 0 && supabase.from('proofPhotos').upsert(data.proofPhotos as never),
    data.zoomSessions.length > 0 && supabase.from('zoomSessions').upsert(data.zoomSessions as never),
    data.dailyReports.length > 0 && supabase.from('dailyReports').upsert(data.dailyReports as never),
    data.lifeLogs.length > 0 && supabase.from('lifeLogs').upsert(data.lifeLogs as never),
  ]);
}

export const db = {
  subjects: {
    upsert: (row: Subject) => upsertRow('subjects', row as unknown as AnyRow),
    delete: (id: string) => deleteRow('subjects', id),
  },
  todos: {
    upsert: ({ subjectName: _sn, subjectColor: _sc, ...row }: Todo) =>
      upsertRow('todos', row as unknown as AnyRow),
    delete: (id: string) => deleteRow('todos', id),
  },
  studySessions: {
    upsert: (row: StudySession) => upsertRow('studySessions', row as unknown as AnyRow),
  },
  materials: {
    upsert: ({ subjectName: _sn, subjectColor: _sc, ...row }: Material) =>
      upsertRow('materials', row as unknown as AnyRow),
    delete: (id: string) => deleteRow('materials', id),
  },
  materialUnits: {
    upsert: (row: MaterialUnit) => upsertRow('materialUnits', row as unknown as AnyRow),
  },
  todoRecords: {
    upsert: (row: TodoRecord) => upsertRow('todoRecords', row as unknown as AnyRow),
  },
  proofPhotos: {
    upsert: (row: ProofPhoto) => upsertRow('proofPhotos', row as unknown as AnyRow),
    delete: (id: string) => deleteRow('proofPhotos', id),
  },
  zoomSessions: {
    upsert: (row: ZoomSession) => upsertRow('zoomSessions', row as unknown as AnyRow),
  },
  dailyReports: {
    upsert: (row: DailyReport) => upsertRow('dailyReports', row as unknown as AnyRow),
  },
  lifeLogs: {
    upsert: (row: LifeLog) => upsertRow('lifeLogs', row as unknown as AnyRow),
  },
};
