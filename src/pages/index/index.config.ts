export default typeof definePageConfig === "function"
  ? definePageConfig({
      navigationBarTitleText: "浅草心情",
      navigationBarBackgroundColor: "#FEF9F5",
      navigationBarTextStyle: "black",
      enablePullDownRefresh: false,
      enableShareAppMessage: true,
      enableShareTimeline: true,
    })
  : {
      navigationBarTitleText: "浅草心情",
      navigationBarBackgroundColor: "#FEF9F5",
      navigationBarTextStyle: "black",
      enablePullDownRefresh: false,
      enableShareAppMessage: true,
      enableShareTimeline: true,
    };
