/**
 * AI 功能路由
 * 调用火山方舟 (Ark) API 提供智能医疗分析
 * 支持 API Key 和 AK/SK 签名两种认证方式
 */

const express = require('express');
const { signVolcengineRequest } = require('../volcengineSign');

const router = express.Router();

// ==================== 配置 ====================

const ARK_ENDPOINT = process.env.ARK_ENDPOINT;
const ARK_API_KEY = process.env.ARK_API_KEY;
const VOLC_AK = process.env.VOLC_AK;
const VOLC_SK = process.env.VOLC_SK;
const ARK_REGION = process.env.ARK_REGION || 'cn-beijing';
const ARK_HOST = `ark.${ARK_REGION}.volces.com`;
const ARK_URL = `https://${ARK_HOST}/api/v3/chat/completions`;

// 简单内存限流（生产环境建议用 Redis）
const rateLimit = new Map();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1分钟
const RATE_LIMIT_MAX = 30; // 每用户每分钟最多30次

function checkRateLimit(userId) {
  const now = Date.now();
  const user = rateLimit.get(userId);
  if (!user || now - user.resetTime > RATE_LIMIT_WINDOW) {
    rateLimit.set(userId, { count: 1, resetTime: now });
    return true;
  }
  if (user.count >= RATE_LIMIT_MAX) {
    return false;
  }
  user.count++;
  return true;
}

// ==================== 方舟 API 调用 ====================

/**
 * 调用方舟 Chat Completions API
 * @param {Array} messages - 消息列表
 * @param {Object} options - 额外参数
 */
async function callArkAPI(messages, options = {}) {
  if (!ARK_ENDPOINT) {
    throw new Error('ARK_ENDPOINT not configured');
  }

  const body = JSON.stringify({
    model: ARK_ENDPOINT,
    messages,
    temperature: options.temperature ?? 0.3,
    max_tokens: options.max_tokens ?? 4096,
    ...(options.response_format ? { response_format: options.response_format } : {}),
  });

  let headers = {
    'Content-Type': 'application/json',
    'Host': ARK_HOST,
  };

  // 优先使用 API Key 方式
  if (ARK_API_KEY) {
    headers['Authorization'] = `Bearer ${ARK_API_KEY}`;
  } else if (VOLC_AK && VOLC_SK) {
    // 使用 AK/SK Signature V4 签名
    const signHeaders = signVolcengineRequest({
      method: 'POST',
      uri: '/api/v3/chat/completions',
      query: {},
      body,
      headers: {
        'content-type': 'application/json',
        host: ARK_HOST,
      },
      ak: VOLC_AK,
      sk: VOLC_SK,
      region: ARK_REGION,
      service: 'ark',
    });
    headers = { ...headers, ...signHeaders };
  } else {
    throw new Error('No authentication configured for Ark API');
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000); // 60秒超时

  try {
    const response = await fetch(ARK_URL, {
      method: 'POST',
      headers,
      body,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(`Ark API error: ${response.status} ${text}`);
    }

    return await response.json();
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('Ark API request timeout (60s)');
    }
    throw error;
  }
}

/**
 * 从 AI 响应中提取文本内容
 */
function extractContent(response) {
  return response.choices?.[0]?.message?.content || '';
}

/**
 * 安全解析 JSON（AI 可能返回带 markdown 代码块的 JSON）
 */
