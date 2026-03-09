# AI陪聊小程序设计指南

## 品牌定位

**应用名称**: 树洞先生 / 小暖
**应用定位**: 智能AI陪伴助手，提供温暖、友善的对话体验
**设计风格**: 简约、温暖、治愈、精致
**目标用户**: 需要情感陪伴、倾诉交流的用户

## 配色方案

### 主色板

- **主背景色**: `#FEF9F5` - 柔和的暖白色
- **用户气泡**: `#E6F0DA`（浅豆绿）或 `#F5E6D3`（淡奶茶色）
- **AI气泡**: `#F0F0F0`（极浅灰）或 `#E3EDF5`（雾霾蓝）
- **字体主色**: `#3E3A39` - 深灰色

### 强调色

- **强调色（按钮）**: `#FFB6A0`（珊瑚粉）或 `#B8E0D0`（薄荷绿）
- **渐变色**: 从珊瑚粉 `#FFB6A0` 到淡橘色 `#FFD4B8`

### 中性色

- **边框线**: `#E8E8E8` - 浅灰色
- **时间戳**: `#999999` - 中灰色
- **次要文字**: `#666666`

### 语义色

- **微表情-开心**: ☀️ 太阳黄
- **微表情-低落**: ☔️ 雨天蓝
- **微表情-中性**: ☁️ 云朵灰

## 字体规范

### 字号层级

- **页面标题**: `24px` / `font-medium` (500) - "树洞先生"
- **H1（标题）**: `text-2xl` (24px) - 区块标题
- **Body（正文）**: `text-base` (16px) - 消息内容
- **Caption（辅助）**: `text-sm` (14px) - 时间戳、状态提示
- **Tiny（微小）**: `text-xs` (12px) - 小标签

### 字重

- **页面标题**: `font-medium` (500)
- **正文**: `font-normal` (400)
- **强调**: `font-medium` (500)

## 间距系统

### 页面边距

- **标准边距**: `p-4` (16px)
- **小边距**: `p-3` (12px)
- **大边距**: `p-6` (24px)

### 组件间距

- **消息间距**: `gap-3` (12px)
- **内边距**: `px-4 py-2` (水平16px，垂直8px)
- **垂直间距**: `my-3` (12px)

### 圆角规范

- **聊天气泡**: `rounded-2xl` (16px)
- **按钮**: `rounded-full` (圆形) 或 `rounded-lg` (8px)
- **输入框**: `rounded-full` (圆形)

## 组件规范

### 页面顶部导航

```tsx
<View className="fixed top-0 left-0 right-0 z-50 bg-[#FEF9F5] px-4 py-3 border-b border-[#E8E8E8]">
  <Text className="text-[24px] font-medium text-[#3E3A39] text-center">
    树洞先生
  </Text>
</View>
```

### 消息气泡组件

**用户消息**:
```tsx
<View className="flex justify-end mb-3">
  <View
    className="px-4 py-3 max-w-[75%] rounded-[18px]"
    style={{
      backgroundColor: '#E6F0DA',
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)'
    }}
  >
    <Text className="text-[16px] text-[#3E3A39] block">用户消息内容</Text>
    <Text className="text-[12px] text-[#999999] block mt-1">12:30</Text>
  </View>
</View>
```

**AI消息**:
```tsx
<View className="flex justify-start mb-3 gap-2">
  <View className="self-start">
    <Text className="text-[32px]">☁️</Text>
  </View>
  <View
    className="px-4 py-3 max-w-[75%] rounded-[18px]"
    style={{
      backgroundColor: '#F0F0F0',
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)'
    }}
  >
    <Text className="text-[16px] text-[#3E3A39] block">AI回复内容</Text>
    <Text className="text-[12px] text-[#999999] block mt-1">12:30</Text>
  </View>
</View>
```

### 微表情标识

```tsx
<View className="absolute top-0 right-0">
  <Text className="text-[20px]">☀️</Text>
</View>
```

### 输入框组件

