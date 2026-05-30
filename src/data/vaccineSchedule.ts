/**
 * 国家免疫规划疫苗时间表（一类疫苗）
 * 数据来源：国家卫健委《国家免疫规划疫苗儿童免疫程序》
 */

export interface VaccineScheduleItem {
  id: string;
  name: string;
  nameEn?: string;
  preventableDiseases: string[];
  totalDoses: number;
  doses: {
    doseNumber: number;
    minAgeMonths: number;
    windowDesc: string;
    notes?: string;
  }[];
}

export const NATIONAL_VACCINE_SCHEDULE: VaccineScheduleItem[] = [
  {
    id: 'hep_b',
    name: '乙肝疫苗',
    nameEn: 'Hepatitis B',
    preventableDiseases: ['乙型病毒性肝炎'],
    totalDoses: 3,
    doses: [
      { doseNumber: 1, minAgeMonths: 0, windowDesc: '出生时', notes: '24小时内接种第1剂' },
      { doseNumber: 2, minAgeMonths: 1, windowDesc: '1月龄' },
      { doseNumber: 3, minAgeMonths: 6, windowDesc: '6月龄' },
    ],
  },
  {
    id: 'bcg',
    name: '卡介苗',
    nameEn: 'BCG',
    preventableDiseases: ['结核病'],
    totalDoses: 1,
    doses: [
      { doseNumber: 1, minAgeMonths: 0, windowDesc: '出生时' },
    ],
  },
  {
    id: 'polio',
    name: '脊灰疫苗',
    nameEn: 'Polio',
    preventableDiseases: ['脊髓灰质炎'],
    totalDoses: 4,
    doses: [
      { doseNumber: 1, minAgeMonths: 2, windowDesc: '2月龄', notes: 'IPV' },
      { doseNumber: 2, minAgeMonths: 3, windowDesc: '3月龄', notes: 'bOPV' },
      { doseNumber: 3, minAgeMonths: 4, windowDesc: '4月龄', notes: 'bOPV' },
      { doseNumber: 4, minAgeMonths: 48, windowDesc: '4周岁', notes: 'bOPV' },
    ],
  },
  {
    id: 'dtp',
    name: '百白破疫苗',
    nameEn: 'DTP',
    preventableDiseases: ['百日咳', '白喉', '破伤风'],
    totalDoses: 4,
    doses: [
      { doseNumber: 1, minAgeMonths: 3, windowDesc: '3月龄' },
      { doseNumber: 2, minAgeMonths: 4, windowDesc: '4月龄' },
      { doseNumber: 3, minAgeMonths: 5, windowDesc: '5月龄' },
      { doseNumber: 4, minAgeMonths: 18, windowDesc: '18月龄' },
    ],
  },
  {
    id: 'dt',
    name: '白破疫苗',
    nameEn: 'DT',
    preventableDiseases: ['白喉', '破伤风'],
    totalDoses: 1,
    doses: [
      { doseNumber: 1, minAgeMonths: 72, windowDesc: '6周岁' },
    ],
  },
  {
    id: 'mmr',
    name: '麻腮风疫苗',
    nameEn: 'MMR',
    preventableDiseases: ['麻疹', '腮腺炎', '风疹'],
    totalDoses: 2,
    doses: [
      { doseNumber: 1, minAgeMonths: 8, windowDesc: '8月龄' },
      { doseNumber: 2, minAgeMonths: 18, windowDesc: '18月龄' },
    ],
  },
  {
    id: 'jev',
    name: '乙脑减毒活疫苗',
    nameEn: 'JE-Live',
    preventableDiseases: ['流行性乙型脑炎'],
    totalDoses: 2,
    doses: [
      { doseNumber: 1, minAgeMonths: 8, windowDesc: '8月龄' },
      { doseNumber: 2, minAgeMonths: 24, windowDesc: '2周岁' },
    ],
  },
  {
    id: 'mena',
    name: 'A群流脑多糖疫苗',
    nameEn: 'MenA',
    preventableDiseases: ['A群流行性脑脊髓膜炎'],
    totalDoses: 2,
    doses: [
      { doseNumber: 1, minAgeMonths: 6, windowDesc: '6月龄' },
      { doseNumber: 2, minAgeMonths: 9, windowDesc: '9月龄' },
    ],
  },
  {
    id: 'menac',
    name: 'A+C群流脑多糖疫苗',
    nameEn: 'MenAC',
    preventableDiseases: ['A群、C群流行性脑脊髓膜炎'],
    totalDoses: 2,
    doses: [
      { doseNumber: 1, minAgeMonths: 36, windowDesc: '3周岁' },
      { doseNumber: 2, minAgeMonths: 72, windowDesc: '6周岁' },
    ],
  },
  {
    id: 'hepa',
    name: '甲肝减毒活疫苗',
    nameEn: 'HepA',
    preventableDiseases: ['甲型病毒性肝炎'],
    totalDoses: 1,
    doses: [
      { doseNumber: 1, minAgeMonths: 18, windowDesc: '18月龄' },
    ],
  },
];

