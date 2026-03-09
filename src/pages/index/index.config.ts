export default typeof definePageConfig === 'function'
  ? definePageConfig({
      navigationBarTitleText: '树洞先生',
      navigationBarBackgroundColor: '#FEF9F5',
      navigationBarTextStyle: 'black',
      enablePullDownRefresh: false
    })
  : {
      navigationBarTitleText: '树洞先生',
      navigationBarBackgroundColor: '#FEF9F5',
      navigationBarTextStyle: 'black',
      enablePullDownRefresh: false
    }
