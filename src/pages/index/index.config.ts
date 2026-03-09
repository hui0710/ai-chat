export default typeof definePageConfig === 'function'
  ? definePageConfig({
      navigationBarTitleText: 'AI陪聊助手',
      navigationBarBackgroundColor: '#ffffff',
      navigationBarTextStyle: 'black',
      enablePullDownRefresh: false
    })
  : {
      navigationBarTitleText: 'AI陪聊助手',
      navigationBarBackgroundColor: '#ffffff',
      navigationBarTextStyle: 'black',
      enablePullDownRefresh: false
    }
