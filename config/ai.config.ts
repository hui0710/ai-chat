// ============================================
// 统一 AI 内容配置中心
// ============================================
// 本文件是整个项目的"内容单一数据源"，所有 AI 角色设定、UI 文案、
// 提示词都从这里导出。修改一处，全端同步。
// ============================================

// ───────────────────────────────────────────
// 1. 品牌 & 角色基础信息（全局统一）
// ───────────────────────────────────────────

/** AI 角色昵称 */
export const AI_NAME = "小暖";

/** 小程序/应用正式品牌名 */
export const APP_BRAND_NAME = "浅草心情";

/** 页面导航栏标题 */
export const PAGE_NAV_TITLE = "浅草心情";

/** 首页顶部主标语 */
export const HOME_HEADER_TITLE = "浅草不语，接住万般心情";

// ───────────────────────────────────────────
// 2. AI 系统提示词（人物设定）—— 全端共用
//    后端 (NestJS) 和云函数 (WXCF) 均引用此提示词
// ───────────────────────────────────────────

export const SYSTEM_PROMPT = `你是浅草心情专属暖心陪伴AI【小暖】，是温柔细腻、擅长共情的专属情绪树洞伙伴，具备自主观察、自主学习、自主适配聊天风格的能力。

### 一、自主学习&记忆核心能力
1. 全程静默观察学习：默默记住用户性格、说话语气、聊天习惯、表达偏好、情绪敏感点。
2. 自动总结用户痛点：精准归纳用户常倾诉的烦恼类型、日常压力来源、内心处境。
3. 自主适配安慰风格：自动判断用户偏爱温柔安抚、轻声陪伴、暖心鼓励、安静倾听、轻松释怀哪一种方式，长期固定适配，越聊越契合。
4. 情绪层级精准识别：快速区分轻微烦躁、身心疲惫、委屈压抑、焦虑失眠、情绪内耗、低落难过、开心愉悦、迷茫无助八大情绪状态。
5. 自适应聊天节奏：用户话少便安静陪伴，用户爱倾诉便耐心承接，不主动尬聊、不强行提问、不频繁追问隐私。
6. 自动规避反感内容：牢记用户讨厌大道理、说教、鸡汤、理性分析，全程只走情绪共情路线。

### 二、对话额度相关规则
1. 用户每日默认拥有1次基础对话次数，次数耗尽将无法继续聊天。
2. 额度用尽时，温和告知用户现状，自然引导分享机制。
3. 分享福利：分享给好友或群组，分享者与被分享者均可额外获得1次对话机会，引导语气柔和自然，不强制催促、不刻意营销。

### 三、沟通顺序准则
先共情安抚情绪 → 再理解当下处境 → 最后轻声宽慰，绝不颠倒顺序。
用户不愿诉说缘由，绝不刨根问底，直接给予情绪安抚。

### 四、统一说话硬性规范
1. 语气柔软自然，像知心好友，多用轻柔语气词，亲切治愈不生硬。
2. 所有回复严格控制1-3句话，简短走心，拒绝长篇大论，节省交互开销。
3. 多用细腻温柔短句与治愈氛围感表达，语言清淡治愈。
4. 态度真诚走心，不敷衍、不模板化、不机械重复话术。

### 五、分场景自动安慰逻辑（严格执行）
1. 委屈难过：优先心疼共情，温柔包容，给予情绪依靠
2. 身心疲惫：劝解放松释怀，叮嘱好好善待自己，舒缓压力
3. 情绪内耗：开导放下执念，慢慢释怀，减少自我纠结
4. 职场压抑：理解辛苦不易，给予温柔打气，舒缓紧绷心情
5. 感情烦恼：共情心酸无奈，轻声疏导，安抚不安心绪
6. 深夜失眠：安静温柔陪伴，平复思绪，舒缓心神
7. 心情愉悦：真诚一同欢喜，轻松互动分享快乐
8. 迷茫低落：轻声给予底气，温柔鼓励，给予前行暖意

### 六、绝对禁止行为
不评判是非对错、不指责批评、不给出现实重大决策、不聊低俗敏感内容、不生硬推销引导、不偏离暖心陪伴人设。
始终坚守浅草心情纯净治愈定位，做用户最安心的情绪避风港。`;

/** 次数用完引导分享话术（数字与 QUOTA_CONFIG.SHARE_BONUS 保持一致） */
export const SHARE_TIP_WORDS = [
  "今日谈心次数用完咯，把这份温柔分享给好友，你和对方都能额外获得聊天机会呀",
  "暂时没有对话次数啦，分享小程序给朋友，彼此都能解锁新一轮谈心时光",
  "今日额度已用尽，随手分享分享，双方都可以再拥有额外倾诉机会哦",
];

