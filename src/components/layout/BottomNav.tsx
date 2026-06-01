import { useNavigate, useLocation } from 'react-router-dom';
import { Home, FolderOpen, Camera, User } from 'lucide-react';

const navItems = [
  { id: 'timeline', label: '首页', icon: Home, path: '/timeline' },
  { id: 'records', label: '病历夹', icon: FolderOpen, path: '/records' },
  { id: 'upload', label: '拍摄', icon: Camera, path: '/upload' },
  { id: 'profile', label: '我的', icon: User, path: '/profile' },
];

export default function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path: string) => location.pathname.startsWith(path);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex justify-center">
      <div className="w-full max-w-[430px] bg-white/95 backdrop-blur-md border-t border-[var(--color-border)] px-6 py-2 pb-[env(safe-area-inset-bottom,8px)] flex items-center justify-around">
        {navItems.map((item) => {
          const active = isActive(item.path);
          return (
            <button
              key={item.id}
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center gap-0.5 min-w-[56px] py-1 rounded-xl transition-colors ${
                active ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-muted)]'
              }`}
            >
              <item.icon className={`w-5 h-5 ${active ? 'stroke-[2.5px]' : 'stroke-[1.5px]'}`} />
              <span className={`text-[10px] ${active ? 'font-medium' : ''}`}>{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
