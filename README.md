# 就医助手 - 个人健康档案 (Medical Assistant)

> Phase 1 网页版：病历 OCR 处理 + 智能分类

## 项目概述

就医助手是一款以个人病历数字化为入口的健康管理工具。本项目为 **Phase 1 网页版**，实现了 PRD 中定义的核心 P0 功能：

- ✅ 病历 OCR 拍照上传 + 用户确认（原图↔转录双向联动）
- ✅ 智能分类归档（文档类型自动识别）
- ✅ 多院区病历统一时间线
- ✅ 基础家人共享（患者管理）
- ✅ 本地数据存储 + JSON/CSV 导出

## 技术架构

### 跨平台设计原则

```
┌─────────────────────────────────────────────────────────┐
│                    业务逻辑层 (纯 TypeScript)              │
│  types/  utils/  services/ocrParser.ts                  │
│  └── 与UI完全解耦，可复用到小程序/App                      │
├─────────────────────────────────────────────────────────┤
│                    数据层 (Dexie/IndexedDB)               │
│  db/index.ts                                            │
│  └── 抽象存储接口，后续可替换为云端SQLite/Room等           │
├─────────────────────────────────────────────────────────┤
│                    状态层 (Zustand)                       │
│  stores/recordStore.ts                                  │
│  └── 轻量状态管理，小程序端可替换为MobX/Recoil             │
├─────────────────────────────────────────────────────────┤
│                    UI层 (React + Tailwind)                │
│  components/  pages/                                    │
│  └── 响应式设计，移动端优先，同时适配桌面端                 │
└─────────────────────────────────────────────────────────┘
```

### 技术栈

| 层级 | 技术选型 | 选型理由 |
|:-----|:---------|:---------|
| 框架 | React 19 + TypeScript | 生态成熟，类型安全，团队熟悉度高 |
| 构建 | Vite 6 | 极速开发体验，支持ESM |
| 样式 | Tailwind CSS v4 | 原子化CSS，响应式设计，打包体积小 |
| 状态 | Zustand | 轻量，无样板代码，TS支持好 |
| 存储 | Dexie.js (IndexedDB) | 浏览器本地数据库，容量大，支持查询 |
| 路由 | React Router v7 | 标准路由方案，小程序端需替换 |
| 日期 | date-fns | 模块化，tree-shaking友好 |
| 图标 | Lucide React | 轻量，一致性好 |

### 项目结构

```
medical-assistant-web/
├── src/
│   ├── types/              # 核心类型定义（跨平台复用）
│   │   └── index.ts
│   ├── db/                 # IndexedDB数据层（可替换实现）
│   │   └── index.ts
│   ├── stores/             # Zustand全局状态
│   │   └── recordStore.ts
│   ├── services/           # API服务层
│   │   ├── ocrService.ts   # OCR服务主入口
│   │   └── mockOCR.ts      # 模拟OCR（开发/演示）
│   ├── utils/              # 工具函数（跨平台复用）
│   │   ├── helpers.ts      # 通用工具
│   │   ├── ocrParser.ts    # OCR结果结构化解析
│   │   └── demoData.ts     # 演示数据初始化
│   ├── components/         # UI组件
│   │   ├── layout/         # 布局组件
│   │   └── ...
│   ├── pages/              # 页面组件
│   │   ├── TimelinePage.tsx      # 首页-时间线
│   │   ├── RecordsPage.tsx       # 病历夹
│   │   ├── UploadPage.tsx        # 上传
│   │   ├── OCRConfirmPage.tsx    # OCR确认（核心）
│   │   ├── RecordDetailPage.tsx  # 病历详情
│   │   └── ProfilePage.tsx       # 个人中心
│   ├── hooks/              # 自定义Hooks
│   ├── App.tsx             # 根组件
│   └── main.tsx            # 入口
├── index.html
├── vite.config.ts
└── package.json
```

## 核心功能详解

### 1. OCR 处理流程

