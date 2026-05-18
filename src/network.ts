import Taro from '@tarojs/taro'

/**
 * 网络请求模块 - 云函数版本
 * 支持调用微信小程序云函数
 */

// 云函数调用
export const callCloudFunction = async (name: string, data: any) => {
  try {
    const result = await Taro.cloud.callFunction({
      name: name,
      data: data,
    })

    console.log(`云函数 ${name} 调用成功:`, result.result)

    return result.result as {
      success: boolean
      data?: any
      error?: string
      message?: string
    }
  } catch (error) {
    console.error(`云函数 ${name} 调用失败:`, error)
    throw error
  }
}

// 兼容原有的 Network 接口
export namespace Network {
  // 聊天接口 - 调用云函数
  export const chat = async (message: string) => {
    const result = await callCloudFunction('chat', {
      action: 'chat',
      data: {
        message,
      },
    })

    if (!result.success) {
      throw new Error(result.error || '聊天失败')
    }

    return result.data
  }

  // 获取历史记录 - 调用云函数
  export const getHistory = async () => {
    const result = await callCloudFunction('chat', {
      action: 'getHistory',
      data: {},
    })

    if (!result.success) {
      throw new Error(result.error || '获取历史记录失败')
    }

    return result.data
  }

  // 清空历史记录 - 调用云函数
  export const clearHistory = async () => {
    const result = await callCloudFunction('chat', {
      action: 'clearHistory',
      data: {},
    })

    if (!result.success) {
      throw new Error(result.error || '清空历史记录失败')
    }

    return result
  }
}

// 兼容 H5 环境下的网络请求（如果需要）
export const request = Taro.request
export const uploadFile = Taro.uploadFile
export const downloadFile = Taro.downloadFile
