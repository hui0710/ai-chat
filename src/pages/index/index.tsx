import { View, Text, ScrollView, Textarea } from '@tarojs/components';
import { useState, useEffect } from 'react';
import Taro from '@tarojs/taro';
import { Network } from '@/network';
import { Send, Mic } from 'lucide-react-taro';
import './index.css';

// 消息类型定义
type MessageRole = 'user' | 'assistant';

interface Message {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: number;
  aiMood?: 'happy' | 'sad' | 'neutral';
  showTimestamp?: boolean;
}

// 每日治愈文案
const dailyQuotes = [
  '今天你愿意和我分享一朵云的心事吗？',
  '无论今天过得如何，你都值得被温柔以待',
  '即使只是微小的进步，也值得庆祝',
  '累了就停下来，我陪你看会儿云',
  '你的每一份努力，都在悄悄发光'
];

// 情绪短语
const emotionPhrases = [
  { text: '今天有点烦', emoji: '😔', color: '#FFB6A0' },
  { text: '想被夸夸', emoji: '🥰', color: '#B8E0D0' },
  { text: '睡不着', emoji: '😴', color: '#E3EDF5' },
  { text: '好开心', emoji: '😊', color: '#FFE4B5' },
  { text: '有点累', emoji: '😮‍💨', color: '#D3D3D3' }
];

// AI思考提示
const thinkingTips = [
  '小暖正在想怎么安慰你...',
  '让我抱抱你...',
  '我在认真听你说...',
  '嗯，让我想想...'
];