```
用户上传图片
    │
    ▼
┌─────────────────┐
│  图片压缩        │ ← 限制最大1920px，JPEG质量85%
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  OCR识别         │ ← 火山引擎API / 模拟OCR
│  (8秒内完成)     │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────┐
│  结构化解析                   │
│  - 文档类型自动识别            │
│  - 关键字段提取（姓名/日期/医院等）│
│  - 检验项目异常标记            │
└────────┬────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│  🔍 用户确认界面               │
│  - 图文对照模式 / 字段编辑模式  │
│  - 点击字段 ↔ 原图高亮联动     │
│  - 字段可直接编辑修正          │
└────────┬────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│  智能分类归档                  │
│  - 按日期聚类（同一天=同一就诊）│
│  - 按医院/科室标记            │
│  - 生成就诊事件时间线          │
└─────────────────────────────┘
```

### 2. 数据模型

**核心实体关系：**

```
Patient (患者)
  └── MedicalRecord (医疗记录) × N
        ├── originalImage (原始图片)
        ├── ocrResult (OCR原始结果)
        ├── structuredData (结构化数据)
        └── documentType (文档类型)
  └── VisitEvent (就诊事件) × N
        └── 聚合同一天同医院的Records
```

**支持的文档类型：**
- `medical_record` - 门诊/住院病历
- `lab_report` - 检验报告（血常规、生化等）
- `imaging_report` - 影像报告（CT、MRI、X光）
- `prescription` - 处方笺
- `receipt` - 收费票据
- `discharge_summary` - 出院小结
- `pathology` - 病理报告
- `insurance` - 保险单据

## 火山引擎 OCR API 接入指引

### 为什么需要接入真实OCR？

当前项目使用 **模拟OCR** 进行功能演示，能正确处理示例病历图片并展示结构化结果。但模拟OCR的准确率有限，**生产环境必须接入真实OCR服务**。

### 接入方案对比

| 方案 | 安全性 | 复杂度 | 推荐度 | 适用场景 |
|:-----|:------:|:------:|:------:|:---------|
| **A. 后端代理** (推荐) | ⭐⭐⭐ 高 | ⭐⭐ 中 | ⭐⭐⭐⭐⭐ | 生产环境 |
| **B. 云函数代理** | ⭐⭐⭐ 高 | ⭐⭐ 中 | ⭐⭐⭐⭐ | 快速上线 |
| **C. 前端直连** | ⭐ 低 | ⭐ 低 | ⭐⭐ | 仅演示 |

### 方案A：后端代理（推荐生产环境）

**为什么推荐？** AccessKey Secret 不应暴露在前端代码中。通过后端代理可以：
- 保护 AK/SK 安全
- 添加请求缓存和限流
- 做OCR结果的后处理（LLM增强）
- 统一日志和监控

**Node.js 后端示例：**

```javascript
// server.js
const express = require('express');
const multer = require('multer');
const { VisualService } = require('@volcengine/volc-sdk');

const app = express();
const upload = multer();

// 初始化火山引擎视觉服务
const visualService = new VisualService();
visualService.setAk(process.env.VOLC_AK);      // 环境变量读取
visualService.setSk(process.env.VOLC_SK);

// OCR接口
app.post('/api/ocr', upload.single('image'), async (req, res) => {
  try {
    const imageBase64 = req.file.buffer.toString('base64');
    
    // 调用火山引擎OCR
    const result = await visualService.ocrPdf({
      image_base64: imageBase64,
      output_table: true,        // 输出表格结构
      output_char_info: true,    // 输出字符位置
    });
    
    res.json({
      textBlocks: result.TextDetections?.map(td => ({
        text: td.Text,
        confidence: td.Confidence,
        bbox: td.Polygon ? normalizeBBox(td.Polygon) : [0,0,1,1],
      })) ?? [],
      fullText: result.TextDetections?.map(td => td.Text).join('\n') ?? '',
      tables: result.Tables ?? [],
      confidence: calculateConfidence(result.TextDetections),
      processingTime: 0,
    });
  } catch (error) {
    console.error('OCR Error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(3001);
```

**前端配置：**

```typescript
// 设置后端代理地址
const ocrResult = await performOCR(file, {
  useBackend: true,
  backendUrl: 'https://your-api-domain.com',
});
```

### 方案B：云函数代理

使用 **火山引擎函数计算（FC）** 部署，无需维护服务器：

