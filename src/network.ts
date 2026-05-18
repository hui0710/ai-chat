import Taro from '@tarojs/taro'

/**
 * 网络请求模块 - 兼容版本
 * 
 * 微信小程序：调用云函数
 * H5：调用后端API
 */

// 判断是否在小程序环境
const isMiniApp = () => {
  const env = Taro.getEnv()
  return env === Taro.ENV_TYPE.WEAPP || env === Taro.ENV_TYPE.TT
}

// 云函数调用（仅小程序环境）
const callCloudFunction = async (name: string, data: any) => {
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

// 后端API调用（H5环境）
const callBackendAPI = async (url: string, data: any) => {
  try {
    const response = await Taro.request({
      url: url,
      method: 'POST',
      data: data,
      header: {
        'content-type': 'application/json'
      }
    })

    console.log(`后端API ${url} 调用成功:`, response.data)

    return response.data as {
      code?: number
      msg?: string
      data?: any
    }
  } catch (error) {
    console.error(`后端API ${url} 调用失败:`, error)
    throw error
  }
}

// 兼容原有的 Network 接口
export namespace Network {
  // 聊天接口
  export const chat = async (message: string, history: any[] = []) => {
    console.log('[Network] 当前环境:', isMiniApp() ? '小程序' : 'H5')
    
    if (isMiniApp()) {
      // 小程序环境：调用云函数
      console.log('[Network] 使用云函数调用')
      const result = await callCloudFunction('chat', {
        action: 'chat',
        data: {
          message,
          history,
        },
      })

      if (!result.success) {
        throw new Error(result.error || '聊天失败')
      }

      return result.data
    } else {
      // H5环境：调用后端API
      console.log('[Network] 使用后端API调用')
      const response = await callBackendAPI('/api/chat', {
        message,
        history,
      })

      // 后端返回格式: { code: 200, msg: 'success', data: { content: '...' } }
      if (response.code !== 200) {
        throw new Error(response.msg || '聊天失败')
      }

      return response.data
    }
  }

  // 获取历史记录
  export const getHistory = async () => {
    if (isMiniApp()) {
      // 小程序环境：调用云函数
      const result = await callCloudFunction('chat', {
        action: 'getHistory',
        data: {},
      })

      if (!result.success) {
        throw new Error(result.error || '获取历史记录失败')
      }

      return result.data
    } else {
      // H5环境：从本地存储读取
      try {
        const history = Taro.getStorageSync('chat_history') || []
        return { history }
      } catch (error) {
        console.error('[Network] 读取历史记录失败:', error)
        return { history: [] }
      }
    }
  }

  // 清空历史记录
  export const clearHistory = async () => {
    if (isMiniApp()) {
      // 小程序环境：调用云函数
      const result = await callCloudFunction('chat', {
        action: 'clearHistory',
        data: {},
      })

      if (!result.success) {
        throw new Error(result.error || '清空历史记录失败')
      }

      return result
    } else {
      // H5环境：清空本地存储
      try {
        Taro.removeStorageSync('chat_history')
        return { success: true }
      } catch (error) {
        console.error('[Network] 清空历史记录失败:', error)
        throw error
      }
    }
  }
}

// 导出 Taro 原生方法（兼容）
export const request = Taro.request
export const uploadFile = Taro.uploadFile
export const downloadFile = Taro.downloadFile
