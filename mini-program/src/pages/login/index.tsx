import { useState } from 'react';
import { View, Text } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { login, register } from '../../utils/api';
import { setToken } from '../../utils/storage';
import './index.css';

export default function LoginPage() {
  const [isRegister, setIsRegister] = useState(false);
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const validate = () => {
    if (!phone.trim()) {
      Taro.showToast({ title: '请输入手机号', icon: 'none' });
      return false;
    }
    if (!/^1\d{10}$/.test(phone)) {
      Taro.showToast({ title: '手机号格式错误', icon: 'none' });
      return false;
    }
    if (!password) {
      Taro.showToast({ title: '请输入密码', icon: 'none' });
      return false;
    }
    if (password.length < 6) {
      Taro.showToast({ title: '密码至少6位', icon: 'none' });
      return false;
    }
    if (isRegister && password !== confirmPassword) {
      Taro.showToast({ title: '两次密码不一致', icon: 'none' });
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validate() || loading) return;
    setLoading(true);

    try {
      if (isRegister) {
        const res = await register(phone, password, name || undefined);
        setToken(res.token);
        Taro.showToast({ title: '注册成功', icon: 'success' });
      } else {
        const res = await login(phone, password);
        setToken(res.token);
        Taro.showToast({ title: '登录成功', icon: 'success' });
      }

      setTimeout(() => {
        Taro.navigateBack();
      }, 1000);
    } catch (err) {
      Taro.showToast({
        title: err instanceof Error ? err.message : '操作失败',
        icon: 'none'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="login-page">
      <View className="login-header">
        <Text className="login-title">{isRegister ? '创建账号' : '欢迎回来'}</Text>
        <Text className="login-subtitle">
          {isRegister ? '注册后数据可云端同步' : '登录以同步您的病历数据'}
        </Text>
      </View>

      <View className="login-form">
        {isRegister && (
          <View className="form-group">
            <Text className="form-label">昵称（选填）</Text>
            <input
              className="form-input"
              placeholder="您的称呼"
              value={name}
              onInput={(e) => setName((e.target as any).value)}
            />
          </View>
        )}

        <View className="form-group">
          <Text className="form-label">手机号</Text>
          <input
            className="form-input"
            placeholder="请输入11位手机号"
            type="number"
            maxlength={11}
            value={phone}
            onInput={(e) => setPhone((e.target as any).value)}
          />
        </View>

        <View className="form-group">
          <Text className="form-label">密码</Text>
          <input
            className="form-input"
            placeholder="至少6位字符"
            type="password"
            value={password}
            onInput={(e) => setPassword((e.target as any).value)}
          />
        </View>

        {isRegister && (
          <View className="form-group">
            <Text className="form-label">确认密码</Text>
            <input
              className="form-input"
              placeholder="再次输入密码"
              type="password"
              value={confirmPassword}
              onInput={(e) => setConfirmPassword((e.target as any).value)}
            />
          </View>
        )}

        <View
          className={`btn btn-primary login-btn ${loading ? 'btn-disabled' : ''}`}
          onClick={handleSubmit}
        >
          <Text>{loading ? '处理中...' : (isRegister ? '注册' : '登录')}</Text>
        </View>

        <View className="login-switch" onClick={() => setIsRegister(!isRegister)}>
          <Text className="text-primary text-sm">
            {isRegister ? '已有账号？去登录' : '没有账号？去注册'}
          </Text>
        </View>
      </View>

      <View className="login-tips">
        <Text className="text-xs text-gray-400">登录即表示您同意《用户协议》和《隐私政策》</Text>
      </View>
    </View>
  );
}
