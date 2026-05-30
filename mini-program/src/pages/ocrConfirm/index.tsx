import { useState, useEffect } from 'react';
import { View, Text, Image, ScrollView, Input, Textarea } from '@tarojs/components';
import Taro, { useRouter } from '@tarojs/taro';
import { useRecordStore } from '../../stores/recordStore';
import { VISIT_TYPE_CONFIG } from '../../utils/types';
import { VisitEvent, StructuredData } from '../../utils/types';
import './index.css';

const FIELD_LABELS: Record<string, string> = {
  patientName: '患者姓名',
  hospital: '医院',
  department: '科室',
  date: '就诊日期',
  diagnosis: '诊断',
  medications: '药品',
  doctorName: '医生',
  symptoms: '症状',
  visitType: '就诊类型'
};

export default function OCRConfirmPage() {
  const router = useRouter();
  const { addVisitEvent } = useRecordStore();
  const [images, setImages] = useState<string[]>([]);
  const [structuredData, setStructuredData] = useState<StructuredData>({});
  const [visitType, setVisitType] = useState<string>('outpatient');
  const [showTypePicker, setShowTypePicker] = useState(false);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const { results, images: imgParam, mode, id } = router.params;

    if (mode === 'view' && id) {
      // 查看模式 - 从 store 加载
      const event = useRecordStore.getState().visitEvents.find((e) => e.id === id);
      if (event) {
        setStructuredData({
          patientName: '',
          hospital: event.hospital,
          department: event.department,
          date: event.date,
          diagnosis: event.diagnosis,
          medications: event.medications,
          visitType: event.visitType
        });
        setVisitType(event.visitType);
        setImages(event.images || []);
      }
    } else if (results) {
      // OCR 结果模式
      try {
        const ocrResults = JSON.parse(decodeURIComponent(results));
        // 简单解析第一个结果
        const firstResult = ocrResults[0];
        if (firstResult?.structuredData) {
          setStructuredData(firstResult.structuredData);
          setVisitType(firstResult.structuredData.visitType || 'outpatient');
        }
        if (imgParam) {
          setImages(JSON.parse(decodeURIComponent(imgParam)));
        }
      } catch (e) {
        console.error('Parse OCR result error:', e);
      }
    }
  }, []);

  const openEdit = (field: string, value: unknown) => {
    setEditingField(field);
    setEditValue(Array.isArray(value) ? value.join('、') : String(value || ''));
  };

  const saveEdit = () => {
    if (!editingField) return;
    setStructuredData((prev) => ({
      ...prev,
      [editingField]: editingField === 'diagnosis' || editingField === 'medications'
        ? editValue.split('、').map((s) => s.trim()).filter(Boolean)
        : editValue
    }));
    setEditingField(null);
    setEditValue('');
  };

  const handleSave = () => {
    setSaving(true);

    const event: VisitEvent = {
      id: Date.now().toString(),
      date: structuredData.date || new Date().toISOString().split('T')[0],
      hospital: structuredData.hospital || '未知医院',
      department: structuredData.department || '未知科室',
      visitType: visitType as any,
      diagnosis: Array.isArray(structuredData.diagnosis) ? structuredData.diagnosis : structuredData.diagnosis ? [structuredData.diagnosis] : [],
      icd10Codes: structuredData.icd10Codes || [],
      medications: Array.isArray(structuredData.medications) ? structuredData.medications : [],
      labResults: [],
      images,
      notes: '',
      abnormalFlags: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    addVisitEvent(event);

    setTimeout(() => {
      setSaving(false);
      Taro.showToast({ title: '保存成功', icon: 'success' });
      setTimeout(() => {
        Taro.switchTab({ url: '/pages/index/index' });
      }, 1000);
    }, 500);
  };

  const renderField = (field: string, value: unknown) => {
    const label = FIELD_LABELS[field] || field;
    const displayValue = Array.isArray(value)
      ? (value.length > 0 ? value.join('、') : '未识别')
      : (value || '未识别');

    return (
      <View key={field} className="field-row" onClick={() => openEdit(field, value)}>
        <Text className="field-label">{label}</Text>
        <View className="flex items-center">
          <Text className={`field-value ${!value || (Array.isArray(value) && value.length === 0) ? 'field-empty' : ''}`}>
            {displayValue}
          </Text>
          <Text className="text-gray-400 text-sm ml-1">›</Text>
        </View>
      </View>
    );
  };

  return (
    <View className="ocr-page">
      <ScrollView scrollY className="ocr-scroll">
        {/* 图片预览 */}
        {images.length > 0 && (
          <ScrollView scrollX className="image-scroll">
            {images.map((img, i) => (
              <Image key={i} className="ocr-image" src={img} mode="aspectFill" />
            ))}
          </ScrollView>
        )}

        {/* 就诊类型 */}
        <View className="card">
          <Text className="text-sm text-gray-500 mb-2">就诊类型</Text>
          <View className="type-selector">
            {Object.entries(VISIT_TYPE_CONFIG).map(([type, config]) => (
              <View
                key={type}
                className={`type-option ${visitType === type ? 'type-active' : ''}`}
                style={{ borderColor: visitType === type ? config.color : undefined }}
                onClick={() => setVisitType(type)}
              >
                <View
                  className="type-dot"
                  style={{ background: config.color }}
                />
                <Text style={{ color: visitType === type ? config.color : undefined }}>
                  {config.label}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* 结构化字段 */}
        <View className="card">
          <Text className="section-title">识别结果</Text>
          {Object.entries(structuredData)
            .filter(([key]) => key !== 'visitType' && key !== 'icd10Codes')
            .map(([field, value]) => renderField(field, value))}
        </View>

        {/* ICD-10 编码 */}
        {structuredData.icd10Codes && structuredData.icd10Codes.length > 0 && (
          <View className="card">
            <Text className="section-title">ICD-10 编码</Text>
            <View className="flex flex-wrap gap-2">
              {structuredData.icd10Codes.map((code, i) => (
                <View key={i} className="chip chip-blue">
                  <Text>{code}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      {/* 底部 */}
      <View className="ocr-footer safe-bottom">
        <View className={`btn btn-primary ${saving ? 'btn-disabled' : ''}`} onClick={handleSave}>
          <Text>{saving ? '保存中...' : '确认保存'}</Text>
        </View>
      </View>

      {/* 编辑弹窗 */}
      {editingField && (
        <View className="edit-modal">
          <View className="edit-overlay" onClick={() => setEditingField(null)} />
          <View className="edit-panel">
            <View className="flex items-center justify-between mb-3">
              <Text className="text-lg font-bold">编辑{FIELD_LABELS[editingField]}</Text>
              <Text className="text-primary" onClick={() => setEditingField(null)}>取消</Text>
            </View>
            {editingField === 'diagnosis' || editingField === 'medications' ? (
              <Textarea
                className="edit-textarea"
                value={editValue}
                onInput={(e) => setEditValue((e.target as any).value)}
                placeholder={`多个用"、"分隔`}
                maxlength={500}
              />
            ) : (
              <Input
                className="edit-input"
                value={editValue}
                onInput={(e) => setEditValue((e.target as any).value)}
                placeholder={`请输入${FIELD_LABELS[editingField]}`}
              />
            )}
            <View className="btn btn-primary mt-3" onClick={saveEdit}>
              <Text>确定</Text>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}