```tsx
<View style={{
  position: 'fixed',
  bottom: 50,
  left: 0,
  right: 0,
  display: 'flex',
  flexDirection: 'row',
  gap: '12px',
  padding: '12px 16px',
  backgroundColor: '#ffffff',
  borderTop: '1px solid #e5e7eb',
  zIndex: 100
}}>
  <View style={{
    flex: 1,
    backgroundColor: '#f3f4f6',
    borderRadius: '24px',
    padding: '10px 16px'
  }}>
    <Textarea
      style={{
        width: '100%',
        minHeight: '40px',
        maxHeight: '120px',
        backgroundColor: 'transparent',
        fontSize: '16px'
      }}
      placeholder="说点什么..."
      placeholderClass="text-gray-400"
      maxlength={500}
      autoHeight
    />
  </View>
  <View style={{ flexShrink: 0 }}>
    <Button className="bg-indigo-500 text-white rounded-full px-6">
      发送
    </Button>
  </View>
</View>
```

### 思考动画组件

```tsx
<View className="flex items-center gap-1 px-4 py-3">
  <View
    className="w-2 h-2 rounded-full"
    style={{
      backgroundColor: '#FFB6A0',
      animation: 'bounce 1s infinite'
    }}
  />
  <View
    className="w-2 h-2 rounded-full"
    style={{
      backgroundColor: '#FFB6A0',
      animation: 'bounce 1s infinite 0.2s'
    }}
  />
  <View
    className="w-2 h-2 rounded-full"
    style={{
      backgroundColor: '#FFB6A0',
      animation: 'bounce 1s infinite 0.4s'
    }}
  />
  <Text className="text-[14px] text-[#999999] block ml-2">
    嗯，我在认真想怎么安慰你...
  </Text>
</View>
```

### 退出关怀弹窗

```tsx
<View className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
  <View
    className="rounded-[24px] p-6 mx-4"
    style={{
      backgroundColor: '#FEF9F5',
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)'
    }}
  >
    <Text className="text-[24px] block mb-3">🌙</Text>
    <Text className="text-[16px] text-[#3E3A39] block mb-2">
      记得照顾好自己
    </Text>
    <Text className="text-[14px] text-[#999999] block">
      明天我还在这里等你
    </Text>
  </View>
</View>
```

### 空状态组件

```tsx
<View className="flex flex-col items-center justify-center h-full py-20">
  <Text className="text-gray-400 text-base">暂无消息，开始聊天吧~</Text>
</View>
```

## 导航结构

**单页应用**: 仅需首页聊天界面，无需 TabBar

**页面配置**:
```typescript
export default definePageConfig({
  navigationBarTitleText: 'AI陪聊助手',
  navigationBarBackgroundColor: '#ffffff',
  navigationBarTextStyle: 'black',
  enablePullDownRefresh: false
})
```

## 跨端兼容性规范

### H5/小程序兼容

1. **Text 组件换行**: 所有垂直排列的 Text 必须添加 `block` 类
2. **Input 组件样式**: 必须用 View 包裹，样式放在 View 上
3. **Fixed + Flex 布局**: 必须使用 inline style
4. **底部输入框**: bottom 设为 50 避开 TabBar

### 消息列表滚动

```tsx
<ScrollView
  className="flex-1 bg-gray-50"
  scrollY
  scrollWithAnimation
  scrollTop={scrollTop}
  style={{ paddingBottom: '80px' }}
>
  {/* 消息内容 */}
</ScrollView>
```

## 交互规范

### 发送状态

- **正常**: 显示发送按钮
- **发送中**: 按钮禁用，显示加载动画
- **输入为空**: 按钮禁用，显示灰色

### 消息状态

- **发送中**: 显示加载动画
- **发送成功**: 显示消息内容
- **发送失败**: 显示错误提示

### 滚动行为

- 收到新消息自动滚动到底部
- 发送消息后自动滚动到底部

## 性能优化

- 消息列表使用虚拟滚动（消息量 > 100 时）
- 图片懒加载
- 防抖处理输入框自动滚动
