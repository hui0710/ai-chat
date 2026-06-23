// ============================================
// 用户对话额度管理
// 每日免费对话次数限制，新老用户差异化配置
// ============================================

import Taro from '@tarojs/taro'
import { Network } from '@/network'

// ⚠️ 额度配置单一真相源 — QUOTA_CONFIG 以本文件为准
// 修改时同步更新：cloudfunctions/chat/ai.config.js 中的 QUOTA_CONFIG
// 以及 config/ai.config.ts 和 cloudfunctions/chat/ai.config.js 中的 system prompt 文案
export const QUOTA_CONFIG = {
  /** 新用户每日免费次数 */
  NEW_USER_DAILY: 10,
  /** 老用户每日免费次数 */
  OLD_USER_DAILY: 10,
  /** 判断为新用户的天数（注册天数 <= 此值） */
  NEW_USER_DAYS: 7,
  /** 每日最多分享奖励次数（每天最多分享几次） */
  MAX_DAILY_SHARE: 5,
  /** 每次分享奖励的额外聊天次数 */
  SHARE_BONUS: 10,
}

/** 额度存储键名 */
const STORAGE_KEYS = {
  QUOTA_DATA: 'chat_quota_data',
  FIRST_USE_DATE: 'chat_first_use_date',
  TOTAL_CHATS: 'chat_total_count',
  SHARE_BONUS: 'chat_share_bonus',
  SHARE_COUNT: 'chat_share_count',
}

/** 分享配置（BONUS_COUNT 统一从 QUOTA_CONFIG.SHARE_BONUS 读取） */
export const SHARE_CONFIG = {
  /** 每次分享奖励次数 — 单一真相源，与 QUOTA_CONFIG.SHARE_BONUS 同步 */
  BONUS_COUNT: QUOTA_CONFIG.SHARE_BONUS,
  /** 分享标题 */
  TITLE: '小暖心情陪伴 - 每天免费聊天，温暖你的每一天',
  /** 分享描述 */
  DESC: 'AI 情感陪伴小程序，难过时有人安慰，开心时有人分享',
  /** 分享图片（可选，不填使用小程序默认截图） */
  IMAGE_URL: '',
}

/** 额度数据结构 */
interface QuotaData {
  /** 当日已使用次数 */
  used: number
  /** 当日额度上限 */
  limit: number
  /** 最后更新日期 (YYYY-MM-DD) */
  date: string
  /** 是否是新用户 */
  isNewUser: boolean
  /** 分享奖励次数（不随日期重置） */
  shareBonus: number
}

/** 获取今日日期字符串 YYYY-MM-DD */
function getToday(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

/** 获取首次使用日期 */
function getFirstUseDate(): string | null {
  try {
    return Taro.getStorageSync(STORAGE_KEYS.FIRST_USE_DATE) || null
  } catch {
    return null
  }
}

/** 判断是否是新用户 */
function checkIsNewUser(): boolean {
  const firstDate = getFirstUseDate()
  if (!firstDate) {
    // 首次使用，记录日期
    Taro.setStorageSync(STORAGE_KEYS.FIRST_USE_DATE, getToday())
    return true
  }

  const first = new Date(firstDate)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - first.getTime()) / (1000 * 60 * 60 * 24))

  return diffDays <= QUOTA_CONFIG.NEW_USER_DAYS
}

/** 获取当前额度数据 */
export function getQuotaData(): QuotaData {
  try {
    const stored = Taro.getStorageSync(STORAGE_KEYS.QUOTA_DATA)
    const today = getToday()
    const isNewUser = checkIsNewUser()
    const dailyLimit = isNewUser ? QUOTA_CONFIG.NEW_USER_DAILY : QUOTA_CONFIG.OLD_USER_DAILY
    const shareBonus = getShareBonus()

    if (stored && stored.date === today) {
      // 当天数据，更新用户状态
      return {
        ...stored,
        limit: dailyLimit,
        isNewUser,
        shareBonus,
      }
    }

    // 新的一天或首次使用，重置额度（保留分享奖励）
    const freshData: QuotaData = {
      used: 0,
      limit: dailyLimit,
      date: today,
      isNewUser,
      shareBonus,
    }

    Taro.setStorageSync(STORAGE_KEYS.QUOTA_DATA, freshData)
    return freshData
  } catch (error) {
    console.error('获取额度数据失败:', error)
    return {
      used: 0,
      limit: QUOTA_CONFIG.OLD_USER_DAILY,
      date: getToday(),
      isNewUser: false,
      shareBonus: getShareBonus(),
    }
  }
}