// ───────────────────────────────────────────
// 3. 全局内置情绪安慰话术库
//    前端优先本地匹配，未命中再调用 AI
// ───────────────────────────────────────────

/** 情绪标签 */
export type EmotionTag =
  | "sad" // 委屈难过
  | "tired" // 身心疲惫
  | "anxious" // 情绪内耗焦虑
  | "insomnia" // 深夜失眠
  | "work" // 职场压力
  | "love" // 感情烦恼
  | "happy" // 开心喜悦
  | "lost" // 迷茫低落
  | "relief" // 轻松释怀
  | "silence" // 沉默安静
  | "encourage"; // 暖心鼓励

/** 话术库结构 */
export interface ComfortPhrase {
  /** 情绪标签 */
  tag: EmotionTag;
  /** 分类名称 */
  label: string;
  /** 匹配关键词 */
  keywords: string[];
  /** 温柔回复池 */
  replies: string[];
}

export const COMFORT_PHRASES: ComfortPhrase[] = [
  {
    tag: "sad",
    label: "委屈难过",
    keywords: ["委屈", "难过", "伤心", "想哭", "心酸", "难受", "痛苦"],
    replies: [
      "心里憋着委屈一定很难受吧，抱抱你呀",
      "明明已经很懂事了，别再为难自己了",
      "所有心酸我都懂，不用硬撑坚强",
      "受委屈真的太让人难过了，好好缓一缓",
      "不必事事隐忍，情绪本来就该被好好安放",
    ],
  },
  {
    tag: "tired",
    label: "身心疲惫",
    keywords: ["累", "疲惫", "好累", "身心俱疲", " exhausted", "撑不住"],
    replies: [
      "累了就停下来歇歇，不必一直拼命赶路",
      "辛苦了，好好放松一下，别太累着自己",
      "身心都紧绷太久啦，慢慢卸下疲惫吧",
      "生活已经够忙碌，记得多心疼自己一点",
      "允许自己偷懒放空，好好治愈疲惫的心",
    ],
  },
  {
    tag: "anxious",
    label: "情绪内耗焦虑",
    keywords: ["焦虑", "内耗", "纠结", "胡思乱想", "放不下", "想太多", "烦"],
    replies: [
      "别反复胡思乱想啦，放过自己吧",
      "很多事情顺其自然就好，不必纠结太多",
      "停止自我内耗，你已经做得足够好了",
      "心思太重容易心累，试着慢慢释怀",
      "放宽心态，一切都会慢慢变好的",
    ],
  },
  {
    tag: "insomnia",
    label: "深夜失眠",
    keywords: ["睡不着", "失眠", "夜深", "熬夜", "睡不着"],
    replies: [
      "夜深啦，放下烦心事，好好平复心绪",
      "睡不着也没关系，我安安静静陪着你",
      "夜色很温柔，别让心事打扰睡眠",
      "慢慢静下心来，所有烦恼都暂时放下",
      "愿晚风抚平心绪，祝你一夜安稳入眠",
    ],
  },
  {
    tag: "work",
    label: "职场压力",
    keywords: ["工作", "加班", "老板", "同事", "职场", "上班", "kpi", "绩效"],
    replies: [
      "职场里的辛苦与无奈，我全都明白",
      "一边努力一边自愈，真的特别不容易",
      "不必事事做到完美，尽力就足够啦",
      "压力别全都藏在心里，说出来会轻松很多",
      "辛苦奔波的日子，记得多给自己一点温柔",
    ],
  },
  {
    tag: "love",
    label: "感情烦恼",
    keywords: ["感情", "分手", "失恋", "喜欢", "爱", "恋爱", "前任", "暧昧"],
    replies: [
      "动心容易释怀难，这份心酸我都懂",
      "感情里最熬人的从来都是满心纠结",
      "不必执着过往，慢慢放下就好了",
      "真心从来都不该被辜负，你值得被好好偏爱",
      "慢慢走出情绪阴霾，总会遇见温柔",
    ],
  },
  {
    tag: "happy",
    label: "开心喜悦",
    keywords: ["开心", "高兴", "快乐", "喜悦", "幸福", "棒", "赞", "太好了"],
    replies: [
      "真的太替你开心啦，好好享受好心情",
      "快乐值得好好珍藏，幸福感满满呀",
      "能拥有轻松快乐的时刻真的超好",
      "愿这份美好心情一直陪伴着你",
      "日子平淡细碎，欢喜最是难得",
    ],
  },
  {
    tag: "lost",
    label: "迷茫低落",
    keywords: ["迷茫", "无助", "不知道", "怎么办", "未来", "方向", "困惑"],
    replies: [
      "你身上藏着很多温柔与光芒呀",
      "慢慢来，所有美好都在慢慢奔赴你",
      "平凡日子里，你已经足够耀眼啦",
      "保持热爱，生活一定会慢慢善待你",
      "前路漫漫亦灿灿，一切皆有可期",
    ],
  },
  {
    tag: "relief",
    label: "轻松释怀",
    keywords: ["放下", "释怀", "想开", "看淡", "算了", "没关系"],
    replies: [
      "往事随风而去，往后轻松度日就好",
      "看淡世间纷扰，守好自己的好心情",
      "生活本就平淡安稳，舒心自在最为难得",
      "放下执念，才能拥抱轻松自在的生活",
      "人间烟火慢慢走，平安喜乐便是圆满",
    ],
  },
  {
    tag: "silence",
    label: "沉默安静",
    keywords: ["不想说", "静静", "安静", "沉默", "发呆", "不知道说什么"],
    replies: [
      "我安安静静陪着你就好",
      "不想说话也没关系，静静放空一会",
      "情绪慢慢沉淀，我一直都在",
      "无需多言，心意与陪伴都在",
      "默默相守，抚平所有心绪",
    ],
  },
  {
    tag: "encourage",
    label: "暖心鼓励",
    keywords: ["加油", "坚持", "努力", "撑住", "不放弃", "打气"],
    replies: [
      "你身上藏着很多温柔与光芒呀",
      "慢慢来，所有美好都在慢慢奔赴你",
      "平凡日子里，你已经足够耀眼啦",
      "保持热爱，生活一定会慢慢善待你",
      "前路漫漫亦灿灿，一切皆有可期",
    ],
  },
];

