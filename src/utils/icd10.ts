/**
 * ============================================
 * ICD-10 编码映射表
 * 常见中文诊断名称 → ICD-10 编码
 * 覆盖：内科、外科、妇科、儿科、肿瘤、急诊等常见疾病
 * ============================================
 */

/** ICD-10 映射条目 */
export interface ICD10Entry {
  code: string;
  name: string;
  aliases: string[];
  category: string;
}

/** 常见诊断 → ICD-10 编码映射 */
export const ICD10_MAPPING: Record<string, ICD10Entry> = {
  // === 心血管系统 ===
  '高血压': { code: 'I10', name: '原发性高血压', aliases: ['高血压病', '原发性高血压', '血压高', '高血压I期', '高血压II期', '高血压III期'], category: '心血管' },
  '高血压危象': { code: 'I10', name: '高血压', aliases: ['高血压急症', '高血压危象'], category: '心血管' },
  '冠心病': { code: 'I25.1', name: '冠状动脉粥样硬化性心脏病', aliases: ['冠状动脉粥样硬化', '冠心病', '缺血性心脏病'], category: '心血管' },
  '心绞痛': { code: 'I20', name: '心绞痛', aliases: ['稳定性心绞痛', '不稳定性心绞痛', '劳力性心绞痛'], category: '心血管' },
  '心肌梗死': { code: 'I21', name: '急性心肌梗死', aliases: ['心梗', '急性心梗', '心肌梗死', '急性心肌梗死'], category: '心血管' },
  '心律失常': { code: 'I49', name: '心律失常', aliases: ['心律不齐', '早搏', '房颤', '心房颤动', '室性早搏', '房性早搏'], category: '心血管' },
  '心力衰竭': { code: 'I50', name: '心力衰竭', aliases: ['心衰', '慢性心衰', '急性心衰', '心功能不全'], category: '心血管' },
  '心肌炎': { code: 'I51.4', name: '心肌炎', aliases: ['病毒性心肌炎', '心肌炎'], category: '心血管' },
  '心包炎': { code: 'I30', name: '急性心包炎', aliases: ['心包炎'], category: '心血管' },
  '动脉粥样硬化': { code: 'I70', name: '动脉粥样硬化', aliases: ['动脉硬化', '动脉粥样硬化'], category: '心血管' },

  // === 内分泌代谢 ===
  '2型糖尿病': { code: 'E11', name: '2型糖尿病', aliases: ['II型糖尿病', '2型糖尿病', '非胰岛素依赖型糖尿病', '成人糖尿病'], category: '内分泌' },
  '1型糖尿病': { code: 'E10', name: '1型糖尿病', aliases: ['I型糖尿病', '胰岛素依赖型糖尿病'], category: '内分泌' },
  '妊娠期糖尿病': { code: 'O24', name: '妊娠期糖尿病', aliases: ['妊娠糖尿病', '妊娠期糖尿病'], category: '内分泌' },
  '糖尿病酮症酸中毒': { code: 'E10.1', name: '糖尿病酮症酸中毒', aliases: ['酮症酸中毒', 'DKA'], category: '内分泌' },
  '高脂血症': { code: 'E78', name: '高脂血症', aliases: ['高血脂', '血脂异常', '高胆固醇血症', '高甘油三酯血症'], category: '内分泌' },
  '甲状腺功能亢进': { code: 'E05', name: '甲状腺功能亢进症', aliases: ['甲亢', '甲状腺功能亢进', '甲状腺毒症'], category: '内分泌' },
  '甲状腺功能减退': { code: 'E03', name: '甲状腺功能减退症', aliases: ['甲减', '甲状腺功能减退', '桥本甲状腺炎'], category: '内分泌' },
  '甲状腺结节': { code: 'E04', name: '甲状腺结节', aliases: ['甲状腺肿', '甲状腺结节', '甲状腺腺瘤'], category: '内分泌' },
  '痛风': { code: 'M10', name: '痛风', aliases: ['痛风性关节炎', '痛风'], category: '内分泌' },
  '高尿酸血症': { code: 'E79.0', name: '高尿酸血症', aliases: ['尿酸高', '高尿酸'], category: '内分泌' },
  '肥胖症': { code: 'E66', name: '肥胖症', aliases: ['肥胖', '超重', '单纯性肥胖'], category: '内分泌' },
  '骨质疏松': { code: 'M81', name: '骨质疏松症', aliases: ['骨质疏松', '骨量减少'], category: '内分泌' },
  '低血糖': { code: 'E16.2', name: '低血糖', aliases: ['低血糖症', '低血糖反应'], category: '内分泌' },

  // === 呼吸系统 ===
  '上呼吸道感染': { code: 'J06', name: '急性上呼吸道感染', aliases: ['上感', '感冒', '急性上呼吸道感染', '上呼吸道感染', '病毒性感冒'], category: '呼吸' },
  '急性支气管炎': { code: 'J20', name: '急性支气管炎', aliases: ['支气管炎', '急性支气管炎'], category: '呼吸' },
  '慢性支气管炎': { code: 'J42', name: '慢性支气管炎', aliases: ['老慢支', '慢性支气管炎'], category: '呼吸' },
  '肺炎': { code: 'J18', name: '肺炎', aliases: ['社区获得性肺炎', '细菌性肺炎', '病毒性肺炎', '肺炎'], category: '呼吸' },
  '支气管哮喘': { code: 'J45', name: '支气管哮喘', aliases: ['哮喘', '支气管哮喘', '过敏性哮喘'], category: '呼吸' },
  '慢性阻塞性肺疾病': { code: 'J44', name: '慢性阻塞性肺疾病', aliases: ['慢阻肺', 'COPD', '肺气肿', '慢性阻塞性肺疾病'], category: '呼吸' },
  '肺结核': { code: 'A16', name: '肺结核', aliases: ['结核', '肺结核', '肺TB'], category: '呼吸' },
  '胸腔积液': { code: 'J90', name: '胸腔积液', aliases: ['胸水', '胸腔积液'], category: '呼吸' },
  '气胸': { code: 'J93', name: '气胸', aliases: ['自发性气胸', '气胸'], category: '呼吸' },
  '肺栓塞': { code: 'I26', name: '肺栓塞', aliases: ['肺血栓栓塞', '肺栓塞'], category: '呼吸' },
  '睡眠呼吸暂停': { code: 'G47.3', name: '睡眠呼吸暂停综合征', aliases: ['睡眠呼吸暂停', '鼾症', 'OSAHS'], category: '呼吸' },

  // === 消化系统 ===
  '急性胃肠炎': { code: 'K52', name: '急性胃肠炎', aliases: ['胃肠炎', '急性胃肠炎', '肠胃炎', '急性肠胃炎'], category: '消化' },
  '慢性胃炎': { code: 'K29', name: '慢性胃炎', aliases: ['胃炎', '慢性胃炎', '浅表性胃炎', '萎缩性胃炎', '糜烂性胃炎'], category: '消化' },
  '胃溃疡': { code: 'K25', name: '胃溃疡', aliases: ['消化性溃疡', '胃溃疡'], category: '消化' },
  '十二指肠溃疡': { code: 'K26', name: '十二指肠溃疡', aliases: ['十二指肠球部溃疡'], category: '消化' },
  '胃食管反流': { code: 'K21', name: '胃食管反流病', aliases: ['反流性食管炎', '胃食管反流', 'GERD'], category: '消化' },
  '功能性消化不良': { code: 'K30', name: '功能性消化不良', aliases: ['消化不良', '功能性消化不良'], category: '消化' },
  '肠易激综合征': { code: 'K58', name: '肠易激综合征', aliases: ['IBS', '肠易激综合征'], category: '消化' },
  '炎症性肠病': { code: 'K50', name: '克罗恩病', aliases: ['克罗恩病', '溃疡性结肠炎', '炎症性肠病'], category: '消化' },
  '便秘': { code: 'K59.0', name: '便秘', aliases: ['习惯性便秘', '功能性便秘'], category: '消化' },
  '腹泻': { code: 'K52.9', name: '腹泻', aliases: ['慢性腹泻', '功能性腹泻'], category: '消化' },
  '痔疮': { code: 'K64', name: '痔疮', aliases: ['内痔', '外痔', '混合痔', '痔疮'], category: '消化' },
  '肛裂': { code: 'K60.2', name: '肛裂', aliases: ['肛裂'], category: '消化' },
  '急性阑尾炎': { code: 'K35', name: '急性阑尾炎', aliases: ['阑尾炎', '急性阑尾炎'], category: '消化' },
  '胆囊炎': { code: 'K81', name: '急性胆囊炎', aliases: ['胆囊炎', '急性胆囊炎', '慢性胆囊炎'], category: '消化' },
  '胆结石': { code: 'K80', name: '胆石症', aliases: ['胆石症', '胆囊结石', '胆管结石', '胆结石'], category: '消化' },
  '急性胰腺炎': { code: 'K85', name: '急性胰腺炎', aliases: ['胰腺炎', '急性胰腺炎'], category: '消化' },
  '脂肪肝': { code: 'K76', name: '脂肪肝', aliases: ['非酒精性脂肪肝', '酒精性脂肪肝', '脂肪肝'], category: '消化' },
  '肝硬化': { code: 'K74', name: '肝硬化', aliases: ['肝硬化', '肝纤维化'], category: '消化' },
  '病毒性肝炎': { code: 'B18', name: '慢性病毒性肝炎', aliases: ['乙肝', '慢性乙肝', '丙肝', '病毒性肝炎', '乙型肝炎', '慢性肝炎'], category: '消化' },
  '肝功能异常': { code: 'R94.5', name: '肝功能异常', aliases: ['肝功异常', '转氨酶升高', '肝功能损害'], category: '消化' },
  '腹水': { code: 'R18', name: '腹水', aliases: ['腹腔积液', '腹水'], category: '消化' },
  '消化道出血': { code: 'K92.2', name: '消化道出血', aliases: ['上消化道出血', '下消化道出血', '胃肠出血'], category: '消化' },
  '便血': { code: 'K92.1', name: '便血', aliases: ['黑便', '血便', '便血'], category: '消化' },

  // === 泌尿系统 ===
  '尿路感染': { code: 'N39.0', name: '尿路感染', aliases: ['泌尿系感染', '尿路感染', '膀胱炎', '尿道炎'], category: '泌尿' },
  '肾盂肾炎': { code: 'N10', name: '急性肾盂肾炎', aliases: ['肾盂肾炎', '急性肾盂肾炎'], category: '泌尿' },
  '肾结石': { code: 'N20', name: '肾结石', aliases: ['泌尿系结石', '肾绞痛', '输尿管结石', '肾结石'], category: '泌尿' },
  '慢性肾病': { code: 'N18', name: '慢性肾脏病', aliases: ['慢性肾病', 'CKD', '肾功能不全', '肾衰竭', '尿毒症'], category: '泌尿' },
  '急性肾损伤': { code: 'N17', name: '急性肾损伤', aliases: ['急性肾衰', '急性肾损伤'], category: '泌尿' },
  '前列腺增生': { code: 'N40', name: '前列腺增生', aliases: ['良性前列腺增生', '前列腺肥大', 'BPH'], category: '泌尿' },
  '前列腺炎': { code: 'N41', name: '前列腺炎', aliases: ['慢性前列腺炎', '急性前列腺炎'], category: '泌尿' },
  '蛋白尿': { code: 'R80', name: '蛋白尿', aliases: ['蛋白尿', '微量白蛋白尿'], category: '泌尿' },
  '血尿': { code: 'R31', name: '血尿', aliases: ['血尿', '镜下血尿'], category: '泌尿' },

  // === 神经系统 ===
  '脑卒中': { code: 'I64', name: '脑卒中', aliases: ['中风', '脑梗死', '脑出血', '脑血栓', '脑血管意外', '脑卒中'], category: '神经' },
  '脑梗死': { code: 'I63', name: '脑梗死', aliases: ['缺血性脑卒中', '脑血栓形成', '脑栓塞'], category: '神经' },
  '脑出血': { code: 'I61', name: '脑出血', aliases: ['出血性脑卒中', '脑溢血'], category: '神经' },
  '短暂性脑缺血发作': { code: 'G45', name: '短暂性脑缺血发作', aliases: ['TIA', '短暂性脑缺血'], category: '神经' },
  '偏头痛': { code: 'G43', name: '偏头痛', aliases: ['偏头疼', '血管性头痛', '偏头痛'], category: '神经' },
  '紧张性头痛': { code: 'G44.2', name: '紧张性头痛', aliases: ['神经性头痛', '紧张性头痛'], category: '神经' },
  '癫痫': { code: 'G40', name: '癫痫', aliases: ['癫痫发作', '羊角风', '癫痫'], category: '神经' },
  '帕金森病': { code: 'G20', name: '帕金森病', aliases: ['帕金森', '帕金森综合征'], category: '神经' },
  '阿尔茨海默病': { code: 'G30', name: '阿尔茨海默病', aliases: ['老年痴呆', '阿尔茨海默', 'AD'], category: '神经' },
  '周围神经病变': { code: 'G62', name: '周围神经病', aliases: ['末梢神经炎', '周围神经病变', '糖尿病周围神经病变'], category: '神经' },
  '面神经麻痹': { code: 'G51.0', name: '贝尔面瘫', aliases: ['面瘫', '面神经炎', '面神经麻痹'], category: '神经' },
  '三叉神经痛': { code: 'G50.0', name: '三叉神经痛', aliases: ['三叉神经痛'], category: '神经' },
  '颈椎病': { code: 'M47', name: '颈椎病', aliases: ['颈椎退行性变', '颈椎病', '颈椎间盘突出'], category: '神经' },
  '腰椎间盘突出': { code: 'M51', name: '腰椎间盘突出', aliases: ['腰椎间盘脱出', '腰椎间盘突出症', '腰肌劳损'], category: '神经' },
  '坐骨神经痛': { code: 'M54.3', name: '坐骨神经痛', aliases: ['坐骨神经疼'], category: '神经' },
  '失眠': { code: 'G47.0', name: '失眠症', aliases: ['失眠', '睡眠障碍', '入睡困难'], category: '神经' },
  '眩晕': { code: 'R42', name: '眩晕', aliases: ['头晕', '眩晕', '头昏'], category: '神经' },

  // === 精神心理 ===
  '抑郁症': { code: 'F32', name: '抑郁发作', aliases: ['抑郁', '抑郁症', '抑郁状态', '抑郁障碍'], category: '精神' },
  '焦虑症': { code: 'F41', name: '焦虑障碍', aliases: ['焦虑', '焦虑症', '广泛性焦虑', '焦虑状态'], category: '精神' },
  '双相情感障碍': { code: 'F31', name: '双相情感障碍', aliases: ['双相障碍', '躁郁症'], category: '精神' },
  '精神分裂症': { code: 'F20', name: '精神分裂症', aliases: ['精神分裂'], category: '精神' },
  '神经衰弱': { code: 'F48.0', name: '神经衰弱', aliases: ['神经官能症', '植物神经功能紊乱'], category: '精神' },
  '惊恐障碍': { code: 'F41.0', name: '惊恐障碍', aliases: ['惊恐发作', '急性焦虑'], category: '精神' },

  // === 血液系统 ===
  '贫血': { code: 'D64', name: '贫血', aliases: ['缺铁性贫血', '巨幼细胞性贫血', '再生障碍性贫血', '贫血'], category: '血液' },
  '缺铁性贫血': { code: 'D50', name: '缺铁性贫血', aliases: ['缺铁', '小细胞低色素性贫血'], category: '血液' },
  '血小板减少': { code: 'D69.6', name: '血小板减少', aliases: ['ITP', '免疫性血小板减少', '血小板减少性紫癜'], category: '血液' },
  '白细胞减少': { code: 'D72.8', name: '白细胞减少', aliases: ['粒细胞减少', '白细胞减少症'], category: '血液' },
  '白血病': { code: 'C91', name: '白血病', aliases: ['急性白血病', '慢性白血病', '急性髓系白血病', '急性淋巴细胞白血病'], category: '血液' },
  '淋巴瘤': { code: 'C81', name: '淋巴瘤', aliases: ['霍奇金淋巴瘤', '非霍奇金淋巴瘤'], category: '血液' },
  '多发性骨髓瘤': { code: 'C90', name: '多发性骨髓瘤', aliases: ['骨髓瘤'], category: '血液' },

  // === 风湿免疫 ===
  '类风湿关节炎': { code: 'M05', name: '类风湿关节炎', aliases: ['类风湿', '类风湿性关节炎', 'RA'], category: '风湿' },
  '系统性红斑狼疮': { code: 'M32', name: '系统性红斑狼疮', aliases: ['红斑狼疮', 'SLE'], category: '风湿' },
  '强直性脊柱炎': { code: 'M45', name: '强直性脊柱炎', aliases: ['强直', 'AS'], category: '风湿' },
  '干燥综合征': { code: 'M35.0', name: '干燥综合征', aliases: ['干燥症'], category: '风湿' },
  '骨关节炎': { code: 'M15', name: '骨关节炎', aliases: ['退行性关节炎', '骨质增生', '骨关节炎', '骨关节病'], category: '风湿' },
  '滑膜炎': { code: 'M70', name: '滑膜炎', aliases: ['关节滑膜炎'], category: '风湿' },

  // === 皮肤 ===
  '湿疹': { code: 'L20', name: '特应性皮炎', aliases: ['湿疹', '特应性皮炎', '过敏性皮炎'], category: '皮肤' },
  '荨麻疹': { code: 'L50', name: '荨麻疹', aliases: ['风疹块', '过敏性荨麻疹', '慢性荨麻疹'], category: '皮肤' },
  '银屑病': { code: 'L40', name: '银屑病', aliases: ['牛皮癣'], category: '皮肤' },
  '带状疱疹': { code: 'B02', name: '带状疱疹', aliases: ['缠腰龙', '蛇盘疮', '带状疱疹'], category: '皮肤' },
  '真菌感染': { code: 'B35', name: '皮肤真菌感染', aliases: ['足癣', '手癣', '体癣', '股癣', '甲癣'], category: '皮肤' },
  '痤疮': { code: 'L70', name: '痤疮', aliases: ['青春痘', '粉刺', '痘痘'], category: '皮肤' },
  '白癜风': { code: 'L80', name: '白癜风', aliases: ['白斑病'], category: '皮肤' },
  '接触性皮炎': { code: 'L25', name: '接触性皮炎', aliases: ['过敏性皮炎', '刺激性皮炎'], category: '皮肤' },

  // === 眼科 ===
  '白内障': { code: 'H25', name: '老年性白内障', aliases: ['白内障', '年龄相关性白内障'], category: '眼科' },
  '青光眼': { code: 'H40', name: '青光眼', aliases: ['开角型青光眼', '闭角型青光眼'], category: '眼科' },
  '结膜炎': { code: 'H10', name: '结膜炎', aliases: ['红眼病', '急性结膜炎', '过敏性结膜炎'], category: '眼科' },
  '干眼症': { code: 'H04.1', name: '干眼综合征', aliases: ['干眼', '干眼症'], category: '眼科' },
  '视网膜病变': { code: 'H35', name: '视网膜病变', aliases: ['糖尿病视网膜病变', '黄斑变性', '视网膜脱离'], category: '眼科' },
  '近视': { code: 'H52.1', name: '近视', aliases: ['近视眼', '高度近视'], category: '眼科' },
  '老花眼': { code: 'H52.4', name: '老视', aliases: ['老花', '老视'], category: '眼科' },

  // === 耳鼻喉 ===
  '鼻炎': { code: 'J30', name: '过敏性鼻炎', aliases: ['过敏性鼻炎', '慢性鼻炎', '鼻窦炎', '肥厚性鼻炎'], category: '耳鼻喉' },
  '咽炎': { code: 'J02', name: '急性咽炎', aliases: ['慢性咽炎', '急性咽炎', '咽喉炎'], category: '耳鼻喉' },
  '扁桃体炎': { code: 'J03', name: '急性扁桃体炎', aliases: ['扁桃体炎', '扁桃体肿大'], category: '耳鼻喉' },
  '中耳炎': { code: 'H65', name: '中耳炎', aliases: ['急性中耳炎', '分泌性中耳炎'], category: '耳鼻喉' },
  '耳聋': { code: 'H91', name: '感音神经性耳聋', aliases: ['听力下降', '神经性耳聋'], category: '耳鼻喉' },
  '声带息肉': { code: 'J38.1', name: '声带息肉', aliases: ['声带小结', '声带息肉'], category: '耳鼻喉' },

  // === 口腔 ===
  '牙周炎': { code: 'K05', name: '牙周炎', aliases: ['牙龈炎', '牙周病', '牙龈出血'], category: '口腔' },
  '龋齿': { code: 'K02', name: '龋齿', aliases: ['蛀牙', '虫牙'], category: '口腔' },
  '口腔溃疡': { code: 'K12', name: '复发性口腔溃疡', aliases: ['口疮', '口腔溃疡'], category: '口腔' },
  '智齿冠周炎': { code: 'K05.2', name: '智齿冠周炎', aliases: ['智齿发炎'], category: '口腔' },

  // === 妇科 ===
  '宫颈炎': { code: 'N72', name: '宫颈炎', aliases: ['慢性宫颈炎', '宫颈糜烂', '宫颈炎症'], category: '妇科' },
  '阴道炎': { code: 'N76', name: '阴道炎', aliases: ['细菌性阴道炎', '霉菌性阴道炎', '滴虫性阴道炎'], category: '妇科' },
  '盆腔炎': { code: 'N73', name: '盆腔炎', aliases: ['慢性盆腔炎', '急性盆腔炎'], category: '妇科' },
  '子宫肌瘤': { code: 'N85', name: '子宫肌瘤', aliases: ['子宫平滑肌瘤'], category: '妇科' },
  '卵巢囊肿': { code: 'N83', name: '卵巢囊肿', aliases: ['卵巢囊性肿物'], category: '妇科' },
  '乳腺增生': { code: 'N60', name: '乳腺增生', aliases: ['乳腺小叶增生', '乳腺囊性增生'], category: '妇科' },
  '乳腺炎': { code: 'N61', name: '乳腺炎', aliases: ['急性乳腺炎'], category: '妇科' },
  '子宫内膜异位症': { code: 'N80', name: '子宫内膜异位症', aliases: ['子宫腺肌症', '巧克力囊肿'], category: '妇科' },
  '多囊卵巢综合征': { code: 'E28.2', name: '多囊卵巢综合征', aliases: ['PCOS', '多囊卵巢'], category: '妇科' },
  '月经失调': { code: 'N92', name: '月经失调', aliases: ['月经不调', '功能性子宫出血', '闭经', '痛经'], category: '妇科' },
  '更年期综合征': { code: 'N95', name: '更年期综合征', aliases: ['围绝经期综合征', '绝经综合征'], category: '妇科' },
  '妊娠高血压': { code: 'O13', name: '妊娠期高血压', aliases: ['子痫前期', '妊娠高血压综合征'], category: '妇科' },
  '产后出血': { code: 'O72', name: '产后出血', aliases: ['产后大出血'], category: '妇科' },
  '宫外孕': { code: 'O00', name: '异位妊娠', aliases: ['异位妊娠', '输卵管妊娠'], category: '妇科' },
  '流产': { code: 'O03', name: '自然流产', aliases: ['先兆流产', '难免流产', '习惯性流产'], category: '妇科' },
  '前置胎盘': { code: 'O44', name: '前置胎盘', aliases: ['完全性前置胎盘', '部分性前置胎盘'], category: '妇科' },

  // === 儿科 ===
  '小儿感冒': { code: 'J00', name: '急性鼻炎', aliases: ['小儿上呼吸道感染', '小儿感冒', '婴幼儿感冒'], category: '儿科' },
  '小儿肺炎': { code: 'J18', name: '小儿肺炎', aliases: ['婴幼儿肺炎', '支气管肺炎'], category: '儿科' },
  '小儿腹泻': { code: 'K52', name: '小儿腹泻', aliases: ['婴幼儿腹泻', '轮状病毒肠炎', '秋季腹泻'], category: '儿科' },
  '手足口病': { code: 'B08.4', name: '手足口病', aliases: ['手足口'], category: '儿科' },
  '水痘': { code: 'B01', name: '水痘', aliases: ['带状疱疹病毒感染'], category: '儿科' },
  '麻疹': { code: 'B05', name: '麻疹', aliases: ['小儿麻疹'], category: '儿科' },
  '流行性腮腺炎': { code: 'B26', name: '流行性腮腺炎', aliases: ['腮腺炎', '痄腮'], category: '儿科' },
  '幼儿急疹': { code: 'B09', name: '幼儿急疹', aliases: ['婴儿玫瑰疹', '第六病'], category: '儿科' },
  '小儿发热': { code: 'R50', name: '发热', aliases: ['小儿发烧', '婴幼儿发热'], category: '儿科' },
  '新生儿黄疸': { code: 'P59', name: '新生儿黄疸', aliases: ['生理性黄疸', '病理性黄疸', '母乳性黄疸'], category: '儿科' },
  '热性惊厥': { code: 'R56.0', name: '热性惊厥', aliases: ['高热惊厥', '小儿惊厥'], category: '儿科' },
  '小儿贫血': { code: 'D64', name: '小儿贫血', aliases: ['婴幼儿贫血'], category: '儿科' },
  '佝偻病': { code: 'E55', name: '维生素D缺乏性佝偻病', aliases: ['小儿佝偻病', '维生素D缺乏'], category: '儿科' },
  '小儿遗尿': { code: 'F98.0', name: '遗尿症', aliases: ['小儿夜尿', '尿床'], category: '儿科' },

  // === 骨科 ===
  '骨折': { code: 'S42', name: '骨折', aliases: ['肋骨骨折', '四肢骨折', '骨盆骨折', '压缩性骨折', '病理性骨折'], category: '骨科' },
  '关节脱位': { code: 'S43', name: '关节脱位', aliases: ['肩关节脱位', '肘关节脱位'], category: '骨科' },
  '半月板损伤': { code: 'S83.2', name: '半月板损伤', aliases: ['半月板撕裂', '膝关节半月板损伤'], category: '骨科' },
  '交叉韧带损伤': { code: 'S83.5', name: '交叉韧带损伤', aliases: ['ACL损伤', '前交叉韧带断裂'], category: '骨科' },
  '肩袖损伤': { code: 'M75', name: '肩袖损伤', aliases: ['肩袖撕裂', '肩峰撞击综合征'], category: '骨科' },
  '腱鞘炎': { code: 'M65', name: '腱鞘炎', aliases: ['桡骨茎突腱鞘炎', '扳机指', '弹响指'], category: '骨科' },
  '滑囊炎': { code: 'M71', name: '滑囊炎', aliases: ['滑膜炎', '关节滑膜炎'], category: '骨科' },
  '跟腱炎': { code: 'M76.6', name: '跟腱炎', aliases: ['跟腱病', '跟腱断裂'], category: '骨科' },
  '足底筋膜炎': { code: 'M72.2', name: '足底筋膜炎', aliases: ['足底筋膜病', '跟骨骨刺'], category: '骨科' },
  '股骨头坏死': { code: 'M87', name: '股骨头坏死', aliases: ['股骨头缺血性坏死'], category: '骨科' },
  '骨质疏松性骨折': { code: 'M80', name: '骨质疏松伴病理性骨折', aliases: ['脆性骨折'], category: '骨科' },

  // === 肿瘤（常见） ===
  '乳腺癌': { code: 'C50', name: '乳腺癌', aliases: ['乳腺恶性肿瘤', '乳腺导管癌', '乳腺小叶癌'], category: '肿瘤' },
  '肺癌': { code: 'C34', name: '肺癌', aliases: ['支气管肺癌', '肺腺癌', '肺鳞癌', '小细胞肺癌'], category: '肿瘤' },
  '胃癌': { code: 'C16', name: '胃癌', aliases: ['胃腺癌', '胃恶性肿瘤'], category: '肿瘤' },
  '结肠癌': { code: 'C18', name: '结肠癌', aliases: ['结肠恶性肿瘤', '大肠癌'], category: '肿瘤' },
  '直肠癌': { code: 'C20', name: '直肠癌', aliases: ['直肠恶性肿瘤', '结直肠癌'], category: '肿瘤' },
  '肝癌': { code: 'C22', name: '肝癌', aliases: ['肝细胞癌', '肝恶性肿瘤', '原发性肝癌'], category: '肿瘤' },
  '食管癌': { code: 'C15', name: '食管癌', aliases: ['食道恶性肿瘤', '食管鳞癌'], category: '肿瘤' },
  '胰腺癌': { code: 'C25', name: '胰腺癌', aliases: ['胰腺恶性肿瘤', '胰头癌'], category: '肿瘤' },
  '前列腺癌': { code: 'C61', name: '前列腺癌', aliases: ['前列腺恶性肿瘤'], category: '肿瘤' },
  '膀胱癌': { code: 'C67', name: '膀胱癌', aliases: ['膀胱恶性肿瘤', '膀胱移行细胞癌'], category: '肿瘤' },
  '肾癌': { code: 'C64', name: '肾癌', aliases: ['肾细胞癌', '肾透明细胞癌', '肾恶性肿瘤'], category: '肿瘤' },
  '甲状腺癌': { code: 'C73', name: '甲状腺癌', aliases: ['甲状腺乳头状癌', '甲状腺滤泡癌', '甲状腺髓样癌'], category: '肿瘤' },
  '宫颈癌': { code: 'C53', name: '宫颈癌', aliases: ['宫颈鳞癌', '宫颈腺癌', '宫颈恶性肿瘤'], category: '肿瘤' },
  '卵巢癌': { code: 'C56', name: '卵巢癌', aliases: ['卵巢恶性肿瘤', '卵巢上皮癌'], category: '肿瘤' },
  '子宫内膜癌': { code: 'C54', name: '子宫内膜癌', aliases: ['子宫体癌', '子宫内膜样癌'], category: '肿瘤' },
  '脑肿瘤': { code: 'C71', name: '脑恶性肿瘤', aliases: ['胶质瘤', '脑膜瘤', '垂体瘤', '听神经瘤'], category: '肿瘤' },
  '弥漫大B细胞淋巴瘤': { code: 'C83.3', name: '弥漫大B细胞淋巴瘤', aliases: ['DLBCL', '弥漫大B淋巴瘤'], category: '肿瘤' },
  '黑色素瘤': { code: 'C43', name: '黑色素瘤', aliases: ['恶性黑色素瘤', '皮肤黑色素瘤'], category: '肿瘤' },
  '鼻咽癌': { code: 'C11', name: '鼻咽癌', aliases: ['鼻咽恶性肿瘤'], category: '肿瘤' },
  '喉癌': { code: 'C32', name: '喉癌', aliases: ['喉恶性肿瘤', '声带癌'], category: '肿瘤' },
  '骨肉瘤': { code: 'C40', name: '骨肉瘤', aliases: ['成骨肉瘤', '骨恶性肿瘤'], category: '肿瘤' },

  // === 急诊/外伤 ===
  '创伤': { code: 'T14', name: '创伤', aliases: ['外伤', '多发伤', '复合伤', '软组织损伤'], category: '急诊' },
  '烧伤': { code: 'T20', name: '烧伤', aliases: ['烫伤', '热烧伤', '化学烧伤'], category: '急诊' },
  '冻伤': { code: 'T33', name: '冻伤', aliases: ['冻疮', '冻僵'], category: '急诊' },
  '电击伤': { code: 'T75.4', name: '电击伤', aliases: ['触电', '雷击伤'], category: '急诊' },
  '溺水': { code: 'T75.1', name: '溺水', aliases: ['淹溺'], category: '急诊' },
  '中暑': { code: 'T67', name: '中暑', aliases: ['热射病', '热衰竭', '日射病'], category: '急诊' },
  '一氧化碳中毒': { code: 'T58', name: '一氧化碳中毒', aliases: ['煤气中毒', 'CO中毒'], category: '急诊' },
  '药物中毒': { code: 'T36', name: '药物中毒', aliases: ['药物过量', '服药中毒'], category: '急诊' },
  '食物过敏': { code: 'T78.0', name: '食物过敏', aliases: ['过敏性休克', '严重过敏反应', 'anaphylaxis'], category: '急诊' },
  '蜂蜇伤': { code: 'T63.4', name: '蜂蜇伤', aliases: ['蜂毒过敏', '蜂蛰伤'], category: '急诊' },
  '蛇咬伤': { code: 'T63.0', name: '蛇咬伤', aliases: ['毒蛇咬伤'], category: '急诊' },
  '破伤风': { code: 'A35', name: '破伤风', aliases: ['破伤风感染'], category: '急诊' },
  '狂犬病': { code: 'A82', name: '狂犬病', aliases: ['恐水症'], category: '急诊' },

  // === 传染病 ===
  '流感': { code: 'J11', name: '流行性感冒', aliases: ['流行性感冒', '甲流', '乙流', '季节性流感', 'H1N1'], category: '传染' },
  '新型冠状病毒肺炎': { code: 'U07.1', name: 'COVID-19', aliases: ['新冠', '新冠肺炎', 'COVID-19', '新型冠状病毒感染'], category: '传染' },
  '甲型肝炎': { code: 'B15', name: '甲型肝炎', aliases: ['甲肝', '急性甲型肝炎'], category: '传染' },
  '乙型肝炎': { code: 'B16', name: '急性乙型肝炎', aliases: ['乙肝', '慢性乙型肝炎', 'HBV感染', '乙肝病毒携带'], category: '传染' },
  '丙型肝炎': { code: 'B17', name: '丙型肝炎', aliases: ['丙肝', 'HCV感染'], category: '传染' },
  '梅毒': { code: 'A51', name: '梅毒', aliases: ['早期梅毒', '晚期梅毒', '隐性梅毒'], category: '传染' },
  '艾滋病': { code: 'B20', name: '艾滋病', aliases: ['AIDS', 'HIV感染', '获得性免疫缺陷综合征', 'HIV阳性'], category: '传染' },
  '结核病': { code: 'A16', name: '肺结核', aliases: ['肺结核', '结核性胸膜炎', '淋巴结核', '骨结核', '肠结核'], category: '传染' },
  '病毒性脑炎': { code: 'A86', name: '病毒性脑炎', aliases: ['流行性乙型脑炎', '病毒性脑膜炎'], category: '传染' },
  '登革热': { code: 'A90', name: '登革热', aliases: ['登革出血热'], category: '传染' },
  '疟疾': { code: 'B50', name: '疟疾', aliases: ['恶性疟', '间日疟'], category: '传染' },
  '伤寒': { code: 'A01', name: '伤寒', aliases: ['副伤寒', '肠热症'], category: '传染' },
  '细菌性痢疾': { code: 'A03', name: '细菌性痢疾', aliases: ['菌痢', '志贺菌痢疾'], category: '传染' },
  '阿米巴痢疾': { code: 'A06', name: '阿米巴痢疾', aliases: ['阿米巴肠病'], category: '传染' },
  '霍乱': { code: 'A00', name: '霍乱', aliases: ['古典霍乱', '埃尔托霍乱'], category: '传染' },

  // === 其他常见 ===
  '发热待查': { code: 'R50', name: '发热', aliases: ['不明原因发热', '发热原因待查', 'FUO'], category: '其他' },
  '疼痛': { code: 'R52', name: '疼痛', aliases: ['慢性疼痛', '急性疼痛', '癌性疼痛'], category: '其他' },
  '乏力': { code: 'R53', name: '乏力', aliases: ['虚弱', '疲劳', '倦怠', '全身乏力'], category: '其他' },
  '消瘦': { code: 'R63.4', name: '体重减轻', aliases: ['体重下降', '消瘦', '营养不良'], category: '其他' },
  '水肿': { code: 'R60', name: '水肿', aliases: ['浮肿', '下肢水肿', '眼睑水肿'], category: '其他' },
  '淋巴结肿大': { code: 'R59', name: '淋巴结肿大', aliases: ['颈部淋巴结肿大', '腋窝淋巴结肿大'], category: '其他' },
  '乳房肿块': { code: 'N63', name: '乳房肿块', aliases: ['乳腺结节', '乳房肿物', '乳腺包块'], category: '其他' },
  '甲状腺肿大': { code: 'E04', name: '甲状腺肿大', aliases: ['甲状腺肿', '地方性甲状腺肿', '弥漫性甲状腺肿'], category: '其他' },
  '腹股沟疝': { code: 'K40', name: '腹股沟疝', aliases: ['疝气', '斜疝', '直疝'], category: '其他' },
  '下肢静脉曲张': { code: 'I83', name: '下肢静脉曲张', aliases: ['静脉曲张', '蚯蚓腿'], category: '其他' },
  '深静脉血栓': { code: 'I80', name: '深静脉血栓形成', aliases: ['DVT', '下肢静脉血栓', '深静脉血栓'], category: '其他' },
  '痔疮出血': { code: 'K64.8', name: '痔疮出血', aliases: ['痔出血'], category: '其他' },
  '腹股沟淋巴结肿大': { code: 'R59.0', name: '局部淋巴结肿大', aliases: ['腹股沟淋巴结炎'], category: '其他' },
  '术后随访': { code: 'Z09', name: '术后随访', aliases: ['术后复查', '术后随诊', '术后检查'], category: '其他' },
  '化疗后': { code: 'Z51.1', name: '化疗后', aliases: ['化疗周期', '化疗期间', '化疗后复查'], category: '其他' },
  '放疗后': { code: 'Z51.0', name: '放疗后', aliases: ['放射治疗后', '放疗期间'], category: '其他' },
  '健康体检': { code: 'Z00', name: '健康体检', aliases: ['体检', '健康查体', '入职体检', '年度体检'], category: '其他' },
  '术前检查': { code: 'Z01', name: '术前检查', aliases: ['术前评估', '术前常规检查'], category: '其他' },
};