// 二类疫苗（自费，可选）
export const OPTIONAL_VACCINE_SCHEDULE: VaccineScheduleItem[] = [
  {
    id: 'varicella',
    name: '水痘疫苗',
    preventableDiseases: ['水痘'],
    totalDoses: 2,
    doses: [
      { doseNumber: 1, minAgeMonths: 12, windowDesc: '12月龄' },
      { doseNumber: 2, minAgeMonths: 48, windowDesc: '4周岁' },
    ],
  },
  {
    id: 'influenza',
    name: '流感疫苗',
    preventableDiseases: ['流行性感冒'],
    totalDoses: 1,
    doses: [
      { doseNumber: 1, minAgeMonths: 6, windowDesc: '6月龄起每年接种' },
    ],
  },
  {
    id: 'ev71',
    name: '手足口疫苗(EV71)',
    preventableDiseases: ['肠道病毒71型感染'],
    totalDoses: 2,
    doses: [
      { doseNumber: 1, minAgeMonths: 6, windowDesc: '6月龄' },
      { doseNumber: 2, minAgeMonths: 7, windowDesc: '7月龄（间隔1个月）' },
    ],
  },
  {
    id: 'rotavirus',
    name: '轮状病毒疫苗',
    preventableDiseases: ['轮状病毒腹泻'],
    totalDoses: 3,
    doses: [
      { doseNumber: 1, minAgeMonths: 2, windowDesc: '2月龄' },
      { doseNumber: 2, minAgeMonths: 4, windowDesc: '4月龄' },
      { doseNumber: 3, minAgeMonths: 6, windowDesc: '6月龄' },
    ],
  },
  {
    id: 'pcv13',
    name: '肺炎球菌疫苗(PCV13)',
    preventableDiseases: ['肺炎球菌感染'],
    totalDoses: 4,
    doses: [
      { doseNumber: 1, minAgeMonths: 2, windowDesc: '2月龄' },
      { doseNumber: 2, minAgeMonths: 4, windowDesc: '4月龄' },
      { doseNumber: 3, minAgeMonths: 6, windowDesc: '6月龄' },
      { doseNumber: 4, minAgeMonths: 12, windowDesc: '12-15月龄' },
    ],
  },
];

/**
 * 根据出生日期和疫苗时间表生成接种计划
 */
export function generateVaccinationPlan(birthDate: string): {
  vaccineId: string;
  vaccineName: string;
  doseNumber: number;
  scheduledDate: string;
  windowDesc: string;
  category: 'national' | 'optional';
}[] {
  const birth = new Date(birthDate);
  const plan: ReturnType<typeof generateVaccinationPlan> = [];

  const allVaccines = [
    ...NATIONAL_VACCINE_SCHEDULE.map(v => ({ ...v, category: 'national' as const })),
    ...OPTIONAL_VACCINE_SCHEDULE.map(v => ({ ...v, category: 'optional' as const })),
  ];

  for (const vaccine of allVaccines) {
    for (const dose of vaccine.doses) {
      const scheduledDate = new Date(birth);
      scheduledDate.setMonth(birth.getMonth() + dose.minAgeMonths);
      plan.push({
        vaccineId: vaccine.id,
        vaccineName: vaccine.name,
        doseNumber: dose.doseNumber,
        scheduledDate: scheduledDate.toISOString().split('T')[0],
        windowDesc: dose.windowDesc,
        category: vaccine.category,
      });
    }
  }

  return plan.sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate));
}
