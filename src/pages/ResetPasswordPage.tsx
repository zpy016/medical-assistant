/**
 * 用户重置密码页面
 * 使用管理员提供的重置密钥来重置密码
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, KeyRound, Lock, Eye, EyeOff, ArrowLeft, CheckCircle2 } from 'lucide-react';

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [keyCode, setKeyCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async () => {
    setError('');
    setSuccess(false);

    if (!keyCode.trim()) {
      setError('请输入重置密钥');
      return;
    }
    if (newPassword.length < 6) {
      setError('新密码至少6位');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('两次输入的密码不一致');
      return;
    }

    setLoading(true);
    try {
      // 先验证密钥
      const verifyRes = await fetch('/api/auth/verify-reset-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyCode: keyCode.trim() }),
      });
      const verifyData = await verifyRes.json();
      if (!verifyRes.ok) {
        throw new Error(verifyData.error || '密钥无效');
      }

      // 重置密码
      const resetRes = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyCode: keyCode.trim(), newPassword }),
      });
      const resetData = await resetRes.json();
      if (!resetRes.ok) {
        throw new Error(resetData.error || '重置失败');
      }

      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : '重置失败');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-full bg-white animate-fade-in">
        <div className="flex flex-col items-center justify-center min-h-screen px-6">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
            <CheckCircle2 className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-xl font-bold text-[var(--color-text)]">密码重置成功</h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-2 text-center">
            请使用新密码登录
          </p>
          <button
            onClick={() => navigate('/login')}
            className="mt-6 w-full py-3.5 bg-[var(--color-primary)] text-white rounded-xl text-sm font-medium"
          >
            去登录
          </button>
        </div>
      </div>
    );
  }

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
      <div className="flex flex-col items-center py-6">
        <div className="w-16 h-16 rounded-2xl bg-[var(--color-primary)] flex items-center justify-center mb-4">
          <Shield className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-xl font-bold text-[var(--color-text)]">重置密码</h1>
        <p className="text-sm text-[var(--color-text-muted)] mt-1">
          请输入管理员提供的重置密钥
        </p>
      </div>

      {/* 表单 */}
      <div className="px-6 space-y-4">
        {/* 密钥 */}
        <div>
          <label className="text-xs text-[var(--color-text-secondary)] mb-1.5 block">重置密钥</label>
          <div className="relative">
            <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)]" />
            <input
              type="text"
              placeholder="如: RESET-ABC12345"
              value={keyCode}
              onChange={(e) => setKeyCode(e.target.value)}
              className="w-full pl-10 pr-3 py-3 bg-[var(--color-bg)] rounded-xl text-sm outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
            />
          </div>
        </div>

        {/* 新密码 */}
        <div>
          <label className="text-xs text-[var(--color-text-secondary)] mb-1.5 block">新密码</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)]" />
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="设置新密码（至少6位）"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
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

        {/* 确认密码 */}
        <div>
          <label className="text-xs text-[var(--color-text-secondary)] mb-1.5 block">确认密码</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)]" />
            <input
              type="password"
              placeholder="再次输入新密码"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full pl-10 pr-3 py-3 bg-[var(--color-bg)] rounded-xl text-sm outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
            />
          </div>
        </div>

        {/* 错误提示 */}
        {error && (
          <div className="flex items-center gap-1.5 text-xs text-[var(--color-danger)]">
            {error}
          </div>
        )}

        {/* 提交按钮 */}
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full py-3.5 bg-[var(--color-primary)] text-white rounded-xl text-sm font-medium active:scale-[0.98] transition-transform disabled:opacity-60"
        >
          {loading ? '请稍候...' : '重置密码'}
        </button>
      </div>

      {/* 说明 */}
      <div className="px-6 mt-8">
        <div className="bg-[var(--color-bg)] rounded-xl p-4">
          <p className="text-[11px] text-[var(--color-text-muted)] leading-relaxed">
            重置密钥由管理员生成，通常有效期为24小时。如果您没有密钥，请联系管理员获取。
          </p>
        </div>
      </div>
    </div>
  );
}
