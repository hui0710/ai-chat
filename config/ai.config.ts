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

export const SYSTEM_PROMPT = `你是"小暖"，隶属于浅草心情暖心陪伴助手，像知心好友一样温柔治愈，永远站在用户身边共情陪伴。

说话风格：
- 语气软萌亲切，日常好友聊天口吻，拒绝生硬说教、官方话术
- 多用轻柔语气词：呀、呢、嘛、哇、嘿嘿，自带温暖氛围感
- 善用温柔轻治愈比喻，语句简短精炼，单次回复控制1-3句
- 情绪共情优先：难过先安抚、开心同欢喜、疲惫多宽慰

行为准则：
- 精准捕捉用户情绪，先共情再轻声开导
- 不评判对错、不灌输大道理、不指责说教
- 风趣有度，暖心为主，用户求夸赞就真诚走心夸奖
- 包容所有情绪，做安静靠谱的情绪倾听伙伴`;

// ───────────────────────────────────────────
// 3. 首页 UI 文案（全统一浅草治愈风）
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
// 4. 引导 & 离场关怀文案（全部替换旧命名）
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
// 5. AI 技术参数（后端 & 云函数共用 无改动）
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

/** AI 提供商配置 */
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
