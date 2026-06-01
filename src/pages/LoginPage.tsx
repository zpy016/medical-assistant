/**
 * 登录/注册页面
 * 支持手机号 + 密码登录/注册
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Phone, Lock, Eye, EyeOff, ArrowLeft, CheckCircle2 } from 'lucide-react';

interface LoginPageProps {
  onLogin?: (token: string, user: { id: string; phone: string; name?: string }) => void;
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const navigate = useNavigate();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const validatePhone = (p: string) => /^1[3-9]\d{9}$/.test(p);

  const handleSubmit = async () => {
    setError('');

    if (!validatePhone(phone)) {
      setError('请输入有效的手机号码');
      return;
    }
    if (password.length < 6) {
      setError('密码至少6位');
      return;
    }
    if (mode === 'register' && !name.trim()) {
      setError('请输入姓名');
      return;
    }

    setLoading(true);
    try {
      const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const body = mode === 'login'
        ? { phone, password }
        : { phone, password, name };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || '请求失败');
      }

      // 存储 token
      localStorage.setItem('medical_auth_token', result.token);
      localStorage.setItem('medical_user', JSON.stringify(result.user));

      onLogin?.(result.token, result.user);
      navigate('/timeline');
    } catch (err) {
      setError(err instanceof Error ? err.message : '登录失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-full bg-white animate-fade-in">
      {/* 顶部 */}
      <div className="px-5 pt-6 pb-4">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-[var(--color-text-secondary)]">
          <ArrowLeft className="w-4 h-4" />
          返回
        </button>
      </div>

      {/* Logo区域 */}
      <div className="flex flex-col items-center py-8">
        <div className="w-16 h-16 rounded-2xl bg-[var(--color-primary)] flex items-center justify-center mb-4">
          <Shield className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-xl font-bold text-[var(--color-text)]">
          {mode === 'login' ? '欢迎回来' : '创建账号'}
        </h1>
        <p className="text-sm text-[var(--color-text-muted)] mt-1">
          {mode === 'login' ? '登录以同步您的健康数据' : '注册后数据可云端同步'}
        </p>
      </div>

      {/* 表单 */}
      <div className="px-6 space-y-4">
        {/* 手机号 */}
        <div>
          <label className="text-xs text-[var(--color-text-secondary)] mb-1.5 block">手机号码</label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)]" />
            <input
              type="tel"
              placeholder="请输入手机号"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              maxLength={11}
              className="w-full pl-10 pr-3 py-3 bg-[var(--color-bg)] rounded-xl text-sm outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
            />
          </div>
        </div>

        {/* 密码 */}
        <div>
          <label className="text-xs text-[var(--color-text-secondary)] mb-1.5 block">密码</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)]" />
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder={mode === 'register' ? '设置密码（至少6位）' : '请输入密码'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-10 pr-10 py-3 bg-[var(--color-bg)] rounded-xl text-sm outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
            />
            <button
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2"
            >
              {showPassword ? (
                <EyeOff className="w-4 h-4 text-[var(--color-text-muted)]" />
              ) : (
                <Eye className="w-4 h-4 text-[var(--color-text-muted)]" />
              )}
            </button>
          </div>
        </div>

        {/* 姓名（仅注册） */}
        {mode === 'register' && (
          <div>
            <label className="text-xs text-[var(--color-text-secondary)] mb-1.5 block">姓名</label>
            <input
              type="text"
              placeholder="请输入您的姓名"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-3 bg-[var(--color-bg)] rounded-xl text-sm outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
            />
          </div>
        )}

        {/* 错误提示 */}
        {error && (
          <div className="flex items-center gap-1.5 text-xs text-[var(--color-danger)]">
            <CheckCircle2 className="w-3.5 h-3.5" />
            {error}
          </div>
        )}

        {/* 提交按钮 */}
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full py-3.5 bg-[var(--color-primary)] text-white rounded-xl text-sm font-medium active:scale-[0.98] transition-transform disabled:opacity-60"
        >
          {loading ? '请稍候...' : mode === 'login' ? '登录' : '注册'}
        </button>

        {/* 切换模式 */}
        <div className="text-center space-y-2">
          <button
            onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}
            className="text-xs text-[var(--color-primary)] block w-full"
          >
            {mode === 'login' ? '还没有账号？立即注册' : '已有账号？直接登录'}
          </button>
          {mode === 'login' && (
            <button
              onClick={() => navigate('/reset-password')}
              className="text-xs text-[var(--color-text-muted)] block w-full"
            >
              忘记密码？使用重置密钥
            </button>
          )}
        </div>
      </div>

      {/* 说明 */}
      <div className="px-6 mt-8">
        <div className="bg-[var(--color-bg)] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="w-4 h-4 text-[var(--color-primary)]" />
            <span className="text-xs font-medium">数据安全说明</span>
          </div>
          <p className="text-[11px] text-[var(--color-text-muted)] leading-relaxed">
            您的健康数据采用加密存储，仅您本人可访问。登录后数据将同步到云端，换设备登录可恢复数据。
          </p>
        </div>
      </div>
    </div>
  );
}