/** 从诊断文本匹配 ICD-10 编码 */
export function matchICD10(diagnosisText: string): ICD10Entry | null {
  if (!diagnosisText) return null;

  // 1. 精确匹配（包含别名）
  for (const [key, entry] of Object.entries(ICD10_MAPPING)) {
    const allNames = [key, entry.name, ...entry.aliases];
    for (const name of allNames) {
      if (diagnosisText.includes(name)) {
        return entry;
      }
    }
  }

  return null;
}

/** 从多个诊断文本中提取 ICD-10 编码列表 */
export function extractICD10Codes(diagnoses: string[]): { codes: string[]; matched: ICD10Entry[] } {
  const matchedEntries: ICD10Entry[] = [];
  const seenCodes = new Set<string>();

  for (const diag of diagnoses) {
    const entry = matchICD10(diag);
    if (entry && !seenCodes.has(entry.code)) {
      seenCodes.add(entry.code);
      matchedEntries.push(entry);
    }
  }

  return {
    codes: Array.from(seenCodes),
    matched: matchedEntries,
  };
}

/** 获取 ICD-10 编码的完整名称 */
export function getICD10Name(code: string): string | undefined {
  for (const entry of Object.values(ICD10_MAPPING)) {
    if (entry.code === code) return entry.name;
  }
  return undefined;
}

/** 获取 ICD-10 编码的分类 */
export function getICD10Category(code: string): string | undefined {
  for (const entry of Object.values(ICD10_MAPPING)) {
    if (entry.code === code) return entry.category;
  }
  return undefined;
}
