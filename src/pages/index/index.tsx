import { View, Text, ScrollView, Textarea } from '@tarojs/components';
import { useState, useRef, useEffect } from 'react';
import Taro from '@tarojs/taro';
import { Network } from '@/network';
import './index.css';

// 消息类型定义
type MessageRole = 'user' | 'assistant';

interface Message {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: number;
  aiMood?: 'happy' | 'sad' | 'neutral';
}

const IndexPage = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [welcomeText, setWelcomeText] = useState('');
  const [showGoodbyeModal, setShowGoodbyeModal] = useState(false);
  const [thinkTip, setThinkTip] = useState('');
  const scrollViewRef = useRef<any>(null);

  // 欢迎语
  const fullWelcomeText = '嘿，我是小暖。今天你的心情是什么颜色？可以随时和我聊聊，我都在。';

  // 思考提示语
  const thinkTips = [
    '嗯，我在认真想怎么安慰你...',
    '你可以先深呼吸一下',
    '我在想，也许可以这样...'
  ];

  // 打字机效果
  useEffect(() => {
    if (messages.length === 0) {
      let index = 0;
      const timer = setInterval(() => {
        if (index < fullWelcomeText.length) {
          setWelcomeText(fullWelcomeText.slice(0, index + 1));
          index++;
        } else {
          clearInterval(timer);
          // 打字机完成后添加到消息列表
          const welcomeMessage: Message = {
            id: 'welcome',
            role: 'assistant',
            content: fullWelcomeText,
            timestamp: Date.now(),
            aiMood: 'neutral'
          };
          setMessages([welcomeMessage]);
        }
      }, 100); // 每100ms显示一个字

      return () => clearInterval(timer);
    }
  }, []);

  // 思考提示轮播
  useEffect(() => {
    if (isLoading && !thinkTip) {
      const timer = setTimeout(() => {
        const randomTip = thinkTips[Math.floor(Math.random() * thinkTips.length)];
        setThinkTip(randomTip);
      }, 2000); // 2秒后显示提示
      return () => clearTimeout(timer);
    } else if (!isLoading) {
      setThinkTip('');
    }
  }, [isLoading, thinkTip]);

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

  // 简单的情感分析（基于关键词）
  const analyzeEmotion = (text: string): 'happy' | 'sad' | 'neutral' => {
    const happyKeywords = ['开心', '高兴', '快乐', '幸福', '喜欢', '爱', '棒', '赞', '笑', '快乐'];
    const sadKeywords = ['难过', '难过', '悲伤', '伤心', '痛苦', '累', '痛苦', '哭', '难受', '不开心', '低落'];

    for (const keyword of happyKeywords) {
      if (text.includes(keyword)) return 'happy';
    }
    for (const keyword of sadKeywords) {
      if (text.includes(keyword)) return 'sad';
    }
    return 'neutral';
  };

  // 获取微表情
  const getMoodEmoji = (mood?: 'happy' | 'sad' | 'neutral') => {
    switch (mood) {
      case 'happy': return '☀️';
      case 'sad': return '☔️';
      default: return '☁️';
    }
  };

  // 发送消息
  const handleSendMessage = async (text?: string) => {
    const messageToSend = text || inputText.trim();
    if (!messageToSend || isLoading) {
      return;
    }

    // 分析用户情绪
    const userEmotion = analyzeEmotion(messageToSend);

    // 添加用户消息
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: messageToSend,
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
          message: messageToSend,
          history: messages.map(msg => ({
            role: msg.role,
            content: msg.content
          }))
        }
      });

      // 解析响应数据
      const aiResponse = response.data?.data?.content || '抱歉，我暂时无法回复，请稍后再试。';

      // 添加AI消息（根据用户情绪设置AI情绪）
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: aiResponse,
        timestamp: Date.now(),
        aiMood: userEmotion
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

  // 快捷短语
  const quickPhrases = [
    { text: '有点难过', emoji: '😔', color: '#FFB6A0' },
    { text: '想被夸夸', emoji: '🥰', color: '#B8E0D0' },
    { text: '睡不着', emoji: '😴', color: '#E3EDF5' }
  ];

  return (
    <View className="flex flex-col h-screen" style={{ backgroundColor: '#FEF9F5' }}>
      {/* 顶部导航 */}
      <View
        className="fixed top-0 left-0 right-0 z-50"
        style={{
          backgroundColor: '#FEF9F5',
          padding: '12px 16px',
          borderBottom: '1px solid #E8E8E8'
        }}
      >
        <Text
          className="text-center"
          style={{
            fontSize: '24px',
            fontWeight: '500',
            color: '#3E3A39'
          }}
        >
          树洞先生
        </Text>
      </View>

      {/* 消息列表 */}
      <ScrollView
        ref={scrollViewRef}
        className="flex-1"
        scrollY
        scrollWithAnimation
        style={{
          paddingTop: '60px',
          paddingBottom: '240px'
        }}
      >
        <View style={{ padding: '16px' }}>
          {/* 显示打字机效果中的欢迎语 */}
          {messages.length === 0 && welcomeText && (
            <View className="flex justify-start mb-3">
              <View className="self-start" style={{ marginRight: '8px' }}>
                <Text style={{ fontSize: '32px' }}>☁️</Text>
              </View>
              <View
                style={{
                  padding: '12px 16px',
                  maxWidth: '75%',
                  borderRadius: '18px',
                  backgroundColor: '#F0F0F0',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)'
                }}
              >
                <Text
                  className="block"
                  style={{
                    fontSize: '16px',
                    color: '#3E3A39',
                    lineHeight: '24px'
                  }}
                >
                  {welcomeText}
                </Text>
              </View>
            </View>
          )}

          {messages.map((message) => (
            <View
              key={message.id}
              className={`flex mb-3 ${
                message.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              {/* AI消息显示头像 */}
              {message.role === 'assistant' && (
                <View className="self-start" style={{ marginRight: '8px' }}>
                  <Text style={{ fontSize: '32px' }}>{getMoodEmoji(message.aiMood)}</Text>
                </View>
              )}

              {/* 消息气泡 */}
              <View
                style={{
                  padding: '12px 16px',
                  maxWidth: '75%',
                  borderRadius: '18px',
                  backgroundColor: message.role === 'user' ? '#E6F0DA' : '#F0F0F0',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)'
                }}
              >
                <Text
                  className="block"
                  style={{
                    fontSize: '16px',
                    color: '#3E3A39',
                    lineHeight: '24px'
                  }}
                >
                  {message.content}
                </Text>
                <Text
                  className="block"
                  style={{
                    fontSize: '12px',
                    color: '#999999',
                    marginTop: '4px'
                  }}
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
              <View className="self-start" style={{ marginRight: '8px' }}>
                <Text style={{ fontSize: '32px' }}>☁️</Text>
              </View>
              <View
                style={{
                  padding: '12px 16px',
                  backgroundColor: '#F0F0F0',
                  borderRadius: '18px',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)'
                }}
              >
                <View style={{ display: 'flex', flexDirection: 'row', gap: '4px', alignItems: 'center' }}>
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
                  {thinkTip && (
                    <Text
                      className="block"
                      style={{
                        fontSize: '14px',
                        color: '#999999',
                        marginLeft: '8px'
                      }}
                    >
                      {thinkTip}
                    </Text>
                  )}
                </View>
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      {/* 输入区域 */}
      <View
        style={{
          position: 'fixed',
          bottom: 50,
          left: 0,
          right: 0,
          backgroundColor: '#FEF9F5',
          padding: '12px 16px',
          borderTop: '1px solid #E8E8E8',
          zIndex: 100
        }}
      >
        {/* 快捷短语 */}
        <View
          style={{
            display: 'flex',
            flexDirection: 'row',
            justifyContent: 'center',
            gap: '12px',
            marginBottom: '12px'
          }}
        >
          {quickPhrases.map((phrase, index) => (
            <View
              key={index}
              className="px-4 py-2 rounded-full"
              style={{
                backgroundColor: phrase.color,
                boxShadow: `0 2px 4px ${phrase.color}4D`
              }}
              onClick={() => handleSendMessage(phrase.text)}
            >
              <Text
                className="block"
                style={{
                  fontSize: '14px',
                  color: phrase.color === '#E3EDF5' ? '#3E3A39' : '#ffffff'
                }}
              >
                {phrase.emoji} {phrase.text}
              </Text>
            </View>
          ))}
        </View>

        {/* 输入框和发送按钮 */}
        <View
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '30px',
            borderWidth: '1px',
            borderColor: '#E8E8E8',
            padding: '10px 16px',
            display: 'flex',
            flexDirection: 'row',
            gap: '12px',
            alignItems: 'center'
          }}
        >
          <Textarea
            style={{
              flex: 1,
              minHeight: '40px',
              maxHeight: '120px',
              backgroundColor: 'transparent',
              fontSize: '16px',
              color: '#3E3A39'
            }}
            placeholder="说点什么..."
            placeholderClass="text-[#999999]"
            value={inputText}
            onInput={(e) => setInputText(e.detail.value)}
            maxlength={500}
            autoHeight
            showConfirmBar={false}
            cursorSpacing={10}
          />
        </View>

        {/* 发送按钮 */}
        <View
          className="mt-3"
          style={{
            background: 'linear-gradient(135deg, #FFB6A0 0%, #FFD4B8 100%)',
            borderRadius: '30px',
            padding: '10px 24px',
            alignSelf: 'center',
            opacity: (!inputText.trim() || isLoading) ? 0.6 : 1,
            transform: (!inputText.trim() || isLoading) ? 'scale(1)' : 'scale(1)',
            transition: 'transform 0.2s ease'
          }}
          onClick={() => inputText.trim() && !isLoading && handleSendMessage()}
        >
          <Text
            className="block"
            style={{
              fontSize: '16px',
              fontWeight: '500',
              color: '#ffffff'
            }}
          >
            {isLoading ? '发送中' : '发送'}
          </Text>
        </View>
      </View>

      {/* 退出关怀弹窗 */}
      {showGoodbyeModal && (
        <View
          className="fixed inset-0 flex items-center justify-center"
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 200
          }}
          onClick={() => setShowGoodbyeModal(false)}
        >
          <View
            style={{
              backgroundColor: '#FEF9F5',
              borderRadius: '24px',
              padding: '24px',
              margin: '16px',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)'
            }}
          >
            <Text className="block" style={{ fontSize: '24px', marginBottom: '12px' }}>🌙</Text>
            <Text
              className="block"
              style={{
                fontSize: '16px',
                color: '#3E3A39',
                marginBottom: '8px',
                fontWeight: '500'
              }}
            >
              记得照顾好自己
            </Text>
            <Text
              className="block"
              style={{
                fontSize: '14px',
                color: '#999999'
              }}
            >
              明天我还在这里等你
            </Text>
          </View>
        </View>
      )}
    </View>
  );
};

export default IndexPage;
