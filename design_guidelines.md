# AI陪聊小程序设计指南

## 品牌定位

**应用定位**: 智能AI陪伴助手，提供温暖、友善的对话体验
**设计风格**: 简约、温暖、亲和
**目标用户**: 需要情感陪伴、倾诉交流的用户

## 配色方案

### 主色板

- **主色调（用户消息）**: `bg-indigo-500` (#6366f1) - 温暖的紫色，代表关爱与陪伴
- **辅色调（AI消息）**: `bg-gray-100` (#f3f4f6) - 柔和的灰色，突出AI角色
- **强调色（按钮）**: `bg-indigo-500` (#6366f1) - 与主色统一

### 中性色

- **页面背景**: `bg-gray-50` (#f9fafb)
- **卡片背景**: `bg-white` (#ffffff)
- **边框线**: `border-gray-200` (#e5e7eb)

### 语义色

- **成功**: `text-green-600` (#16a34a)
- **错误**: `text-red-600` (#dc2626)
- **警告**: `text-yellow-600` (#ca8a04)

## 字体规范

### 字号层级

- **H1（标题）**: `text-2xl` (24px) - 页面标题
- **H2（副标题）**: `text-xl` (20px) - 区块标题
- **Body（正文）**: `text-base` (16px) - 消息内容
- **Caption（辅助）**: `text-sm` (14px) - 时间戳、状态提示
- **Tiny（微小）**: `text-xs` (12px) - 小标签

### 字重

- **标题**: `font-bold` (700)
- **强调**: `font-semibold` (600)
- **正文**: `font-normal` (400)

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

### 消息气泡组件

**用户消息**:
```tsx
<View className="flex justify-end mb-3">
  <View className="bg-indigo-500 rounded-2xl rounded-br-sm px-4 py-3 max-w-[75%]">
    <Text className="text-white text-base">用户消息内容</Text>
  </View>
</View>
```

**AI消息**:
```tsx
<View className="flex justify-start mb-3">
  <View className="bg-gray-100 rounded-2xl rounded-bl-sm px-4 py-3 max-w-[75%]">
    <Text className="text-gray-800 text-base">AI回复内容</Text>
  </View>
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

### 按钮样式规范

**主按钮**:
```tsx
<Button className="bg-indigo-500 text-white rounded-full px-6 py-2.5 text-base font-medium">
  发送
</Button>
```

**禁用态**:
```tsx
<Button className="bg-gray-300 text-gray-500 rounded-full px-6 py-2.5 text-base" disabled>
  发送
</Button>
```

### 加载状态组件

```tsx
<View className="flex justify-center items-center py-4">
  <View className="flex gap-1">
    <View className="w-2 h-2 bg-indigo-400 rounded-full animate-pulse" />
    <View className="w-2 h-2 bg-indigo-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
    <View className="w-2 h-2 bg-indigo-400 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }} />
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