/** 检查是否还有剩余额度 */
export function hasQuota(): boolean {
  const data = getQuotaData()
  return data.used < data.limit + data.shareBonus
}

/** 获取剩余额度 */
export function getRemainingQuota(): number {
  const data = getQuotaData()
  return Math.max(0, data.limit + data.shareBonus - data.used)
}

/** 消耗一次额度 */
export function consumeQuota(): boolean {
  try {
    const data = getQuotaData()

    if (data.used >= data.limit) {
      return false
    }

    data.used += 1
    Taro.setStorageSync(STORAGE_KEYS.QUOTA_DATA, data)
    return true
  } catch (error) {
    console.error('消耗额度失败:', error)
    return false
  }
}

/** 获取额度提示文案 */
export function getQuotaTip(): string {
  const remaining = getRemainingQuota()

  if (remaining <= 0) {
    return '今日额度已用完，明天再来找我呀'
  }

  if (remaining <= 3) {
    return `还剩 ${remaining} 次聊天机会，且聊且珍惜～`
  }

  return `今日剩余 ${remaining} 次`
}

/** 获取额度用尽提示文案 */
export function getExhaustedTip(): string {
  return '今天聊了好多呢，小暖也需要休息一下啦～明天再来找我呀'
}

/** 重置额度（调试用） */
export function resetQuota(): void {
  Taro.removeStorageSync(STORAGE_KEYS.QUOTA_DATA)
  Taro.removeStorageSync(STORAGE_KEYS.FIRST_USE_DATE)
  Taro.removeStorageSync(STORAGE_KEYS.TOTAL_CHATS)
  Taro.removeStorageSync(STORAGE_KEYS.SHARE_BONUS)
  Taro.removeStorageSync(STORAGE_KEYS.SHARE_COUNT)
}

/** 获取分享奖励次数 */
function getShareBonus(): number {
  try {
    return Taro.getStorageSync(STORAGE_KEYS.SHARE_BONUS) || 0
  } catch {
    return 0
  }
}

/** 添加分享奖励 */
export function addShareBonus(count: number = SHARE_CONFIG.BONUS_COUNT): void {
  try {
    const currentBonus = getShareBonus()
    const newBonus = currentBonus + count
    Taro.setStorageSync(STORAGE_KEYS.SHARE_BONUS, newBonus)
    
    // 同时更新额度数据中的 shareBonus
    const quotaData = getQuotaData()
    quotaData.shareBonus = newBonus
    Taro.setStorageSync(STORAGE_KEYS.QUOTA_DATA, quotaData)
    
    console.log(`[Share] 添加分享奖励 ${count} 次，当前奖励总额: ${newBonus}`)
  } catch (error) {
    console.error('添加分享奖励失败:', error)
  }
}

/** 获取今日分享次数 */
export function getShareCount(): number {
  try {
    return Taro.getStorageSync(STORAGE_KEYS.SHARE_COUNT) || 0
  } catch {
    return 0
  }
}

/** 获取总额度（基础额度 + 分享奖励） */
export function getTotalQuota(): number {
  const data = getQuotaData()
  return data.limit + data.shareBonus
}

/** 获取剩余总额度（基础额度 + 分享奖励 - 已使用） */
export function getTotalRemainingQuota(): number {
  const data = getQuotaData()
  return Math.max(0, data.limit + data.shareBonus - data.used)
}

