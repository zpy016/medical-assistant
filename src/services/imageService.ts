/**
 * 图片存储服务
 * 封装 TOS 上传和预签名 URL 获取
 */

import { getAuthToken } from './syncService';

/**
 * 上传图片到 TOS
 * @param file 图片文件
 * @returns { objectKey: string }
 */
export async function uploadImageToTOS(file: File): Promise<{ objectKey: string; size: number }> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Not logged in');
  }

  const formData = new FormData();
  formData.append('image', file);

  const response = await fetch('/api/images/upload', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    body: formData,
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Upload failed');
  }

  return { objectKey: data.objectKey, size: data.size };
}

/**
 * 获取图片预签名 URL
 * @param objectKey TOS 对象键
 * @param expires 有效期秒数
 * @returns 预签名 URL
 */
export async function getImagePresignedUrl(objectKey: string, expires = 3600): Promise<string> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Not logged in');
  }

  const response = await fetch('/api/images/presign', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ objectKey, expires }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Presign failed');
  }

  return data.url;
}

/**
 * 删除 TOS 图片
 * @param objectKey
 */
export async function deleteImageFromTOS(objectKey: string): Promise<void> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Not logged in');
  }

  const response = await fetch(`/api/images/${encodeURIComponent(objectKey)}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || 'Delete failed');
  }
}