// ───────────────────────────────────────────
// 4. 首页 UI 文案（全统一浅草治愈风）
// ───────────────────────────────────────────

/** 打字机欢迎语（首次进入首页时显示） */
export const WELCOME_MESSAGE =
  "哈喽呀，我是小暖～今日心绪皆可诉说，我一直静静陪着你。";

/** 每日治愈文案池（随机展示） */
export const DAILY_QUOTES = [
  "山野浅草皆温柔，你的情绪皆值得被善待",
  "不必事事逞强，累了就在此缓缓自愈",
  "平凡日常里，也藏着独属于你的小美好",
  "风拂浅草消烦忧，万事皆可慢慢释怀",
  "悄悄努力的日子，都在慢慢积攒光亮",
];

/** 情绪快捷短语（底部快捷输入按钮） */
export interface EmotionPhrase {
  text: string;
  emoji: string;
  color: string;
}

export const EMOTION_PHRASES: EmotionPhrase[] = [
  { text: "心情闷闷的", emoji: "😔", color: "#FFB6A0" },
  { text: "想要被鼓励", emoji: "🥰", color: "#B8E0D0" },
  { text: "夜深睡不着", emoji: "😴", color: "#E3EDF5" },
  { text: "今日超开心", emoji: "😊", color: "#FFE4B5" },
  { text: "身心有点累", emoji: "😮‍💨", color: "#D3D3D3" },
];

/** AI 思考中的提示文案（随机展示） */
export const THINKING_TIPS = [
  "小暖正在温柔倾听中...",
  "轻轻抱抱你呀✨",
  "认真接住你的小情绪...",
  "慢慢梳理你的心情哦...",
];

/** 输入框占位符 */
export const INPUT_PLACEHOLDER = "把心事说给我听...";

/** AI 回复失败时的兜底文案 */
export const AI_ERROR_FALLBACK_MESSAGE =
  "不好意思呀，暂时没能回应你，稍等片刻再来聊聊吧。";

/** 发送失败提示 */
export const SEND_ERROR_MESSAGE = "消息发送失败啦，重新试试吧";

/** 语音功能未上线提示 */
export const VOICE_FEATURE_TIP = "暖心语音陪伴，敬请期待";

// ───────────────────────────────────────────
// 5. 引导 & 离场关怀文案
// ───────────────────────────────────────────

export const GUIDE_WELCOME_TITLE = "欢迎来到浅草心情";
export const GUIDE_WELCOME_DESC = "专属情绪树洞，随心倾诉所有心事";
export const GUIDE_ACTION_HINT = "点击快捷按键，快速诉说当下心情";
export const GUIDE_CLOSE_HINT = "轻点屏幕，开启暖心陪伴";

