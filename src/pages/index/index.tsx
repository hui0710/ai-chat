import { View, Text, ScrollView, Textarea, Button } from '@tarojs/components';
import { useState, useRef, useEffect } from 'react';
import Taro from '@tarojs/taro';
import { Network } from '@/network';
import { Send } from 'lucide-react-taro';
import './index.css';

// 消息类型定义
type MessageRole = 'user' | 'assistant';

interface Message {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: number;
}

const IndexPage = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollViewRef = useRef<any>(null);

  // 滚动到底部
  const scrollToBottom = () => {
    setTimeout(() => {
      if (scrollViewRef.current) {
        scrollViewRef.current.scrollTo({
          scrollTop: 999999,
          duration: 300
        });
      }
    }, 100);
  };

  // 发送消息
  const handleSendMessage = async () => {
    const trimmedText = inputText.trim();
    if (!trimmedText || isLoading) {
      return;
    }

    // 添加用户消息
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: trimmedText,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    try {
      // 调用后端API
      const response = await Network.request({
        url: '/api/chat',
        method: 'POST',
        data: {
          message: trimmedText,
          history: messages.map(msg => ({
            role: msg.role,
            content: msg.content
          }))
        }
      });

      // 解析响应数据（注意嵌套结构）
      const aiResponse = response.data?.data?.content || '抱歉，我暂时无法回复，请稍后再试。';

      // 添加AI消息
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: aiResponse,
        timestamp: Date.now()
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('发送消息失败:', error);
      Taro.showToast({
        title: '发送失败，请重试',
        icon: 'none'
      });
    } finally {
      setIsLoading(false);
      scrollToBottom();
    }
  };

  // 监听消息变化，自动滚动
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 初始欢迎消息
  useEffect(() => {
    if (messages.length === 0) {
      const welcomeMessage: Message = {
        id: 'welcome',
        role: 'assistant',
        content: '你好呀！我是你的AI陪聊助手~ 无论你想聊什么，我都在这里陪着你。想和我分享什么呢？',
        timestamp: Date.now()
      };
      setMessages([welcomeMessage]);
    }
  }, []);

  return (
    <View className="flex flex-col h-screen bg-gray-50">
      {/* 消息列表 */}
      <ScrollView
        ref={scrollViewRef}
        className="flex-1"
        scrollY
        scrollWithAnimation
        style={{ paddingBottom: '130px' }}
      >
        <View className="px-4 py-4">
          {messages.map((message) => (
            <View
              key={message.id}
              className={`flex mb-3 ${
                message.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              <View
                className={`px-4 py-3 max-w-[75%] rounded-2xl ${
                  message.role === 'user'
                    ? 'bg-indigo-500 rounded-br-sm'
                    : 'bg-gray-100 rounded-bl-sm'
                }`}
              >
                <Text
                  className={`block text-base ${
                    message.role === 'user' ? 'text-white' : 'text-gray-800'
                  }`}
                >
                  {message.content}
                </Text>
                <Text
                  className={`block text-xs mt-1 ${
                    message.role === 'user' ? 'text-indigo-200' : 'text-gray-400'
                  }`}
                >
                  {new Date(message.timestamp).toLocaleTimeString('zh-CN', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </Text>
              </View>
            </View>
          ))}

          {/* AI 正在输入状态 */}
          {isLoading && (
            <View className="flex justify-start mb-3">
              <View className="bg-gray-100 rounded-2xl rounded-bl-sm px-4 py-3">
                <View className="flex gap-1">
                  <View className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" />
                  <View className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
                  <View className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }} />
                </View>
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      {/* 输入框区域 */}
      <View
        style={{
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
        }}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: '#f3f4f6',
            borderRadius: '24px',
            padding: '10px 16px'
          }}
        >
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
            value={inputText}
            onInput={(e) => setInputText(e.detail.value)}
            maxlength={500}
            autoHeight
            showConfirmBar={false}
            cursorSpacing={10}
          />
        </View>
        <View style={{ flexShrink: 0, alignSelf: 'center' }}>
          <Button
            className={`rounded-full px-5 py-2 text-base font-medium ${
              inputText.trim() && !isLoading
                ? 'bg-indigo-500 text-white'
                : 'bg-gray-300 text-gray-500'
            }`}
            onClick={handleSendMessage}
            disabled={!inputText.trim() || isLoading}
          >
            {isLoading ? (
              <Text className="block text-white">发送中</Text>
            ) : (
              <View className="flex items-center gap-1">
                <Send size={18} color={inputText.trim() ? '#ffffff' : '#9ca3af'} />
                <Text className="block">发送</Text>
              </View>
            )}
          </Button>
        </View>
      </View>
    </View>
  );
};

export default IndexPage;