function safeParseJSON(text) {
  // 移除 markdown 代码块标记
  const cleaned = text
    .replace(/^```json\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
  try {
    return JSON.parse(cleaned);
  } catch (e) {
    // 尝试提取 JSON 部分
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      return JSON.parse(match[0]);
    }
    throw new Error('Failed to parse AI response as JSON');
  }
}

// ==================== Prompt 模板 ====================

const SYSTEM_PROMPTS = {
  reportAnalysis: `你是一位资深临床检验医师，擅长解读各类医学检验报告。请根据患者提供的检验数据，给出专业、易懂的分析。

输出要求（严格 JSON 格式）：
{
  "overallAssessment": "整体评估结论（50字以内）",
  "abnormalItems": [
    {
      "name": "检验项目名称",
      "value": "当前数值",
      "reference": "参考范围",
      "interpretation": "通俗易懂的解读（为什么异常、可能意味着什么）",
      "severity": "严重程度：normal/mild/moderate/severe",
      "suggestion": "针对该指标的具体建议"
    }
  ],
  "healthAdvice": [
    "健康生活建议1",
    "健康生活建议2"
  ],
  "followUpSuggestions": [
    {
      "item": "建议复查的项目",
      "interval": "建议复查间隔（如：1周后、1个月后）",
      "reason": "复查原因"
    }
  ],
  "disclaimer": "免责声明：以上分析仅供参考，不能替代医生的专业诊断。如有不适，请及时就医。"
}`,

  visitPreparation: `你是一位资深全科医生，擅长帮助患者高效就诊。请根据患者的病历和症状，为其准备一份详尽的就诊清单。

输出要求（严格 JSON 格式）：
{
  "visitType": "建议就诊科室",
  "urgency": "紧急程度：low/medium/high/emergency",
  "documents": [
    {
      "name": "必带资料名称",
      "description": "为什么需要带这份资料",
      "priority": "优先级：must/should/optional"
    }
  ],
  "questions": [
    {
      "category": "问题分类（如：诊断/治疗/用药/预后）",
      "questions": ["具体要问医生的问题1", "问题2"]
    }
  ],
  "symptomsToDescribe": [
    "需要向医生详细描述的症状要点1",
    "症状要点2"
  ],
  "notes": [
    "就诊注意事项1",
    "注意事项2"
  ],
  "disclaimer": "免责声明：以上建议仅供参考，具体诊疗方案请以医生面诊为准。"
}`,

  caseSummary: `你是一位资深医生，擅长整理和总结患者病历。请根据患者的多条病历记录，生成一份清晰的时间线摘要。

输出要求（严格 JSON 格式）：
{
  "patientOverview": "患者整体情况概述（100字以内）",
  "timeline": [
    {
      "date": "日期",
      "type": "记录类型：门诊/住院/体检/检验/影像",
      "summary": "该次就诊/检查的简要总结",
      "keyFindings": ["关键发现1", "关键发现2"],
      "diagnoses": ["诊断1", "诊断2"],
      "treatments": ["治疗方案/用药1"]
    }
  ],
  "conditionTrend": "病情发展趋势描述（如：稳定/好转/需关注）",
  "activeDiagnoses": ["当前活跃诊断1", "诊断2"],
  "medications": [
    {
      "name": "药物名称",
      "dosage": "剂量",
      "purpose": "用药目的"
    }
  ],
  "recommendations": [
    "综合建议1",
    "建议2"
  ],
  "disclaimer": "免责声明：以上摘要由 AI 自动生成，仅供参考。具体诊疗请以医生判断为准。"
}`
};

// ==================== 路由 ====================

/**
 * AI 报告解读
 * POST /api/ai/report-analysis
 * Body: { patientInfo?, testItems: [{name, value, unit, reference, date?}], recordType? }
 */
router.post('/report-analysis', async (req, res) => {
  const startTime = Date.now();
  const userId = req.headers['x-user-id'] || 'anonymous';

  try {
    if (!checkRateLimit(userId)) {
      return res.status(429).json({ error: '请求过于频繁，请稍后再试' });
    }

    const { patientInfo, testItems, recordType } = req.body;

    if (!testItems || !Array.isArray(testItems) || testItems.length === 0) {
      return res.status(400).json({ error: '请提供检验项目数据' });
    }

    // 限制输入长度
    if (testItems.length > 100) {
      return res.status(400).json({ error: '检验项目数量超过限制（最多100项）' });
    }

    const testDataStr = testItems.map(item => {
      const ref = item.reference ? `（参考范围：${item.reference}）` : '';
      const unit = item.unit ? ` ${item.unit}` : '';
      return `- ${item.name}: ${item.value}${unit}${ref}`;
    }).join('\n');

    const userPrompt = `请分析以下${recordType || '医学检验'}报告：

${patientInfo ? `患者信息：${JSON.stringify(patientInfo)}\n` : ''}检验项目：
${testDataStr}

请按要求的 JSON 格式输出分析结果。`;

    const response = await callArkAPI([
      { role: 'system', content: SYSTEM_PROMPTS.reportAnalysis },
      { role: 'user', content: userPrompt }
    ], {
      temperature: 0.2,
      max_tokens: 4096,
    });

    const content = extractContent(response);
    const result = safeParseJSON(content);

    const duration = Date.now() - startTime;
    console.log(`[AI ReportAnalysis] Success in ${duration}ms, user=${userId}, items=${testItems.length}`);

    res.json({
      success: true,
      data: result,
      meta: {
        model: ARK_ENDPOINT,
        duration,
        timestamp: new Date().toISOString(),
      }
    });
  } catch (error) {
    console.error('[AI ReportAnalysis] Error:', error.message);
    res.status(500).json({
      error: error.message || 'AI 分析失败',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * AI 就诊准备清单
 * POST /api/ai/visit-prep
 * Body: { patientInfo?, medicalRecords: [...], currentSymptoms?, targetDepartment? }
 */
router.post('/visit-prep', async (req, res) => {
  const startTime = Date.now();
  const userId = req.headers['x-user-id'] || 'anonymous';

  try {
    if (!checkRateLimit(userId)) {
      return res.status(429).json({ error: '请求过于频繁，请稍后再试' });
    }

    const { patientInfo, medicalRecords, currentSymptoms, targetDepartment } = req.body;

    let userPrompt = '请为患者准备就诊清单。\n\n';

    if (patientInfo) {
      userPrompt += `患者信息：${JSON.stringify(patientInfo)}\n\n`;
    }

    if (medicalRecords && medicalRecords.length > 0) {
      const recordsStr = medicalRecords.map((r, i) => {
        return `[${i + 1}] ${r.date || '日期未知'} - ${r.type || '病历'}\n${r.content || r.summary || JSON.stringify(r)}`;
      }).join('\n\n');
      userPrompt += `历史病历：\n${recordsStr}\n\n`;
    }

    if (currentSymptoms) {
      userPrompt += `当前症状：${currentSymptoms}\n\n`;
    }

    if (targetDepartment) {
      userPrompt += `目标科室：${targetDepartment}\n\n`;
    }

    userPrompt += '请按要求的 JSON 格式输出生成就诊准备清单。';

    const response = await callArkAPI([
      { role: 'system', content: SYSTEM_PROMPTS.visitPreparation },
      { role: 'user', content: userPrompt }
    ], {
      temperature: 0.3,
      max_tokens: 4096,
    });

    const content = extractContent(response);
    const result = safeParseJSON(content);

    const duration = Date.now() - startTime;
    console.log(`[AI VisitPrep] Success in ${duration}ms, user=${userId}`);

    res.json({
      success: true,
      data: result,
      meta: {
        model: ARK_ENDPOINT,
        duration,
        timestamp: new Date().toISOString(),
      }
    });
  } catch (error) {
    console.error('[AI VisitPrep] Error:', error.message);
    res.status(500).json({
      error: error.message || 'AI 生成失败',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * AI 病例摘要
 * POST /api/ai/case-summary
 * Body: { patientInfo?, records: [{date, type, content, diagnoses?, medications?}] }
 */
router.post('/case-summary', async (req, res) => {
  const startTime = Date.now();
  const userId = req.headers['x-user-id'] || 'anonymous';

  try {
    if (!checkRateLimit(userId)) {
      return res.status(429).json({ error: '请求过于频繁，请稍后再试' });
    }

    const { patientInfo, records } = req.body;

    if (!records || !Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ error: '请提供病历记录' });
    }

    if (records.length > 50) {
      return res.status(400).json({ error: '病历记录数量超过限制（最多50条）' });
    }

    let userPrompt = '请为以下患者生成病历时间线摘要。\n\n';

    if (patientInfo) {
      userPrompt += `患者信息：${JSON.stringify(patientInfo)}\n\n`;
    }

    const recordsStr = records.map((r, i) => {
      const lines = [`[${i + 1}] 日期：${r.date || '未知'}`];
      if (r.type) lines.push(`类型：${r.type}`);
      if (r.hospital) lines.push(`医院：${r.hospital}`);
      if (r.department) lines.push(`科室：${r.department}`);
      if (r.diagnoses?.length) lines.push(`诊断：${r.diagnoses.join('、')}`);
      if (r.medications?.length) lines.push(`用药：${r.medications.join('、')}`);
      if (r.content || r.summary) lines.push(`内容：${r.content || r.summary}`);
      if (r.testItems?.length) {
        const tests = r.testItems.map(t => `${t.name}: ${t.value}${t.unit || ''}`).join('、');
        lines.push(`检验：${tests}`);
      }
      return lines.join('\n');
    }).join('\n\n---\n\n');

    userPrompt += `病历记录：\n\n${recordsStr}\n\n请按要求的 JSON 格式输出病例摘要。`;

    const response = await callArkAPI([
      { role: 'system', content: SYSTEM_PROMPTS.caseSummary },
      { role: 'user', content: userPrompt }
    ], {
      temperature: 0.2,
      max_tokens: 4096,
    });

    const content = extractContent(response);
    const result = safeParseJSON(content);

    const duration = Date.now() - startTime;
    console.log(`[AI CaseSummary] Success in ${duration}ms, user=${userId}, records=${records.length}`);

    res.json({
      success: true,
      data: result,
      meta: {
        model: ARK_ENDPOINT,
        duration,
        timestamp: new Date().toISOString(),
      }
    });
  } catch (error) {
    console.error('[AI CaseSummary] Error:', error.message);
    res.status(500).json({
      error: error.message || 'AI 生成失败',
      timestamp: new Date().toISOString(),
    });
  }
});

module.exports = router;
