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
  SHARE_BONUS: 'chat_share_bonus',
  HAS_SHARED: 'chat_has_shared',
}

/** 分享奖励配置 */
export const SHARE_CONFIG = {
  /** 分享奖励次数 */
  BONUS_COUNT: 10,
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
  const remaining = Math.max(0, data.limit - data.used)
  return remaining + data.shareBonus
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
  Taro.removeStorageSync(STORAGE_KEYS.SHARE_BONUS)
  Taro.removeStorageSync(STORAGE_KEYS.HAS_SHARED)
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

/** 标记用户已分享 */
export function markAsShared(): void {
  try {
    Taro.setStorageSync(STORAGE_KEYS.HAS_SHARED, true)
  } catch (error) {
    console.error('标记分享状态失败:', error)
  }
}

/** 检查用户是否已分享 */
export function hasShared(): boolean {
  try {
    return !!Taro.getStorageSync(STORAGE_KEYS.HAS_SHARED)
  } catch {
    return false
  }
}

/** 获取总额度（基础额度 + 分享奖励） */
export function getTotalQuota(): number {
  const data = getQuotaData()
  return data.limit + data.shareBonus
}

/** 获取剩余总额度（剩余额度 + 分享奖励） */
export function getTotalRemainingQuota(): number {
  const data = getQuotaData()
  const remaining = Math.max(0, data.limit - data.used)
  return remaining + data.shareBonus
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