const IndexPage = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [welcomeText, setWelcomeText] = useState('');
  const [showGoodbyeModal, setShowGoodbyeModal] = useState(false);
  const [showDailyQuote, setShowDailyQuote] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [currentQuote, setCurrentQuote] = useState('');
  const [thinkTip, setThinkTip] = useState('');
  const [scrollTop, setScrollTop] = useState(0);

  // 初始化：加载缓存、显示每日文案、显示指引
  useEffect(() => {
    // 加载缓存的对话
    loadCachedMessages();

    // 显示每日治愈文案
    const savedDate = Taro.getStorageSync('quoteDate');
    const today = new Date().toDateString();
    if (savedDate !== today) {
      const randomQuote = dailyQuotes[Math.floor(Math.random() * dailyQuotes.length)];
      setCurrentQuote(randomQuote);
      setShowDailyQuote(true);
      Taro.setStorageSync('quoteDate', today);
    }

    // 首次打开显示指引
    const hasShownGuide = Taro.getStorageSync('hasShownGuide');
    if (!hasShownGuide) {
      setShowGuide(true);
    }

    // 1秒后开始打字机欢迎语
    setTimeout(() => {
      startTypewriterWelcome();
    }, 1000);
  }, []);

  // 打字机欢迎语
  const startTypewriterWelcome = () => {
    const fullWelcomeText = '嘿，我是小暖。今天你的心情是什么颜色？可以随时和我聊聊，我都在。';
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
          aiMood: 'neutral',
          showTimestamp: true
        };
        setMessages([welcomeMessage]);
        saveMessages([welcomeMessage]);
      }
    }, 100);
  };

  // 加载缓存的对话
  const loadCachedMessages = () => {
    try {
      const cached = Taro.getStorageSync('chatMessages');
      if (cached && cached.length > 0) {
        setMessages(cached);
      }
    } catch (error) {
      console.error('加载缓存失败:', error);
    }
  };

  // 保存消息到缓存
  const saveMessages = (msgs: Message[]) => {
    try {
      // 只保存最近50条
      const toSave = msgs.slice(-50);
      Taro.setStorageSync('chatMessages', toSave);
    } catch (error) {
      console.error('保存消息失败:', error);
    }
  };

  // 思考提示轮播
  useEffect(() => {
    if (isLoading && !thinkTip) {
      const timer = setTimeout(() => {
        const randomTip = thinkingTips[Math.floor(Math.random() * thinkingTips.length)];
        setThinkTip(randomTip);
      }, 1500);
      return () => clearTimeout(timer);
    } else if (!isLoading) {
      setThinkTip('');
    }
  }, [isLoading, thinkTip]);

  // 滚动到底部
  const scrollToBottom = () => {
    setTimeout(() => {
      setScrollTop(prev => prev === 99999 ? 99998 : 99999);
    }, 100);
  };

  // 思考提示轮播
  const handleTapBlank = () => {
    Taro.hideKeyboard();
  };

  // 简单的情感分析
  const analyzeEmotion = (text: string): 'happy' | 'sad' | 'neutral' => {
    const happyKeywords = ['开心', '高兴', '快乐', '幸福', '喜欢', '爱', '棒', '赞', '笑'];
    const sadKeywords = ['难过', '悲伤', '伤心', '痛苦', '累', '痛苦', '哭', '难受', '不开心', '低落'];

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
      case 'happy': return '😊';
      case 'sad': return '😢';
      default: return '😴';
    }
  };

  // 获取AI回复的情感标签
  const getAILabel = (content: string) => {
    if (content.includes('抱抱') || content.includes('安慰') || content.includes('理解')) return '💕';
    if (content.includes('开心') || content.includes('恭喜') || content.includes('棒')) return '⭐';
    return '❤️';
  };

  // 判断是否显示时间戳
  const shouldShowTimestamp = (currentMessage: Message, prevMessage?: Message) => {
    if (!prevMessage) return true;
    const timeDiff = currentMessage.timestamp - prevMessage.timestamp;
    return timeDiff >= 3 * 60 * 1000; // 3分钟
  };

  // 发送消息
  const handleSendMessage = async (text?: string) => {
    const messageToSend = text || inputText.trim();
    if (!messageToSend || isLoading) {
      return;
    }

    const userEmotion = analyzeEmotion(messageToSend);

    // 添加用户消息
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: messageToSend,
      timestamp: Date.now(),
      showTimestamp: shouldShowTimestamp(
        { id: '', role: 'user', content: messageToSend, timestamp: Date.now() },
        messages[messages.length - 1]
      )
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInputText('');
    setIsLoading(true);

    try {
      const chatHistory = newMessages.slice(-6).map(m => ({
        role: m.role,
        content: m.content
      }));
      const response = await Network.chat(messageToSend, chatHistory);
      const aiResponse = response.content || '抱歉，我暂时无法回复，请稍后再试。';

      // 添加AI消息
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: aiResponse,
        timestamp: Date.now(),
        aiMood: userEmotion,
        showTimestamp: shouldShowTimestamp(
          { id: '', role: 'assistant', content: aiResponse, timestamp: Date.now() },
          userMessage
        )
      };

      const updatedMessages = [...newMessages, aiMessage];
      setMessages(updatedMessages);
      saveMessages(updatedMessages);
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

  // 麦克风点击事件
  const handleMicClick = () => {
    Taro.showToast({
      title: '语音功能即将上线',
      icon: 'none',
      duration: 2000
    });
  };

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
          树洞先生11111
        </Text>
      </View>

      {/* 消息列表 */}
      <View
        className="flex-1"
        style={{
          backgroundColor: '#FEF9F5',
          paddingTop: '60px',
          paddingBottom: '240px',
          minHeight: '100vh'
        }}
      >
        <ScrollView
          scrollY
          scrollWithAnimation
          scrollTop={scrollTop}
          onClick={handleTapBlank}
          style={{
            height: '100%',
            backgroundColor: '#FEF9F5'
          }}
        >
        <View style={{ padding: '16px' }}>
          {/* 打字机欢迎语 */}
          {messages.length === 0 && welcomeText && (
            <View className="flex justify-start mb-3">
              <View className="self-start" style={{ marginRight: '8px' }}>
                <Text style={{ fontSize: '32px' }}>😴</Text>
              </View>
              <View
                style={{
                  padding: '12px 16px',
                  maxWidth: '75%',
                  borderRadius: '18px 18px 18px 4px',
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

          {/* 消息列表 */}
          {messages.map((message) => (
            <View
              key={message.id}
              id={`msg-${message.id}`}
              className={`flex mb-3 ${
                message.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              {/* AI消息显示头像和情绪图标 */}
              {message.role === 'assistant' && (
                <View style={{ display: 'flex', flexDirection: 'column', marginRight: '8px', alignItems: 'center' }}>
                  <Text style={{ fontSize: '32px' }}>{getMoodEmoji(message.aiMood)}</Text>
                </View>
              )}

              {/* 消息气泡 */}
              <View
                style={{
                  padding: '12px 16px',
                  maxWidth: '75%',
                  borderRadius: message.role === 'user'
                    ? '18px 18px 4px 18px'
                    : '18px 18px 18px 4px',
                  backgroundColor: message.role === 'user' ? '#E6F0DA' : '#F0F0F0',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)'
                }}
              >
                {/* AI情感标签 */}
                {message.role === 'assistant' && (
                  <View style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
                    <Text style={{ fontSize: '14px', marginRight: '4px' }}>{getAILabel(message.content)}</Text>
                    <Text style={{ fontSize: '12px', color: '#999999' }}>小暖</Text>
                  </View>
                )}

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

                {/* 时间戳 */}
                {message.showTimestamp && (
                  <Text
                    className="block"
                    style={{
                      fontSize: '12px',
                      color: '#999999',
                      marginTop: '6px'
                    }}
                  >
                    {new Date(message.timestamp).toLocaleTimeString('zh-CN', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </Text>
                )}
              </View>
            </View>
          ))}

          {/* AI 思考状态 */}
          {isLoading && (
            <View id="msg-loading" className="flex justify-start mb-3">
              <View className="self-start" style={{ marginRight: '8px' }}>
                <Text style={{ fontSize: '32px' }}>😴</Text>
              </View>
              <View
                style={{
                  padding: '12px 16px',
                  backgroundColor: '#F0F0F0',
                  borderRadius: '18px 18px 18px 4px',
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
      </View>

      {/* 输入区域 */}
      <View
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: '#FEF9F5',
          padding: '8px 16px 16px',
          borderTop: '1px solid #E8E8E8',
          zIndex: 100
        }}
      >
        {/* 情绪短语卡片（水平滚动） */}
        <ScrollView
          scrollX
          className="mb-3"
          style={{
            whiteSpace: 'nowrap',
            padding: '4px 0'
          }}
        >
          <View style={{ display: 'flex', flexDirection: 'row', gap: '12px' }}>
            {emotionPhrases.map((phrase, index) => (
              <View
                key={index}
                className="px-4 py-2 rounded-full"
                style={{
                  backgroundColor: phrase.color,
                  boxShadow: `0 2px 4px ${phrase.color}4D`,
                  display: 'inline-block'
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
        </ScrollView>

        {/* 输入框 */}
        <View
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '24px',
            borderWidth: '1px',
            borderColor: '#E8E8E8',
            padding: '8px 12px',
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center'
          }}
        >
          {/* 麦克风图标 */}
          <View
            style={{
              width: '36px',
              height: '36px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
            onClick={handleMicClick}
          >
            <Mic size={20} color="#999999" />
          </View>

          {/* 输入框 */}
          <View style={{ flex: 1, minHeight: '36px', display: 'flex', alignItems: 'center' }}>
            <Textarea
              style={{
                width: '100%',
                minHeight: '36px',
                maxHeight: '120px',
                backgroundColor: 'transparent',
                fontSize: '16px',
                color: '#3E3A39',
                lineHeight: '24px'
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
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '18px',
              backgroundColor: (!inputText.trim() || isLoading) ? '#E8E8E8' : '#FFB6A0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
            onClick={() => inputText.trim() && !isLoading && handleSendMessage()}
          >
            <Send
              size={18}
              color={(!inputText.trim() || isLoading) ? '#999999' : '#ffffff'}
            />
          </View>
        </View>
      </View>

      {/* 每日治愈文案弹窗 */}
      {showDailyQuote && (
        <View
          className="fixed inset-0 flex items-center justify-center"
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 200
          }}
          onClick={() => {
            setShowDailyQuote(false);
            if (showGuide) {
              setShowGuide(true);
            }
          }}
        >
          <View
            style={{
              backgroundColor: '#FEF9F5',
              borderRadius: '24px',
              padding: '24px',
              margin: '16px',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
              maxWidth: '300px'
            }}
          >
            <Text className="text-[24px] block mb-3 text-center">☁️</Text>
            <Text
              className="block text-center"
              style={{
                fontSize: '16px',
                color: '#3E3A39',
                marginBottom: '16px',
                lineHeight: '24px'
              }}
            >
              {currentQuote}
            </Text>
            <Text
              className="block text-center"
              style={{
                fontSize: '14px',
                color: '#999999'
              }}
            >
              点击继续
            </Text>
          </View>
        </View>
      )}

      {/* 首次蒙层指引 */}
      {showGuide && (
        <View
          className="fixed inset-0 flex items-center justify-center"
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            zIndex: 300
          }}
          onClick={() => {
            setShowGuide(false);
            Taro.setStorageSync('hasShownGuide', true);
          }}
        >
          <View
            style={{
              backgroundColor: '#FEF9F5',
              borderRadius: '24px',
              padding: '24px',
              margin: '16px',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
              maxWidth: '320px'
            }}
          >
            <Text className="text-[32px] block mb-3 text-center">👋</Text>
            <Text
              className="block text-center"
              style={{
                fontSize: '18px',
                color: '#3E3A39',
                marginBottom: '12px',
                fontWeight: '500'
              }}
            >
              欢迎来到树洞先生
            </Text>
            <Text
              className="block text-center"
              style={{
                fontSize: '14px',
                color: '#666666',
                marginBottom: '8px',
                lineHeight: '20px'
              }}
            >
              你可以和我聊任何心事
            </Text>
            <Text
              className="block text-center"
              style={{
                fontSize: '14px',
                color: '#666666',
                marginBottom: '16px',
                lineHeight: '20px'
              }}
            >
              点击下方按钮快速表达情绪
            </Text>
            <Text
              className="block text-center"
              style={{
                fontSize: '14px',
                color: '#999999'
              }}
            >
              点击任意处开始
            </Text>
          </View>
        </View>
      )}

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
            <Text className="text-[24px] block mb-3">🌙</Text>
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
