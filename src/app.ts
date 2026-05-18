import Taro from '@tarojs/taro'
import { Component } from 'react'
import './app.css'

class App extends Component {
  componentDidMount() {
    // 初始化云开发
    if (process.env.TARO_ENV === 'weapp') {
      Taro.cloud.init({
        env: process.env.TARO_APP_CLOUD_ENV_ID || '',
        traceUser: true,
      })
      console.log('云开发初始化完成')
    }
  }

  componentDidShow() {}

  componentDidHide() {}

  render() {
    return this.props.children
  }
}

export default App
