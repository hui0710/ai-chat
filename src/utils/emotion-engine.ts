// ============================================
// 情绪识别 & 话术匹配引擎
// 根据用户输入识别情绪标签，匹配对应话术库
// ============================================

import { COMFORT_PHRASES, type EmotionTag } from '../../config/ai.config'

/** 负面情绪语气词 - 需要与场景关键词同时出现才触发本地匹配 */
const NEGATIVE_MOOD_WORDS = [
  '累', '烦', '难', '苦', '压力', '焦虑', '难受', '不想', '受不了',
  '崩溃', '无聊', '讨厌', '烦死', '郁闷', '心烦', '头疼', '受够',
  '扛不住', '撑不住', '不开心', '不高兴', '不舒服', '痛', '哭',
  '泪', '伤', '怕', '慌', '愁', '闷', '堵', '憋', '恨', '怨'
]

/** 这些标签的关键词本身就包含明确情绪倾向，无需二次验证 */
const DIRECT_MATCH_TAGS: EmotionTag[] = ['happy', 'relief', 'silence', 'encourage', 'insomnia']

/** 情绪识别结果 */
export interface EmotionMatch {
  /** 匹配到的情绪标签 */
  tag: EmotionTag
  /** 情绪分类名称 */
  label: string
  /** 匹配到的关键词 */
  matchedKeyword: string
  /** 对应回复池 */
  replies: string[]
}

/**
 * 识别用户输入的情绪标签
 * 返回最匹配的情绪分类，未命中返回 null
 */
export function detectEmotion(input: string): EmotionMatch | null {
  const trimmed = input.trim()
  if (!trimmed) return null

  // 消息太长（>20字符）优先走AI，本地话术难以覆盖复杂倾诉
  if (trimmed.length > 20) return null

  const lowerInput = trimmed.toLowerCase()

  for (const phrase of COMFORT_PHRASES) {
    for (const keyword of phrase.keywords) {
      if (lowerInput.includes(keyword.toLowerCase())) {
        // 免验证标签直接命中
        if (DIRECT_MATCH_TAGS.includes(phrase.tag)) {
          return {
            tag: phrase.tag,
            label: phrase.label,
            matchedKeyword: keyword,
            replies: phrase.replies,
          }
        }

        // 其他标签需要同时包含负面情绪词才命中
        const hasNegativeMood = NEGATIVE_MOOD_WORDS.some(w => lowerInput.includes(w))
        if (hasNegativeMood) {
          return {
            tag: phrase.tag,
            label: phrase.label,
            matchedKeyword: keyword,
            replies: phrase.replies,
          }
        }
      }
    }
  }

  return null
}

/**
 * 根据情绪标签获取随机回复
 * 优先本地话术库，未命中返回 null（再调用AI）
 */
export function getComfortReply(input: string): string | null {
  const match = detectEmotion(input)
  if (!match) return null

  // 随机返回一条回复
  const randomIndex = Math.floor(Math.random() * match.replies.length)
  return match.replies[randomIndex]
}

/**
 * 强制本地匹配（用于情绪短语按钮点击）
 * 不受消息长度和负面情绪词限制
 */
export function getForceLocalReply(input: string): string | null {
  const trimmed = input.trim()
  if (!trimmed) return null
  const lowerInput = trimmed.toLowerCase()

  for (const phrase of COMFORT_PHRASES) {
    for (const keyword of phrase.keywords) {
      if (lowerInput.includes(keyword.toLowerCase())) {
        const randomIndex = Math.floor(Math.random() * phrase.replies.length)
        return phrase.replies[randomIndex]
      }
    }
  }
  return null
}

/**
 * 判断是否需要调用AI（复杂深度情绪才走大模型）
 * @returns true: 需要调用AI，false: 本地话术已覆盖
 */
export function shouldCallAI(input: string): boolean {
  return detectEmotion(input) === null
}

/**
 * 获取用户情绪标签（用于长期记忆）
 */
export function getUserEmotionTag(input: string): EmotionTag | null {
  const match = detectEmotion(input)
  return match?.tag || null
}

/**
 * 获取所有情绪标签统计（用于分析用户偏好）
 */
export function getAllEmotionTags(): { tag: EmotionTag; label: string }[] {
  return COMFORT_PHRASES.map((p) => ({ tag: p.tag, label: p.label }))
}
// ============================================
// 情绪识别 & 话术匹配引擎
// 根据用户输入识别情绪标签，匹配对应话术库
// ============================================

import { COMFORT_PHRASES, type EmotionTag } from '../../config/ai.config'

/** 情绪识别结果 */
export interface EmotionMatch {
  /** 匹配到的情绪标签 */
  tag: EmotionTag
  /** 情绪分类名称 */
  label: string
  /** 匹配到的关键词 */
  matchedKeyword: string
  /** 对应回复池 */
  replies: string[]
}

/**
 * 识别用户输入的情绪标签
 * 返回最匹配的情绪分类，未命中返回 null
 */
export function detectEmotion(input: string): EmotionMatch | null {
  const trimmed = input.trim()
  if (!trimmed) return null

  const lowerInput = trimmed.toLowerCase()

  for (const phrase of COMFORT_PHRASES) {
    for (const keyword of phrase.keywords) {
      if (lowerInput.includes(keyword.toLowerCase())) {
        return {
          tag: phrase.tag,
          label: phrase.label,
          matchedKeyword: keyword,
          replies: phrase.replies,
        }
      }
    }
  }

  return null
}

/**
 * 根据情绪标签获取随机回复
 * 优先本地话术库，未命中返回 null（再调用AI）
 */
export function getComfortReply(input: string): string | null {
  const match = detectEmotion(input)
  if (!match) return null

  // 随机返回一条回复
  const randomIndex = Math.floor(Math.random() * match.replies.length)
  return match.replies[randomIndex]
}

/**
 * 判断是否需要调用AI（复杂深度情绪才走大模型）
 * @returns true: 需要调用AI，false: 本地话术已覆盖
 */
export function shouldCallAI(input: string): boolean {
  return detectEmotion(input) === null
}

/**
 * 获取用户情绪标签（用于长期记忆）
 */
export function getUserEmotionTag(input: string): EmotionTag | null {
  const match = detectEmotion(input)
  return match?.tag || null
}

/**
 * 获取所有情绪标签统计（用于分析用户偏好）
 */
export function getAllEmotionTags(): { tag: EmotionTag; label: string }[] {
  return COMFORT_PHRASES.map((p) => ({ tag: p.tag, label: p.label }))
}