```python
# main.py (Python云函数)
import os
import base64
import json
from volcengine.visual.VisualService import VisualService

def handler(event, context):
    body = json.loads(event)
    image_base64 = body.get('image_base64')
    
    visual = VisualService()
    visual.set_ak(os.environ['VOLC_AK'])
    visual.set_sk(os.environ['VOLC_SK'])
    
    result = visual.ocr_pdf({
        'image_base64': image_base64,
        'output_table': True,
    })
    
    return {
        'statusCode': 200,
        'body': json.dumps(result)
    }
```

### 方案C：前端直连（仅演示）

```typescript
import { setOCRConfig } from './services/ocrService';

setOCRConfig({
  accessKeyId: 'your-ak-id',
  secretAccessKey: 'your-sk',  // ⚠️ 暴露在前端，仅用于演示
  region: 'cn-beijing',
  endpoint: 'https://visual.volcengineapi.com',
});
```

### 火山引擎控制台操作步骤

1. **开通服务**
   - 访问 https://console.volcengine.com
   - 搜索「视觉智能」→ 进入控制台
   - 开通「通用文字识别」和「表格识别」能力

2. **获取密钥**
   - 右上角头像 → 「密钥管理」
   - 点击「新建密钥」→ 获取 AccessKey ID 和 Secret Access Key
   - ⚠️ Secret Access Key 只显示一次，请妥善保存

3. **查看API文档**
   - 视觉智能 → 文字识别 → 通用文字识别
   - 文档地址：https://www.volcengine.com/docs/6790/117777

4. **计费说明**
   - 通用文字识别：约 ¥0.003~0.01/次（根据套餐）
   - 表格识别：约 ¥0.01~0.03/次
   - 新用户通常有免费额度

## 运行项目

```bash
# 安装依赖
npm install

# 开发模式
npm run dev

# 生产构建
npm run build

# 预览构建结果
npm run preview
```

开发服务器默认在 http://localhost:3000 启动。

## 后续扩展路线图

### Phase 2: 微信小程序

```
复用层（直接复用）：
  ✅ types/       - 类型定义
  ✅ utils/       - 工具函数 + OCR解析器
  ✅ services/    - OCR服务（适配小程序request）
  ✅ db/          - 数据层（适配微信Storage/本地数据库）

替换层（需重写）：
  ❌ UI层         - React → 微信小程序WXML/JS
  ❌ 路由         - React Router → 小程序页面路由
  ❌ 状态管理      - Zustand → MobX/自研Store
  ❌ 文件上传      - input file → wx.chooseMedia

架构建议：
  使用 Taro 3.x 或 UniApp 进行跨端开发，
  可将现有React代码最大程度复用。
```

### Phase 3: iOS/Android App

```
方案对比：

1. React Native (推荐)
   - 复用：业务逻辑（types/utils/services/db）
   - 重写：UI组件（React Native组件）
   - 优势：性能接近原生，热更新，团队学习成本低

2. Flutter
   - 复用：业务逻辑（需用Dart重写）
   - 重写：全部UI
   - 优势：性能最好，UI一致性最强

3. 原生开发
   - 复用：无（仅设计规范）
   - 重写：全部
   - 优势：极致性能，完全掌控

推荐：React Native + Expo
  - 快速迭代，一套代码出iOS/Android
  - 良好的OCR原生插件生态
  - 与现有React技术栈一致
```

## 数据安全与合规

- **本地优先**：所有病历数据默认仅存储在浏览器 IndexedDB 中
- **不出境**：使用火山引擎（国内云）确保数据不出境
- **随时导出**：支持 JSON/CSV 格式导出全部数据
- **随时删除**：一键清除所有本地数据
- **免责声明**：工具仅为病历整理辅助，不提供医疗诊断建议

## 常见问题

**Q: 为什么首次打开没有数据？**
A: 首次打开会自动初始化演示数据（基于示例病历图片）。如果浏览器禁用了localStorage/IndexedDB，数据将无法保存。

**Q: 支持批量上传吗？**
A: 支持。上传页面可选择多张图片，系统会依次处理。

**Q: OCR识别准确率低怎么办？**
A: 确认页面支持逐字段编辑修正。同时建议接入真实的火山引擎OCR服务。

**Q: 数据会同步到云端吗？**
A: Phase 1 不会。所有数据仅在本地浏览器中。后续版本将提供可选的云同步功能。

## 许可证

MIT License
