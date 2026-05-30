import { useState, useCallback } from 'react';
import { View, Text, Image, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { uploadFile } from '../../utils/api';
import './index.css';

export default function UploadPage() {
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const chooseImage = useCallback(() => {
    Taro.showActionSheet({
      itemList: ['拍照', '从相册选择'],
      success: (res) => {
        const sourceType = res.tapIndex === 0 ? ['camera'] : ['album'];
        Taro.chooseMedia({
          count: 9 - selectedImages.length,
          mediaType: ['image'],
          sourceType: sourceType as any,
          success: (mediaRes) => {
            const tempFiles = mediaRes.tempFiles.map((f) => f.tempFilePath);
            setSelectedImages((prev) => [...prev, ...tempFiles]);
          },
          fail: (err) => {
            if (err.errMsg?.includes('cancel')) return;
            Taro.showToast({ title: '选择失败', icon: 'none' });
          }
        });
      }
    });
  }, [selectedImages.length]);

  const removeImage = (index: number) => {
    setSelectedImages((prev) => prev.filter((_, i) => i !== index));
  };

  const previewImage = (current: string) => {
    Taro.previewImage({ current, urls: selectedImages });
  };

  const startOCR = async () => {
    if (selectedImages.length === 0) {
      Taro.showToast({ title: '请先选择图片', icon: 'none' });
      return;
    }

    setUploading(true);
    setProgress(0);

    try {
      // 逐个上传并OCR
      const results = [];
      for (let i = 0; i < selectedImages.length; i++) {
        setProgress(Math.round(((i + 0.5) / selectedImages.length) * 100));
        const res = await uploadFile(selectedImages[i]);
        results.push(res);
        setProgress(Math.round(((i + 1) / selectedImages.length) * 100));
      }

      // 跳转到OCR确认页
      Taro.navigateTo({
        url: `/pages/ocrConfirm/index?results=${encodeURIComponent(JSON.stringify(results))}&images=${encodeURIComponent(JSON.stringify(selectedImages))}`
      });
    } catch (err) {
      Taro.showToast({ title: err instanceof Error ? err.message : '识别失败', icon: 'none' });
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  return (
    <View className="upload-page">
      <ScrollView scrollY className="upload-scroll">
        {/* 提示 */}
        <View className="upload-tips card">
          <Text className="text-sm text-gray-600">📸 支持拍摄或从相册选择病历、诊断单、检验报告等</Text>
          <Text className="text-xs text-gray-400 mt-1">建议光线充足、文字清晰，单次最多9张</Text>
        </View>

        {/* 图片选择区 */}
        <View className="image-grid card">
          {selectedImages.map((img, index) => (
            <View key={index} className="image-item">
              <Image
                className="image-preview"
                src={img}
                mode="aspectFill"
                onClick={() => previewImage(img)}
              />
              <View className="image-remove" onClick={() => removeImage(index)}>
                <Text className="text-white text-xs">✕</Text>
              </View>
            </View>
          ))}
          {selectedImages.length < 9 && (
            <View className="image-add" onClick={chooseImage}>
              <Text className="text-3xl text-gray-400">+</Text>
              <Text className="text-xs text-gray-400 mt-1">添加图片</Text>
            </View>
          )}
        </View>

        {/* 上传进度 */}
        {uploading && (
          <View className="card">
            <Text className="text-sm text-gray-600">正在识别... {progress}%</Text>
            <View className="progress-bar">
              <View className="progress-fill" style={{ width: `${progress}%` }} />
            </View>
          </View>
        )}
      </ScrollView>

      {/* 底部按钮 */}
      <View className="upload-footer safe-bottom">
        <View
          className={`btn btn-primary ${selectedImages.length === 0 || uploading ? 'btn-disabled' : ''}`}
          onClick={startOCR}
        >
          <Text>{uploading ? '识别中...' : `开始识别 (${selectedImages.length}张)`}</Text>
        </View>
      </View>
    </View>
  );
}
