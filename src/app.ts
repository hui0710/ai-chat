import Taro from '@tarojs/taro'
import { Component, ReactNode } from 'react'
import './app.css'

interface AppProps {
  children?: ReactNode
}

class App extends Component<AppProps> {
  componentDidMount() {
    // 初始化云开发
    if (process.env.TARO_ENV === 'weapp') {
      Taro.cloud.init({
        env: process.env.TARO_APP_CLOUD_ENV_ID || '',
        traceUser: true,
      })
      console.log('云开发初始化完成')

      // // 强制更新检测，确保老用户及时获取新版本
      // if (Taro.canIUse('getUpdateManager')) {
      //   const updateManager = Taro.getUpdateManager()
      //   updateManager.onUpdateReady(() => {
      //     Taro.showModal({
      //       title: '更新提示',
      //       content: '新版本已准备好，是否重启应用？',
      //       success: (res) => {
      //         if (res.confirm) {
      //           updateManager.applyUpdate()
      //         }
      //       },
      //     })
      //   })
      //   updateManager.onUpdateFailed(() => {
      //     Taro.showModal({
      //       title: '更新提示',
      //       content: '新版本下载失败，请删除当前小程序后重新搜索打开',
      //       showCancel: false,
      //     })
      //   })
      // }
    }
  }

  componentDidShow() {}

  componentDidHide() {}

  render() {
    return this.props.children
  }
}

export default App