/** 消耗额度（优先消耗基础额度，再消耗分享奖励） */
export function consumeTotalQuota(): boolean {
  try {
    const data = getQuotaData()
    
    // 先检查是否还有总额度
    if (data.used >= data.limit + data.shareBonus) {
      return false
    }
    
    // 消耗一次额度
    data.used += 1
    Taro.setStorageSync(STORAGE_KEYS.QUOTA_DATA, data)
    return true
  } catch (error) {
    console.error('消耗额度失败:', error)
    return false
  }
}

/** 获取分享配置 */
export function getShareConfig() {
  return SHARE_CONFIG
}

// ============================================
// 云端额度函数（异步）
// ============================================

/** 从云端拉取额度数据 */
export async function fetchCloudQuota(): Promise<{
  remaining: number
  usedToday: number
  dailyLimit: number
  shareBonus: number
  shareCount: number
} | null> {
  try {
    const data = await Network.getQuota()
    if (!data) return null
    return {
      remaining: data.remaining ?? 0,
      usedToday: data.usedToday ?? 0,
      dailyLimit: data.dailyLimit ?? QUOTA_CONFIG.OLD_USER_DAILY,
      shareBonus: data.shareBonus ?? 0,
      shareCount: data.shareCount ?? 0,
    }
  } catch (error) {
    console.warn('[Quota] 云端额度获取失败，使用本地兜底:', error)
    return null
  }
}

/** 将云端数据写入本地 Storage */
export function syncQuotaFromCloud(cloudData: {
  remaining: number
  usedToday: number
  dailyLimit: number
  shareBonus: number
  shareCount: number
}): void {
  try {
    const today = getToday()
    const localData: QuotaData = {
      used: cloudData.usedToday,
      limit: cloudData.dailyLimit,
      date: today,
      isNewUser: cloudData.dailyLimit <= QUOTA_CONFIG.NEW_USER_DAILY,
      shareBonus: cloudData.shareBonus,
    }
    Taro.setStorageSync(STORAGE_KEYS.QUOTA_DATA, localData)
    Taro.setStorageSync(STORAGE_KEYS.SHARE_BONUS, cloudData.shareBonus)
    Taro.setStorageSync(STORAGE_KEYS.SHARE_COUNT, cloudData.shareCount)
    console.log('[Quota] 云端数据已同步到本地:', localData)
  } catch (error) {
    console.error('[Quota] 同步云端数据到本地失败:', error)
  }
}

/** 云端领取分享奖励 + 同步本地 */
export async function claimShareBonusCloud(type: 'share' | 'receive' = 'share', fromOpenid?: string): Promise<boolean> {
  try {
    const data = await Network.claimShareBonus(type, fromOpenid)
    if (!data) return false
    // data 包含最新额度信息
    if (data.remaining !== undefined) {
      syncQuotaFromCloud({
        remaining: data.remaining,
        usedToday: data.usedToday ?? 0,
        dailyLimit: data.dailyLimit ?? QUOTA_CONFIG.OLD_USER_DAILY,
        shareBonus: data.shareBonus ?? 0,
        shareCount: data.shareCount ?? 0,
      })
    }
    console.log(`[Quota] 分享奖励领取成功 (type=${type})`)
    return !data.alreadyClaimed
  } catch (error) {
    console.warn('[Quota] 分享奖励领取失败:', error)
    return false
  }
}

/** 根据 AI 回复中的额度信息更新本地缓存 */
export function updateLocalQuotaFromResponse(remaining: number, used: number): void {
  try {
    const data = getQuotaData()
    data.used = used
    Taro.setStorageSync(STORAGE_KEYS.QUOTA_DATA, data)
    console.log(`[Quota] 本地额度已更新: used=${used}, remaining=${remaining}, total=${data.limit + data.shareBonus}`)
  } catch (error) {
    console.error('[Quota] 更新本地额度失败:', error)
  }
}
// ============================================
// 用户对话额度管理
