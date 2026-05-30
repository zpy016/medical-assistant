import { useState, useCallback } from 'react';
import { View, Text, ScrollView, Image } from '@tarojs/components';
import Taro, { usePullDownRefresh, useDidShow } from '@tarojs/taro';
import { useRecordStore } from '../../stores/recordStore';
import { VISIT_TYPE_CONFIG } from '../../utils/types';
import { VisitEvent } from '../../utils/types';
import './index.css';

export default function IndexPage() {
  const {
    visitEvents,
    patients,
    currentPatientId,
    isLoading,
    filterVisitTypes,
    filterHospitals,
    filterDepartments,
    filterTimeRange,
    searchQuery,
    setFilters,
    clearFilters,
    loadFromStorage,
    setLoading
  } = useRecordStore();

  const [showFilters, setShowFilters] = useState(false);

  useDidShow(() => {
    loadFromStorage();
  });

  usePullDownRefresh(() => {
    loadFromStorage();
    Taro.stopPullDownRefresh();
  });

  const currentPatient = patients.find((p) => p.id === currentPatientId);

  // 筛选逻辑
  const filteredEvents = visitEvents.filter((event) => {
    if (filterVisitTypes.length > 0 && !filterVisitTypes.includes(event.visitType)) return false;
    if (filterHospitals.length > 0 && !filterHospitals.includes(event.hospital)) return false;
    if (filterDepartments.length > 0 && !filterDepartments.includes(event.department)) return false;
    if (filterTimeRange !== 'all') {
      const now = new Date();
      const eventDate = new Date(event.date);
      const diffMs = now.getTime() - eventDate.getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);
      if (filterTimeRange === '3m' && diffDays > 90) return false;
      if (filterTimeRange === '6m' && diffDays > 180) return false;
      if (filterTimeRange === '1y' && diffDays > 365) return false;
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const text = `${event.hospital} ${event.department} ${event.diagnosis.join(' ')} ${event.notes || ''}`.toLowerCase();
      if (!text.includes(q)) return false;
    }
    return true;
  });

  // 统计数据
  const stats = {
    total: visitEvents.length,
    hospitals: new Set(visitEvents.map((e) => e.hospital)).size,
    abnormal: visitEvents.reduce((sum, e) => sum + (e.abnormalFlags?.length || 0), 0)
  };

  // 按日期分组
  const groupedEvents = filteredEvents.reduce((groups, event) => {
    const date = event.date?.split('T')[0] || '未知日期';
    if (!groups[date]) groups[date] = [];
    groups[date].push(event);
    return groups;
  }, {} as Record<string, VisitEvent[]>);

  const sortedDates = Object.keys(groupedEvents).sort((a, b) => b.localeCompare(a));

  // 提取筛选选项
  const allHospitals = [...new Set(visitEvents.map((e) => e.hospital).filter(Boolean))];
  const allDepartments = [...new Set(visitEvents.map((e) => e.department).filter(Boolean))];

  const toggleFilter = useCallback((type: string, value: string, current: string[], setter: (v: string[]) => void) => {
    if (current.includes(value)) {
      setter(current.filter((v) => v !== value));
    } else {
      setter([...current, value]);
    }
  }, []);

  const handleEventTap = (event: VisitEvent) => {
    Taro.navigateTo({
      url: `/pages/ocrConfirm/index?mode=view&id=${event.id}`
    });
  };

  return (
    <View className="page-container">
      {/* 患者卡片 */}
      <View className="patient-card">
        <View className="flex items-center justify-between">
          <View className="flex items-center">
            <View className="avatar">
              <Text className="avatar-text">{currentPatient?.name?.[0] || '用'}</Text>
            </View>
            <View className="ml-1">
              <Text className="text-lg font-bold">{currentPatient?.name || '我的病历'}</Text>
              <Text className="text-sm text-gray-500">{patients.length > 1 ? `${patients.length}位患者` : '个人病历'}</Text>
            </View>
          </View>
          <View className="stats-row">
            <View className="stat-item">
              <Text className="stat-num">{stats.total}</Text>
              <Text className="stat-label">病历</Text>
            </View>
            <View className="stat-item">
              <Text className="stat-num">{stats.hospitals}</Text>
              <Text className="stat-label">医院</Text>
            </View>
            <View className="stat-item">
              <Text className="stat-num text-danger">{stats.abnormal}</Text>
              <Text className="stat-label">异常</Text>
            </View>
          </View>
        </View>
      </View>

      {/* 搜索 + 筛选 */}
      <View className="search-bar">
        <View className="search-input-wrapper">
          <Text className="search-icon">🔍</Text>
          <input
            className="search-input"
            placeholder="搜索医院、科室、诊断..."
            value={searchQuery}
            onInput={(e) => setFilters({ searchQuery: (e.target as any).value })}
          />
        </View>
        <View
          className={`filter-btn ${(filterVisitTypes.length > 0 || filterHospitals.length > 0 || filterDepartments.length > 0 || filterTimeRange !== 'all') ? 'filter-active' : ''}`}
          onClick={() => setShowFilters(!showFilters)}
        >
          <Text>筛选</Text>
        </View>
      </View>

      {/* 筛选面板 */}
      {showFilters && (
        <View className="filter-panel card">
          {/* 就诊类型 */}
          <View className="filter-section">
            <Text className="filter-label">就诊类型</Text>
            <View className="filter-chips">
              {Object.entries(VISIT_TYPE_CONFIG).map(([type, config]) => (
                <View
                  key={type}
                  className={`filter-chip ${filterVisitTypes.includes(type) ? 'filter-chip-active' : ''}`}
                  style={{ borderColor: filterVisitTypes.includes(type) ? config.color : undefined }}
                  onClick={() => toggleFilter('type', type, filterVisitTypes, (v) => setFilters({ filterVisitTypes: v }))}
                >
                  <Text style={{ color: filterVisitTypes.includes(type) ? config.color : undefined }}>
                    {config.label}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          {/* 时间范围 */}
          <View className="filter-section">
            <Text className="filter-label">时间范围</Text>
            <View className="filter-chips">
              {[
                { key: '3m', label: '近3月' },
                { key: '6m', label: '近6月' },
                { key: '1y', label: '近1年' },
                { key: 'all', label: '全部' }
              ].map(({ key, label }) => (
                <View
                  key={key}
                  className={`filter-chip ${filterTimeRange === key ? 'filter-chip-active' : ''}`}
                  onClick={() => setFilters({ filterTimeRange: key as any })}
                >
                  <Text>{label}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* 医院 */}
          {allHospitals.length > 0 && (
            <View className="filter-section">
              <Text className="filter-label">医院</Text>
              <View className="filter-chips">
                {allHospitals.map((h) => (
                  <View
                    key={h}
                    className={`filter-chip ${filterHospitals.includes(h) ? 'filter-chip-active' : ''}`}
                    onClick={() => toggleFilter('hospital', h, filterHospitals, (v) => setFilters({ filterHospitals: v }))}
                  >
                    <Text>{h}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* 科室 */}
          {allDepartments.length > 0 && (
            <View className="filter-section">
              <Text className="filter-label">科室</Text>
              <View className="filter-chips">
                {allDepartments.map((d) => (
                  <View
                    key={d}
                    className={`filter-chip ${filterDepartments.includes(d) ? 'filter-chip-active' : ''}`}
                    onClick={() => toggleFilter('dept', d, filterDepartments, (v) => setFilters({ filterDepartments: v }))}
                  >
                    <Text>{d}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          <View className="flex gap-2 mt-3">
            <View className="btn btn-outline flex-1" onClick={clearFilters}>
              <Text>重置</Text>
            </View>
            <View className="btn btn-primary flex-1" onClick={() => setShowFilters(false)}>
              <Text>确定 ({filteredEvents.length})</Text>
            </View>
          </View>
        </View>
      )}

      {/* 时间线 */}
      <ScrollView className="timeline" scrollY style={{ height: '100%' }}>
        {isLoading ? (
          <View className="loading-state">
            <Text className="text-gray-500">加载中...</Text>
          </View>
        ) : filteredEvents.length === 0 ? (
          <View className="empty-state">
            <Text className="empty-icon">📋</Text>
            <Text className="text-gray-500 mt-2">暂无病历记录</Text>
            <Text className="text-sm text-gray-400 mt-1">点击下方上传按钮添加病历</Text>
          </View>
        ) : (
          sortedDates.map((date) => (
            <View key={date} className="timeline-group">
              <View className="timeline-date">
                <Text className="timeline-date-text">{date}</Text>
              </View>
              {groupedEvents[date].map((event) => {
                const config = VISIT_TYPE_CONFIG[event.visitType];
                return (
                  <View
                    key={event.id}
                    className="timeline-item"
                    onClick={() => handleEventTap(event)}
                  >
                    <View className="timeline-dot" style={{ background: config.color }} />
                    <View className="timeline-content">
                      <View className="flex items-center justify-between">
                        <View className="flex items-center">
                          <Text className={`chip ${config.chipClass}`}>{config.label}</Text>
                          <Text className="text-base font-medium ml-1">{event.hospital}</Text>
                        </View>
                        {event.abnormalFlags?.length > 0 && (
                          <Text className="text-danger text-sm">⚠️ {event.abnormalFlags.length}项异常</Text>
                        )}
                      </View>
                      <Text className="text-sm text-gray-500 mt-1">{event.department}</Text>
                      {event.diagnosis.length > 0 && (
                        <View className="flex flex-wrap gap-2 mt-1">
                          {event.diagnosis.map((d, i) => (
                            <Text key={i} className="chip chip-gray">{d}</Text>
                          ))}
                        </View>
                      )}
                      {event.icd10Codes?.length > 0 && (
                        <Text className="text-xs text-gray-400 mt-1">
                          ICD-10: {event.icd10Codes.join(', ')}
                        </Text>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}
