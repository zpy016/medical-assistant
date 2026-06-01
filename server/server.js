/**
 * Medical Assistant - OCR Backend Proxy
 * 接收前端上传的图片，调用火山引擎 OCR API，返回识别结果
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { signVolcengineRequest } = require('./volcengineSign');

const app = express();

// CORS - 允许前端域名
app.use(cors({
  origin: function (origin, callback) {
    // 允许任何来源（因为是同一个域名下的 Nginx 反向代理）
    // 生产环境可限制为具体域名
    callback(null, true);
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: '10mb' }));

// 文件上传配置（内存存储，限制 20MB）
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

// ==================== 火山引擎 OCR 调用 ====================

async function callVolcengineOCR(imageBase64) {
  const ak = process.env.VOLC_AK;
  const sk = process.env.VOLC_SK;
  const region = process.env.VOLC_REGION || 'cn-north-1';

  if (!ak || !sk) {
    throw new Error('VOLC_AK or VOLC_SK not configured');
  }

  const requestBody = JSON.stringify({ image_base64: imageBase64 });

  const signHeaders = signVolcengineRequest({
    method: 'POST',
    uri: '/',
    query: { Action: 'OCRNormal', Version: '2021-08-23' },
    body: requestBody,
    headers: {
      'content-type': 'application/json',
      host: 'visual.volcengineapi.com',
    },
    ak,
    sk,
    region,
    service: 'visual',
  });

  const response = await fetch('https://visual.volcengineapi.com/?Action=OCRNormal&Version=2021-08-23', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Host': 'visual.volcengineapi.com',
      ...signHeaders,
    },
    body: requestBody,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Volcengine API error: ${response.status} ${text}`);
  }

  return response.json();
}

// 引入路由
const authRoutes = require('./routes/auth');
const syncRoutes = require('./routes/sync');
const aiRoutes = require('./routes/ai');

// ==================== API Routes ====================

/**
 * 健康检查
 */
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'medical-assistant-backend',
  });
});

/**
 * OCR 识别
 * POST /api/ocr
 * Body: multipart/form-data with 'image' field
 */
app.post('/api/ocr', upload.single('image'), async (req, res) => {
  const startTime = Date.now();

  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image provided' });
    }

    console.log(`[OCR] Processing: ${req.file.originalname}, size: ${req.file.size} bytes, type: ${req.file.mimetype}`);

    // 转 base64
    const imageBase64 = req.file.buffer.toString('base64');

    // 调用火山引擎 OCR
    const result = await callVolcengineOCR(imageBase64);

    const duration = Date.now() - startTime;
    const textCount = result.Result?.texts?.length || 0;

    console.log(`[OCR] Success in ${duration}ms, ${textCount} texts detected`);

    res.json(result);
  } catch (error) {
    console.error('[OCR] Error:', error.message);
    res.status(500).json({
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// 认证与同步路由
app.use('/api/auth', authRoutes);
app.use('/api/sync', syncRoutes);
app.use('/api/ai', aiRoutes);

// ==================== Error Handling ====================

app.use((err, req, res, next) => {
  console.error('[Server Error]', err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

// ==================== Start Server ====================

const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || '127.0.0.1';

app.listen(PORT, HOST, () => {
  console.log(`🚀 Medical Assistant backend running on http://${HOST}:${PORT}`);
  console.log(`📍 Health check: http://${HOST}:${PORT}/api/health`);
  console.log(`🔑 Volcengine OCR: ${process.env.VOLC_AK ? 'configured' : 'NOT CONFIGURED'}`);
  console.log(`🤖 Ark AI: ${process.env.ARK_ENDPOINT ? 'configured (' + process.env.ARK_ENDPOINT + ')' : 'NOT CONFIGURED'}`);
});
