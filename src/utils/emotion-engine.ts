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
