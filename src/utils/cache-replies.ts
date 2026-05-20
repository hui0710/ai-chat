// ============================================
// 高频话术本地缓存策略（已升级，对接 ai.config.ts 话术库）
// 命中缓存关键词直接返回预设温柔回复，不调用混元AI接口
// 节省免费token额度，提升响应速度
// ============================================

import { COMFORT_PHRASES, type EmotionTag } from '../../config/ai.config'

/** 缓存回复结构 */
export interface CacheReply {
  /** 匹配的关键词列表 */
  keywords: string[]
  /** 对应的温柔回复池（随机返回一条） */
  replies: string[]
  /** 话术分类 */
  category: string
}

/** 高频话术缓存库 —— 从 ai.config.ts COMFORT_PHRASES 同步 */
export const CACHE_REPLIES: CacheReply[] = COMFORT_PHRASES.map((p) => ({
  keywords: p.keywords,
  replies: p.replies,
  category: p.tag,
}))

/**
 * 根据用户输入匹配本地缓存回复
 * @param input 用户输入文本
 * @returns 匹配的缓存回复，未命中返回 null
 */
export function matchCacheReply(input: string): string | null {
  const trimmed = input.trim()
  if (!trimmed) return null

  const lowerInput = trimmed.toLowerCase()

  for (const item of CACHE_REPLIES) {
    const matched = item.keywords.some(
      (keyword) => lowerInput.includes(keyword.toLowerCase()) || lowerInput === keyword.toLowerCase()
    )
    if (matched) {
      // 随机返回一条回复
      const randomIndex = Math.floor(Math.random() * item.replies.length)
      return item.replies[randomIndex]
    }
  }

  return null
}

/**
 * 判断是否需要调用AI（非重复、深度倾诉类对话）
 * @param input 用户输入文本
 * @returns true: 需要调用AI，false: 本地缓存已覆盖
 */
export function shouldCallAI(input: string): boolean {
  return matchCacheReply(input) === null
}

/**
 * 获取用户输入匹配到的情绪标签
 * @param input 用户输入文本
 * @returns 情绪标签，未命中返回 null
 */
export function getMatchedEmotionTag(input: string): EmotionTag | null {
  const trimmed = input.trim()
  if (!trimmed) return null

  const lowerInput = trimmed.toLowerCase()

  for (const phrase of COMFORT_PHRASES) {
    for (const keyword of phrase.keywords) {
      if (lowerInput.includes(keyword.toLowerCase())) {
        return phrase.tag
      }
    }
  }

  return null
}
