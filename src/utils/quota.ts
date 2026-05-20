// ============================================
// 用户对话额度管理
// 每日免费对话次数限制，新老用户差异化配置
// ============================================

import Taro from '@tarojs/taro'

/** 额度配置 */
export const QUOTA_CONFIG = {
  /** 新用户每日免费次数 */
  NEW_USER_DAILY: 10,
  /** 老用户每日免费次数 */
  OLD_USER_DAILY: 20,
  /** 判断为新用户的天数（注册天数 <= 此值） */
  NEW_USER_DAYS: 7,
}

/** 额度存储键名 */
const STORAGE_KEYS = {
  QUOTA_DATA: 'chat_quota_data',
  FIRST_USE_DATE: 'chat_first_use_date',
  TOTAL_CHATS: 'chat_total_count',
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

    if (stored && stored.date === today) {
      // 当天数据，更新用户状态
      return {
        ...stored,
        limit: dailyLimit,
        isNewUser,
      }
    }

    // 新的一天或首次使用，重置额度
    const freshData: QuotaData = {
      used: 0,
      limit: dailyLimit,
      date: today,
      isNewUser,
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
    }
  }
}

/** 检查是否还有剩余额度 */
export function hasQuota(): boolean {
  const data = getQuotaData()
  return data.used < data.limit
}

/** 获取剩余额度 */
export function getRemainingQuota(): number {
  const data = getQuotaData()
  return Math.max(0, data.limit - data.used)
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
  const data = getQuotaData()
  const remaining = Math.max(0, data.limit - data.used)

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
}