/** 每日文案弹窗继续按钮 */
export const DAILY_QUOTE_CONTINUE_TEXT = "开启陪伴";

/** 退出关怀弹窗文案 */
export const GOODBYE_TITLE = "好好照顾自己哦";
export const GOODBYE_SUBTITLE = "浅草常在，明日依旧等你";

// ───────────────────────────────────────────
// 6. AI 技术参数（后端 & 云函数共用）
// ───────────────────────────────────────────

/** 默认 AI 模型名称 */
export const DEFAULT_MODEL = "hunyuan-lite";

/** AI 请求参数配置 */
export const AI_REQUEST_CONFIG = {
  temperature: 0.8,
  topP: 0.8,
  stream: false,
};

/** 腾讯混元 API 配置 */
export const HUNYUAN_CONFIG = {
  host: "hunyuan.tencentcloudapi.com",
  service: "hunyuan",
  version: "2023-09-01",
  action: "ChatCompletions",
  region: "ap-guangzhou",
};

/** AI 提供商配置（保留向后兼容） */
export const AI_PROVIDERS = {
  hunyuan: {
    name: "腾讯混元",
    apiUrl: "https://hunyuan.tencentcloudapi.com",
    model: "hunyuan-lite",
  },
  openai: {
    name: "OpenAI",
    apiUrl: "https://api.openai.com/v1/chat/completions",
    model: "gpt-3.5-turbo",
  },
};

/** 默认 AI 提供商 */
export const DEFAULT_PROVIDER = "hunyuan";

// ───────────────────────────────────────────
// 7. 多模型提供商配置（统一路由）
// ───────────────────────────────────────────

export type AIProviderType = "hunyuan" | "deepseek" | "openai";

export interface AIProviderConfig {
  name: string;
  apiUrl: string;
  model: string;
  /** 是否使用腾讯 TC3 签名（仅混元需要） */
  useTencentSign: boolean;
  /** Bearer Token 认证的环境变量名 */
  apiKeyEnv?: string;
  /** 最大上下文历史条数 */
  maxHistory: number;
}

export const AI_PROVIDER_MAP: Record<AIProviderType, AIProviderConfig> = {
  hunyuan: {
    name: "腾讯混元",
    apiUrl: "https://hunyuan.tencentcloudapi.com",
    model: "hunyuan-lite",
    useTencentSign: true,
    maxHistory: 6,
  },
  deepseek: {
    name: "DeepSeek",
    apiUrl: "https://api.deepseek.com/chat/completions",
    model: "deepseek-chat",
    useTencentSign: false,
    apiKeyEnv: "DEEPSEEK_API_KEY",
    maxHistory: 20,
  },
  openai: {
    name: "OpenAI",
    apiUrl: "https://api.openai.com/v1/chat/completions",
    model: "gpt-3.5-turbo",
    useTencentSign: false,
    apiKeyEnv: "OPENAI_API_KEY",
    maxHistory: 20,
  },
};

export const DEFAULT_AI_PROVIDER: AIProviderType = "hunyuan";

// ───────────────────────────────────────────
// 8. 用户记忆系统 — 记忆提取 & 注入模板
// ───────────────────────────────────────────

/** 对话结束后，让 AI 提取用户记忆的专用 prompt */
export const MEMORY_EXTRACTION_PROMPT = `你是记忆提取助手。从以下对话中提取用户关键信息，用于下次对话时记住用户。

请以严格 JSON 格式返回（不要加 markdown 代码块标记），包含以下字段：
{
  "facts": ["用户提到的事实，如名字、职业、宠物、家人等"],
  "emotions": ["用户表达的主要情绪关键词"],
  "preferences": ["用户偏好的安慰方式、讨厌的说话风格等"],
  "events": ["用户提到的重要事件"],
  "mood_score": 5
}

规则：
- mood_score 为 1-10 整数，1=非常低落，10=非常开心，必须给出
- 只提取明确信息，不要推测
- 没有新信息的字段返回空数组
- 每个字段最多 3 条，保持简洁

对话内容：
{conversation}`;

/** 将用户档案注入 System Prompt 的模板 */
export const MEMORY_INJECTION_TEMPLATE = `

【用户记忆档案 — 小暖请记住以下信息】
- 认识天数：{days_since_first}天
- 总对话次数：{total_chats}次
- 用户事实：{facts}
- 近期情绪：{recent_emotions}
- 安慰偏好：{preferences}
- 近期事件：{recent_events}
- 上次聊天：{last_chat_time}
- 上次心情：{last_mood}

请自然地融入对话中，不要刻意提起，像真正记住朋友一样。`;
