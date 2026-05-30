/**
 * ============================================
 * App 主组件
 * 移动端优先设计，同时适配桌面端
 * 采用"底部导航 + 页面切换"的经典App架构
 * ============================================
 */

import { useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useRecordStore } from './stores/recordStore';
import BottomNav from './components/layout/BottomNav';
import TimelinePage from './pages/TimelinePage';
import UploadPage from './pages/UploadPage';
import RecordsPage from './pages/RecordsPage';
import ProfilePage from './pages/ProfilePage';
import RecordDetailPage from './pages/RecordDetailPage';
import OCRConfirmPage from './pages/OCRConfirmPage';
import { initDemoData } from './utils/demoData';

function App() {
  const location = useLocation();
  const { loadPatients, loadRecords, loadVisitEvents, patients } = useRecordStore();

  // 初始化数据
  useEffect(() => {
    const init = async () => {
      await loadPatients();
      // 如果没有患者数据，初始化演示数据
      const currentPatients = useRecordStore.getState().patients;
      if (currentPatients.length === 0) {
        await initDemoData();
        await loadPatients();
      }
      await loadRecords();
      await loadVisitEvents();
    };
    init();
  }, []);

  // 同步Tab状态到路由
  useEffect(() => {
    const path = location.pathname;
    const tab = path.split('/')[1] || 'timeline';
    useRecordStore.setState({ activeTab: tab as never });
  }, [location]);

  // 隐藏底部导航的页面
  const hideNavPaths = ['/ocr-confirm', '/record/'];
  const showNav = !hideNavPaths.some(path => location.pathname.startsWith(path));

  return (
    <div className="min-h-screen bg-[var(--color-bg)] flex justify-center">
      {/* 移动端容器 - 限制最大宽度 */}
      <div className="w-full max-w-[430px] bg-[var(--color-surface)] min-h-screen shadow-2xl relative flex flex-col">
        {/* 主内容区域 */}
        <main className="flex-1 overflow-y-auto pb-20">
          <Routes>
            <Route path="/timeline" element={<TimelinePage />} />
            <Route path="/records" element={<RecordsPage />} />
            <Route path="/upload" element={<UploadPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/record/:id" element={<RecordDetailPage />} />
            <Route path="/ocr-confirm/:taskId" element={<OCRConfirmPage />} />
            <Route path="/" element={<Navigate to="/timeline" replace />} />
          </Routes>
        </main>

        {/* 底部导航 */}
        {showNav && <BottomNav />}
      </div>
    </div>
  );
}

export default App;
