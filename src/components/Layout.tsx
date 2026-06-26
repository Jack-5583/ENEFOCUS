'use client';
import { useState, useEffect } from 'react';
import {
  LayoutDashboard, Timer, Video, BookOpen,
  FileText, BarChart3, Heart, Settings, Menu, X
} from 'lucide-react';
import { useStore } from '@/lib/store';
import { formatDate, getToday } from '@/lib/utils';
import { cleanupOldPhotos } from '@/lib/photoStorage';
import { TodayView } from './today/TodayView';
import { TimerView } from './timer/TimerView';
import { CamstudyView } from './camstudy/CamstudyView';
import { MaterialsView } from './materials/MaterialsView';
import { RecordsView } from './records/RecordsView';
import { ReportView } from './report/ReportView';
import { LifeView } from './life/LifeView';
import { SettingsView } from './settings/SettingsView';
import { InactivityModal } from './ui/InactivityModal';
import { useDailyReport } from '@/hooks/useDailyReport';
import { useNotifications } from '@/hooks/useNotifications';

const navItems = [
  { id: 'today', label: '오늘', icon: LayoutDashboard },
  { id: 'timer', label: '타이머', icon: Timer },
  { id: 'camstudy', label: '캠스터디', icon: Video },
  { id: 'materials', label: '교재', icon: BookOpen },
  { id: 'records', label: '기록', icon: FileText },
  { id: 'report', label: '리포트', icon: BarChart3 },
  { id: 'life', label: '생활', icon: Heart },
  { id: 'settings', label: '설정', icon: Settings },
];

function HeaderBar() {
  const { studySessions, todos, selectedDate } = useStore();
  const today = getToday();

  const todaySessions = studySessions.filter((s) => {
    if (!s.startedAt) return false;
    const d = new Date(s.startedAt);
    const sessionDate = d.getHours() < 2
      ? new Date(d.getTime() - 86400000).toISOString().split('T')[0]
      : d.toISOString().split('T')[0];
    return sessionDate === today;
  });

  const totalSec = todaySessions.reduce((a, s) => a + (s.durationSeconds || 0), 0);
  const camSec = todaySessions.filter((s) => s.isCamstudy).reduce((a, s) => a + (s.durationSeconds || 0), 0);
  const todayTodos = todos.filter((t) => t.date === today);
  const completedCount = todayTodos.filter((t) => t.status === 'completed').length;

  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const ch = Math.floor(camSec / 3600);
  const cm = Math.floor((camSec % 3600) / 60);

  return (
    <div className="h-14 flex items-center px-6 gap-6 border-b border-gray-100 bg-white/95 backdrop-blur-sm sticky top-0 z-30">
      <span className="text-sm font-medium text-gray-900 hidden md:block">
        {formatDate(new Date().toISOString().split('T')[0])}
      </span>
      <div className="flex items-center gap-4 ml-auto text-sm">
        <div className="flex items-center gap-1.5 bg-gray-100 px-3 py-1.5 rounded-full">
          <Timer size={14} className="text-gray-500" />
          <span className="font-medium text-gray-900">{h}h {m}m</span>
          <span className="text-gray-400">공부</span>
        </div>
        <div className="flex items-center gap-1.5 bg-black px-3 py-1.5 rounded-full">
          <Video size={14} className="text-yellow-400" />
          <span className="font-medium text-white">{ch}h {cm}m</span>
          <span className="text-gray-400">캠</span>
        </div>
        <div className="flex items-center gap-1.5 bg-gray-100 px-3 py-1.5 rounded-full">
          <span className="font-bold text-gray-900">{completedCount}</span>
          <span className="text-gray-400">/</span>
          <span className="text-gray-500">{todayTodos.length}</span>
          <span className="text-gray-400">완료</span>
        </div>
      </div>
    </div>
  );
}

function AppHooks() {
  const { loadAll, initialized, proofPhotos, deleteProofPhoto } = useStore();
  useDailyReport();
  useNotifications();

  useEffect(() => {
    loadAll();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (initialized) cleanupOldPhotos(proofPhotos, deleteProofPhoto);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialized]);

  return null;
}

export function Layout() {
  const { currentTab, setCurrentTab } = useStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const views: Record<string, React.ReactNode> = {
    today: <TodayView />,
    timer: <TimerView />,
    camstudy: <CamstudyView />,
    materials: <MaterialsView />,
    records: <RecordsView />,
    report: <ReportView />,
    life: <LifeView />,
    settings: <SettingsView />,
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <AppHooks />
      <InactivityModal />
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed md:relative z-50 md:z-auto flex flex-col bg-black w-56 h-full transition-transform duration-300 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Logo */}
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
              <span className="text-black font-black text-sm">E</span>
            </div>
            <span className="text-white font-bold text-lg tracking-tight">ENE Focus</span>
          </div>
        </div>

        {/* Nav items */}
        <nav className="flex-1 p-3 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setCurrentTab(item.id);
                  setSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-150 mb-1 ${
                  active
                    ? 'bg-white text-black'
                    : 'text-gray-400 hover:text-white hover:bg-white/10'
                }`}
              >
                <Icon size={18} />
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* User */}
        <div className="p-4 border-t border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center text-white text-sm font-bold">
              김
            </div>
            <div>
              <p className="text-white text-sm font-medium">김성현</p>
              <p className="text-gray-500 text-xs">demo@enefocus.kr</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile top bar */}
        <div className="md:hidden flex items-center h-14 px-4 border-b border-gray-100 bg-white">
          <button onClick={() => setSidebarOpen(true)} className="p-2 hover:bg-gray-100 rounded-xl">
            <Menu size={20} />
          </button>
          <span className="ml-3 font-bold text-gray-900">ENE Focus</span>
        </div>

        <HeaderBar />

        <main className="flex-1 overflow-y-auto">
          {views[currentTab] || <TodayView />}
        </main>
      </div>
    </div>
  );
}
