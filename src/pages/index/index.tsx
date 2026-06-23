import { View, Text, ScrollView, Textarea, Button } from "@tarojs/components";
import { useState, useEffect } from "react";
import Taro from "@tarojs/taro";
import { Network } from "@/network";
import { Send, Mic, Share2 } from "lucide-react-taro";
import {
  WELCOME_MESSAGE,
  DAILY_QUOTES,
  EMOTION_PHRASES,
  THINKING_TIPS,
  HOME_HEADER_TITLE,
  INPUT_PLACEHOLDER,
  AI_ERROR_FALLBACK_MESSAGE,
  COMFORT_PHRASES,
  VOICE_FEATURE_TIP,
  GUIDE_WELCOME_TITLE,
  GUIDE_WELCOME_DESC,
  GUIDE_ACTION_HINT,
  GUIDE_CLOSE_HINT,
  DAILY_QUOTE_CONTINUE_TEXT,
  GOODBYE_TITLE,
  GOODBYE_SUBTITLE,
  AI_NAME,
  SHARE_TIP_WORDS,
} from "../../../config/ai.config";
import {
  QUOTA_CONFIG,
  SHARE_CONFIG,
  getRemainingQuota,
  hasQuota,
  getShareCount,
  getShareConfig,
  consumeTotalQuota,
  fetchCloudQuota,
  syncQuotaFromCloud,
  claimShareBonusCloud,
  updateLocalQuotaFromResponse,
} from "../../utils/quota";
import { getComfortReply, getForceLocalReply } from "../../utils/emotion-engine";
import "./index.css";

// 消息类型定义
type MessageRole = "user" | "assistant";

interface Message {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: number;
  aiMood?: "happy" | "sad" | "neutral";
  showTimestamp?: boolean;
}

const IndexPage = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [welcomeText, setWelcomeText] = useState("");
  const [showGoodbyeModal, setShowGoodbyeModal] = useState(false);
  const [showDailyQuote, setShowDailyQuote] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [currentQuote, setCurrentQuote] = useState("");
  const [thinkTip, setThinkTip] = useState("");
  const [scrollTop, setScrollTop] = useState(0);
  const [remainingQuota, setRemainingQuota] = useState(0);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareCount, setShareCount] = useState(0);
  const [userOpenid, setUserOpenid] = useState("");

  // 初始化：加载缓存、显示每日文案、显示指引
  useEffect(() => {
    // 开启分享菜单（包含朋友圈分享）
    if (Taro.getEnv() === Taro.ENV_TYPE.WEAPP) {
      Taro.showShareMenu({
        withShareTicket: true,
        menus: ["shareAppMessage", "shareTimeline"],
      } as any);
    }

    // 加载缓存的对话
    loadCachedMessages();

    // 刷新额度显示（本地兜底）
    setRemainingQuota(getRemainingQuota());
    setShareCount(getShareCount());

    // 获取当前用户 openid（用于分享路径）
    Network.getOpenid().then((data) => {
      if (data?.openid) {
        setUserOpenid(data.openid);
        console.log("[Share] 当前用户 openid:", data.openid);
      }
    });

    // 异步云端同步
    fetchCloudQuota().then((cloudData) => {
      if (cloudData) {
        syncQuotaFromCloud(cloudData);
        setRemainingQuota(cloudData.remaining);
        setShareCount(cloudData.shareCount);
      }
    });

    // 检查是否是通过分享链接进入的
    const router = Taro.getCurrentPages();
    const currentPage = router[router.length - 1];
    const options = currentPage.options || {};

    if (options.shared === "true" && options.from) {
      // 被分享者进入：云端按分享者去重领取
      claimShareBonusCloud("receive", options.from).then((ok) => {
        if (ok) {
          Taro.showToast({
            title: `好友邀请你获得 ${SHARE_CONFIG.BONUS_COUNT} 次额外聊天机会！`,
            icon: "success",
            duration: 2500,
          });
          fetchCloudQuota().then((data) => {
            if (data) {
              syncQuotaFromCloud(data);
              setRemainingQuota(data.remaining);
              setShareCount(data.shareCount);
            }
          });
        }
      });
    }

    // 显示每日治愈文案
    const savedDate = Taro.getStorageSync("quoteDate");
    const today = new Date().toDateString();
    if (savedDate !== today) {
      const randomQuote =
        DAILY_QUOTES[Math.floor(Math.random() * DAILY_QUOTES.length)];
      setCurrentQuote(randomQuote);
      setShowDailyQuote(true);
      Taro.setStorageSync("quoteDate", today);
    }

    // 首次打开显示指引
    const hasShownGuide = Taro.getStorageSync("hasShownGuide");
    if (!hasShownGuide) {
      setShowGuide(true);
    }

    // 1秒后开始打字机欢迎语
    setTimeout(() => {
      startTypewriterWelcome();
    }, 1000);
  }, []);

  // 点击分享 → 直接领取奖励
  const doClaimShareBonus = () => {
    claimShareBonusCloud("share").then((ok) => {
      if (ok) {
        setShowShareModal(false);
        const shareConfig = getShareConfig();
        Taro.showToast({
          title: `分享成功！获得 ${shareConfig.BONUS_COUNT} 次额外聊天机会`,
          icon: "success",
          duration: 2000,
        });
      }
      // 无论成功与否都刷新额度
      fetchCloudQuota().then((data) => {
        if (data) {
          syncQuotaFromCloud(data);
          setRemainingQuota(data.remaining);
          setShareCount(data.shareCount);
        }
      });
    }).catch((err) => {
      console.error("[Share] claimShareBonusCloud 异常:", err);
    });
  };

  // 每次回到前台同步额度
  useEffect(() => {
    if (Taro.getEnv() !== Taro.ENV_TYPE.WEAPP) return;
    const handleAppShow = () => {
      fetchCloudQuota().then((cloudData) => {
        if (cloudData) {
          syncQuotaFromCloud(cloudData);
          setRemainingQuota(cloudData.remaining);
          setShareCount(cloudData.shareCount);
        }
      });
    };
    Taro.onAppShow(handleAppShow);
    return () => Taro.offAppShow(handleAppShow);
  }, []);

  // 打字机欢迎语
  const startTypewriterWelcome = () => {
    const fullWelcomeText = WELCOME_MESSAGE;
    let index = 0;
    const timer = setInterval(() => {
      if (index < fullWelcomeText.length) {
        setWelcomeText(fullWelcomeText.slice(0, index + 1));
        index++;
      } else {
        clearInterval(timer);
        // 打字机完成后添加到消息列表
        const welcomeMessage: Message = {
          id: "welcome",
          role: "assistant",
          content: fullWelcomeText,
          timestamp: Date.now(),
          aiMood: "neutral",
          showTimestamp: true,
        };
        setMessages([welcomeMessage]);
        saveMessages([welcomeMessage]);
      }
    }, 100);
  };

  // 加载缓存的对话
  const loadCachedMessages = () => {
    try {
      const cached = Taro.getStorageSync("chatMessages");
      if (cached && cached.length > 0) {
        setMessages(cached);
      }
    } catch (error) {
      console.error("加载缓存失败:", error);
    }
  };

  // 保存消息到缓存
  const saveMessages = (msgs: Message[]) => {
    try {
      // 只保存最近50条
      const toSave = msgs.slice(-50);
      Taro.setStorageSync("chatMessages", toSave);
    } catch (error) {
      console.error("保存消息失败:", error);
    }
  };

  // 思考提示轮播
  useEffect(() => {
    if (isLoading && !thinkTip) {
      const timer = setTimeout(() => {
        const randomTip =
          THINKING_TIPS[Math.floor(Math.random() * THINKING_TIPS.length)];
        setThinkTip(randomTip);
      }, 1500);
      return () => clearTimeout(timer);
    } else if (!isLoading) {
      setThinkTip("");
    }
  }, [isLoading, thinkTip]);

  // 滚动到底部
  const scrollToBottom = () => {
    setTimeout(() => {
      setScrollTop((prev) => (prev === 99999 ? 99998 : 99999));
    }, 100);
  };

  // 思考提示轮播
  const handleTapBlank = () => {
    Taro.hideKeyboard();
  };

  // 简单的情感分析
  const analyzeEmotion = (text: string): "happy" | "sad" | "neutral" => {
    const happyKeywords = [
      "开心",
      "高兴",
      "快乐",
      "幸福",
      "喜欢",
      "爱",
      "棒",
      "赞",
      "笑",
    ];
    const sadKeywords = [
      "难过",
      "悲伤",
      "伤心",
      "痛苦",
      "累",
      "痛苦",
      "哭",
      "难受",
      "不开心",
      "低落",
    ];

    for (const keyword of happyKeywords) {
      if (text.includes(keyword)) return "happy";
    }
    for (const keyword of sadKeywords) {
      if (text.includes(keyword)) return "sad";
    }
    return "neutral";
  };

  // 获取微表情
  const getMoodEmoji = (mood?: "happy" | "sad" | "neutral") => {
    switch (mood) {
      case "happy":
        return "😊";
      case "sad":
        return "😢";
      default:
        return "😴";
    }
  };

  // 获取AI回复的情感标签
  const getAILabel = (content: string) => {
    if (
      content.includes("抱抱") ||
      content.includes("安慰") ||
      content.includes("理解")
    )
      return "💕";
    if (
      content.includes("开心") ||
      content.includes("恭喜") ||
      content.includes("棒")
    )
      return "⭐";
    return "❤️";
  };

  // 判断是否显示时间戳
  const shouldShowTimestamp = (
    currentMessage: Message,
    prevMessage?: Message,
  ) => {
    if (!prevMessage) return true;
    const timeDiff = currentMessage.timestamp - prevMessage.timestamp;
    return timeDiff >= 3 * 60 * 1000; // 3分钟
  };

  // 发送消息
  const handleSendMessage = async (text?: string) => {
    const messageToSend = text || inputText.trim();
    if (!messageToSend || isLoading || isTyping) {
      return;
    }

    const userEmotion = analyzeEmotion(messageToSend);

    // 添加用户消息
    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: messageToSend,
      timestamp: Date.now(),
      showTimestamp: shouldShowTimestamp(
        { id: "", role: "user", content: messageToSend, timestamp: Date.now() },
        messages[messages.length - 1],
      ),
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInputText("");
    setIsLoading(true);

    // 8秒超时提醒
    let hasFinished = false;
    const timeoutTimer = setTimeout(() => {
      if (!hasFinished) {
        setThinkTip("网络有点慢，再等等哦...");
      }
    }, 8000);

    // 打字机回复函数
    const typewriterReply = (
      fullText: string,
      onComplete: (finalMsg: Message) => void,
    ) => {
      setIsTyping(true);

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "",
        timestamp: Date.now(),
        aiMood: userEmotion,
        showTimestamp: shouldShowTimestamp(
          {
            id: "",
            role: "assistant",
            content: fullText,
            timestamp: Date.now(),
          },
          userMessage,
        ),
      };

      setMessages((prev) => [...prev, aiMessage]);

      let index = 0;
      const timer = setInterval(() => {
        if (index < fullText.length) {
          setMessages((prev) => {
            const updated = [...prev];
            updated[updated.length - 1] = {
              ...updated[updated.length - 1],
              content: fullText.slice(0, index + 1),
            };
            return updated;
          });
          index++;
          scrollToBottom();
        } else {
          clearInterval(timer);
          setIsTyping(false);
          const finalMsg = { ...aiMessage, content: fullText };
          onComplete(finalMsg);
        }
      }, 40);
    };

    // ── 策略1：情绪话术本地缓存（优先匹配 ai.config.ts 话术库） ──
    // 如果是情绪短语按钮点击的（短消息且在 EMOTION_PHRASES 中），强制本地匹配
    const isEmotionPhrase = EMOTION_PHRASES.some(
      (p) => p.text === messageToSend,
    );
    const comfortReply = isEmotionPhrase
      ? getForceLocalReply(messageToSend)
      : getComfortReply(messageToSend);
    if (comfortReply) {
      // 命中情绪话术库，直接返回预设回复（不消耗额度、不调用AI）
      typewriterReply(comfortReply, (finalMsg) => {
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = finalMsg;
          saveMessages(updated);
          return updated;
        });
        hasFinished = true;
        clearTimeout(timeoutTimer);
        setIsLoading(false);
      });
      return;
    }

    // ── 策略2：额度快速拦截（本地兜底） ──
    if (!hasQuota()) {
      hasFinished = true;
      clearTimeout(timeoutTimer);
      setIsLoading(false);
      setRemainingQuota(0);
      // 额度用完 → 触发分享弹窗（不挡住当前消息）
      setShowShareModal(true);
      const shareTip =
        SHARE_TIP_WORDS[Math.floor(Math.random() * SHARE_TIP_WORDS.length)];
      const exhaustedMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: shareTip,
        timestamp: Date.now(),
        aiMood: "neutral",
        showTimestamp: shouldShowTimestamp(
          {
            id: "",
            role: "assistant",
            content: shareTip,
            timestamp: Date.now(),
          },
          userMessage,
        ),
      };
      const updatedMessages = [...newMessages, exhaustedMessage];
      setMessages(updatedMessages);
      saveMessages(updatedMessages);
      scrollToBottom();
      return;
    }

    // ── 策略3：调用AI大模型（额度由服务端校验扣减） ──
    try {
      const chatHistory = newMessages.slice(-6).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      let response;
      let usedLocalFallback = false;
      try {
        response = await Network.chat(messageToSend, chatHistory);
      } catch (firstError) {
        console.warn("[Chat] 首次调用失败，重试中...", firstError);
        try {
          response = await Network.chat(messageToSend, chatHistory);
        } catch (retryError) {
          console.error("[Chat] 重试失败，降级到本地回复", retryError);
          usedLocalFallback = true;
          const allReplies = COMFORT_PHRASES.flatMap((p) => p.replies);
          const fallbackReply =
            allReplies[Math.floor(Math.random() * allReplies.length)];
          response = { content: fallbackReply };
        }
      }

      // 处理服务端额度用尽
      if (response.quotaExhausted) {
        hasFinished = true;
        clearTimeout(timeoutTimer);
        setIsLoading(false);
        setRemainingQuota(0);
        // 额度用完 → 触发分享弹窗
        setShowShareModal(true);
        const shareTip =
          SHARE_TIP_WORDS[Math.floor(Math.random() * SHARE_TIP_WORDS.length)];
        const exhaustedMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: shareTip,
          timestamp: Date.now(),
          aiMood: "neutral",
          showTimestamp: shouldShowTimestamp(
            { id: "", role: "assistant", content: shareTip, timestamp: Date.now() },
            userMessage,
          ),
        };
        const updatedMessages = [...newMessages, exhaustedMessage];
        setMessages(updatedMessages);
        saveMessages(updatedMessages);
        scrollToBottom();
        return;
      }

      // 根据返回的 quota 信息同步本地
      if (response.quota) {
        const q = response.quota;
        updateLocalQuotaFromResponse(q.remaining, q.usedToday);
        setRemainingQuota(q.remaining);
      }

      // 本地降级时，兜底扣减本地额度
      if (usedLocalFallback) {
        consumeTotalQuota();
        setRemainingQuota(getRemainingQuota());
      }

      const aiResponse = response.content || AI_ERROR_FALLBACK_MESSAGE;

      typewriterReply(aiResponse, (finalMsg) => {
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = finalMsg;
          saveMessages(updated);
          return updated;
        });
        hasFinished = true;
        clearTimeout(timeoutTimer);
        setIsLoading(false);
      });
    } catch (error) {
      console.error("发送消息失败:", error);
      hasFinished = true;
      clearTimeout(timeoutTimer);
      setIsLoading(false);
    }
  };

  // 监听消息变化，自动滚动
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 麦克风点击事件
  const handleMicClick = () => {
    Taro.showToast({
      title: VOICE_FEATURE_TIP,
      icon: "none",
      duration: 2000,
    });
  };

  // 分享按钮点击事件
  const handleShareClick = () => {
    doClaimShareBonus();
    if (Taro.getEnv() !== Taro.ENV_TYPE.WEAPP) {
      Taro.showToast({
        title: "请点击右上角分享",
        icon: "none",
        duration: 2000,
      });
    }
  };

  // 构建分享路径（包含分享者 openid）
  const getSharePath = () => {
    return userOpenid
      ? `/pages/index/index?shared=true&from=${userOpenid}`
      : "/pages/index/index?shared=true";
  };

  // 配置分享给朋友：只返回分享配置
  Taro.useShareAppMessage(() => {
    const shareConfig = getShareConfig();
    return {
      title: shareConfig.TITLE,
      path: getSharePath(),
      imageUrl: shareConfig.IMAGE_URL || undefined,
    };
  });

  // 配置分享到朋友圈：只返回分享配置
  Taro.useShareTimeline(() => {
    const shareConfig = getShareConfig();
    return {
      title: shareConfig.TITLE,
      query: userOpenid ? `shared=true&from=${userOpenid}` : "shared=true",
    };
  });

  return (
    <View
      className="flex flex-col h-screen"
      style={{ backgroundColor: "#FEF9F5" }}
    >
      {/* 顶部导航 */}
      <View
        className="fixed top-0 left-0 right-0 z-50"
        style={{
          backgroundColor: "#FEF9F5",
          padding: "12px 16px",
          borderBottom: "1px solid #E8E8E8",
        }}
      >
        <Text
          className="text-center"
          style={{
            fontSize: "20px",
            fontWeight: "500",
            color: "#3E3A39",
          }}
        >
          {HOME_HEADER_TITLE}
        </Text>
      </View>

      {/* 消息列表 */}
      <View
        className="flex-1"
        style={{
          backgroundColor: "#FEF9F5",
          paddingTop: "60px",
          paddingBottom: "140px",
          minHeight: "100vh",
        }}
      >
        <ScrollView
          scrollY
          scrollWithAnimation
          scrollTop={scrollTop}
          onClick={handleTapBlank}
          style={{
            height: "100%",
            backgroundColor: "#FEF9F5",
          }}
        >
          <View style={{ padding: "16px" }}>
            {/* 打字机欢迎语 */}
            {messages.length === 0 && welcomeText && (
              <View className="flex justify-start mb-3">
                <View className="self-start" style={{ marginRight: "8px" }}>
                  <Text style={{ fontSize: "32px" }}>😴</Text>
                </View>
                <View
                  style={{
                    padding: "12px 16px",
                    maxWidth: "75%",
                    borderRadius: "18px 18px 18px 4px",
                    backgroundColor: "#F0F0F0",
                    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
                  }}
                >
                  <Text
                    className="block"
                    style={{
                      fontSize: "16px",
                      color: "#3E3A39",
                      lineHeight: "24px",
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
                  message.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                {/* AI消息显示头像和情绪图标 */}
                {message.role === "assistant" && (
                  <View
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      marginRight: "8px",
                      alignItems: "center",
                    }}
                  >
                    <Text style={{ fontSize: "32px" }}>
                      {getMoodEmoji(message.aiMood)}
                    </Text>
                  </View>
                )}

                {/* 消息气泡 */}
                <View
                  style={{
                    padding: "12px 16px",
                    maxWidth: "75%",
                    borderRadius:
                      message.role === "user"
                        ? "18px 18px 4px 18px"
                        : "18px 18px 18px 4px",
                    backgroundColor:
                      message.role === "user" ? "#E6F0DA" : "#F0F0F0",
                    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
                  }}
                >
                  {/* AI情感标签 */}
                  {message.role === "assistant" && (
                    <View
                      style={{
                        display: "flex",
                        alignItems: "center",
                        marginBottom: "4px",
                      }}
                    >
                      <Text style={{ fontSize: "14px", marginRight: "4px" }}>
                        {getAILabel(message.content)}
                      </Text>
                      <Text style={{ fontSize: "12px", color: "#999999" }}>
                        {AI_NAME}
                      </Text>
                    </View>
                  )}

                  <Text
                    className="block"
                    style={{
                      fontSize: "16px",
                      color: "#3E3A39",
                      lineHeight: "24px",
                    }}
                  >
                    {message.content}
                  </Text>

                  {/* 时间戳 */}
                  {message.showTimestamp && (
                    <Text
                      className="block"
                      style={{
                        fontSize: "12px",
                        color: "#999999",
                        marginTop: "6px",
                      }}
                    >
                      {new Date(message.timestamp).toLocaleTimeString("zh-CN", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </Text>
                  )}
                </View>
              </View>
            ))}

            {/* AI 思考状态 */}
            {isLoading && (
              <View id="msg-loading" className="flex justify-start mb-3">
                <View className="self-start" style={{ marginRight: "8px" }}>
                  <Text style={{ fontSize: "32px" }}>😴</Text>
                </View>
                <View
                  style={{
                    padding: "12px 16px",
                    backgroundColor: "#F0F0F0",
                    borderRadius: "18px 18px 18px 4px",
                    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
                  }}
                >
                  <View
                    style={{
                      display: "flex",
                      flexDirection: "row",
                      gap: "4px",
                      alignItems: "center",
                    }}
                  >
                    <View
                      className="w-2 h-2 rounded-full"
                      style={{
                        backgroundColor: "#FFB6A0",
                        animation: "bounce 1s infinite",
                      }}
                    />
                    <View
                      className="w-2 h-2 rounded-full"
                      style={{
                        backgroundColor: "#FFB6A0",
                        animation: "bounce 1s infinite 0.2s",
                      }}
                    />
                    <View
                      className="w-2 h-2 rounded-full"
                      style={{
                        backgroundColor: "#FFB6A0",
                        animation: "bounce 1s infinite 0.4s",
                      }}
                    />
                    {thinkTip && (
                      <Text
                        className="block"
                        style={{
                          fontSize: "14px",
                          color: "#999999",
                          marginLeft: "8px",
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
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: "#FEF9F5",
          padding: "8px 16px 16px",
          borderTop: "1px solid #E8E8E8",
          zIndex: 100,
        }}
      >
        {/* 额度提示 */}
        {remainingQuota > 0 && remainingQuota <= 3 && (
          <View
            className="mb-2 px-3 py-1 rounded-full"
            style={{
              backgroundColor: "#FFF3E0",
              display: "inline-block",
              alignSelf: "center",
            }}
          >
            <Text
              className="block"
              style={{
                fontSize: "12px",
                color: "#FF8C42",
              }}
            >
              今日剩余 {remainingQuota} 次聊天机会
            </Text>
          </View>
        )}

        {/* 情绪短语卡片（水平滚动） */}
        <ScrollView
          scrollX
          className="mb-3"
          style={{
            whiteSpace: "nowrap",
            padding: "4px 0",
          }}
        >
          <View style={{ display: "flex", flexDirection: "row", gap: "12px" }}>
            {EMOTION_PHRASES.map((phrase, index) => (
              <View
                key={index}
                className="px-4 py-2 rounded-full"
                style={{
                  backgroundColor: phrase.color,
                  boxShadow: `0 2px 4px ${phrase.color}4D`,
                  display: "inline-block",
                }}
                onClick={() => handleSendMessage(phrase.text)}
              >
                <Text
                  className="block"
                  style={{
                    fontSize: "14px",
                    color: phrase.color === "#E3EDF5" ? "#3E3A39" : "#ffffff",
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
            backgroundColor: "#ffffff",
            borderRadius: "24px",
            borderWidth: "1px",
            borderColor: "#E8E8E8",
            padding: "8px 12px",
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
          }}
        >
          {/* 麦克风图标 */}
          <View
            style={{
              width: "36px",
              height: "36px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
            onClick={handleMicClick}
          >
            <Mic size={20} color="#999999" />
          </View>

          {/* 输入框 */}
          <View
            style={{
              flex: 1,
              minHeight: "36px",
              display: "flex",
              alignItems: "center",
            }}
          >
            <Textarea
              style={{
                width: "100%",
                maxHeight: "120px",
                backgroundColor: "transparent",
                fontSize: "16px",
                color: "#3E3A39",
                lineHeight: "24px",
              }}
              placeholder={INPUT_PLACEHOLDER}
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
              width: "36px",
              height: "36px",
              borderRadius: "18px",
              backgroundColor:
                !inputText.trim() || isLoading || isTyping ? "#E8E8E8" : "#FFB6A0",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
            onClick={() =>
              inputText.trim() && !isLoading && !isTyping && handleSendMessage()
            }
          >
            <Send
              size={18}
              color={!inputText.trim() || isLoading || isTyping ? "#999999" : "#ffffff"}
            />
          </View>
        </View>
      </View>

      {/* 每日治愈文案弹窗 */}
      {showDailyQuote && (
        <View
          className="fixed inset-0 flex items-center justify-center"
          style={{
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            zIndex: 200,
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
              backgroundColor: "#FEF9F5",
              borderRadius: "24px",
              padding: "24px",
              margin: "16px",
              boxShadow: "0 4px 20px rgba(0, 0, 0, 0.1)",
              maxWidth: "300px",
            }}
          >
            <Text className="text-[24px] block mb-3 text-center">☁️</Text>
            <Text
              className="block text-center"
              style={{
                fontSize: "16px",
                color: "#3E3A39",
                marginBottom: "16px",
                lineHeight: "24px",
              }}
            >
              {currentQuote}
            </Text>
            <Text
              className="block text-center"
              style={{
                fontSize: "14px",
                color: "#999999",
              }}
            >
              {DAILY_QUOTE_CONTINUE_TEXT}
            </Text>
          </View>
        </View>
      )}

      {/* 首次蒙层指引 */}
      {showGuide && (
        <View
          className="fixed inset-0 flex items-center justify-center"
          style={{
            backgroundColor: "rgba(0, 0, 0, 0.7)",
            zIndex: 300,
          }}
          onClick={() => {
            setShowGuide(false);
            Taro.setStorageSync("hasShownGuide", true);
          }}
        >
          <View
            style={{
              backgroundColor: "#FEF9F5",
              borderRadius: "24px",
              padding: "24px",
              margin: "16px",
              boxShadow: "0 4px 20px rgba(0, 0, 0, 0.1)",
              maxWidth: "320px",
            }}
          >
            <Text className="text-[32px] block mb-3 text-center">👋</Text>
            <Text
              className="block text-center"
              style={{
                fontSize: "18px",
                color: "#3E3A39",
                marginBottom: "12px",
                fontWeight: "500",
              }}
            >
              {GUIDE_WELCOME_TITLE}
            </Text>
            <Text
              className="block text-center"
              style={{
                fontSize: "14px",
                color: "#666666",
                marginBottom: "8px",
                lineHeight: "20px",
              }}
            >
              {GUIDE_WELCOME_DESC}
            </Text>
            <Text
              className="block text-center"
              style={{
                fontSize: "14px",
                color: "#666666",
                marginBottom: "16px",
                lineHeight: "20px",
              }}
            >
              {GUIDE_ACTION_HINT}
            </Text>
            <Text
              className="block text-center"
              style={{
                fontSize: "14px",
                color: "#999999",
              }}
            >
              {GUIDE_CLOSE_HINT}
            </Text>
          </View>
        </View>
      )}

      {/* 退出关怀弹窗 */}
      {showGoodbyeModal && (
        <View
          className="fixed inset-0 flex items-center justify-center"
          style={{
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            zIndex: 200,
          }}
          onClick={() => setShowGoodbyeModal(false)}
        >
          <View
            style={{
              backgroundColor: "#FEF9F5",
              borderRadius: "24px",
              padding: "24px",
              margin: "16px",
              boxShadow: "0 4px 20px rgba(0, 0, 0, 0.1)",
            }}
          >
            <Text className="text-[24px] block mb-3">🌙</Text>
            <Text
              className="block"
              style={{
                fontSize: "16px",
                color: "#3E3A39",
                marginBottom: "8px",
                fontWeight: "500",
              }}
            >
              {GOODBYE_TITLE}
            </Text>
            <Text
              className="block"
              style={{
                fontSize: "14px",
                color: "#999999",
              }}
            >
              {GOODBYE_SUBTITLE}
            </Text>
          </View>
        </View>
      )}
      {/* 分享弹窗（额度用完后尝试发消息时弹出，达到每日分享上限后不再弹） */}
      {showShareModal && shareCount < QUOTA_CONFIG.MAX_DAILY_SHARE && (
        <View
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.4)",
            zIndex: 999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          onClick={() => setShowShareModal(false)}
        >
          <View
            style={{
              backgroundColor: "#fff",
              borderRadius: "16px",
              padding: "24px",
              width: "280px",
              textAlign: "center",
              boxShadow: "0 8px 32px rgba(0,0,0,0.15)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <Text className="text-[32px] block mb-3">💬</Text>
            <Text
              className="block"
              style={{ fontSize: "16px", color: "#333", fontWeight: "600", marginBottom: "8px" }}
            >
              今日聊天次数已用完
            </Text>
            <Text
              className="block"
              style={{ fontSize: "13px", color: "#999", marginBottom: "20px" }}
            >
              分享给好友，你们各得 {SHARE_CONFIG.BONUS_COUNT} 次额外机会
            </Text>
            {Taro.getEnv() === Taro.ENV_TYPE.WEAPP ? (
              <Button
                openType="share"
                onClick={() => {
                  console.log("[Share] 分享按钮点击，直接 claim");
                  doClaimShareBonus();
                }}
                style={{
                  backgroundColor: "#4CAF50",
                  color: "#fff",
                  border: "none",
                  borderRadius: "24px",
                  padding: "10px 24px",
                  fontSize: "14px",
                  fontWeight: "500",
                  display: "flex",
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  marginBottom: "12px",
                }}
              >
                <Share2 size={16} color="#fff" />
                立即分享
              </Button>
            ) : (
              <View
                style={{
                  backgroundColor: "#4CAF50",
                  color: "#fff",
                  borderRadius: "24px",
                  padding: "10px 24px",
                  fontSize: "14px",
                  display: "flex",
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  marginBottom: "12px",
                }}
                onClick={handleShareClick}
              >
                <Share2 size={16} color="#fff" />
                <Text style={{ color: "#fff", fontSize: "14px" }}>立即分享</Text>
              </View>
            )}
            <Text
              className="block"
              style={{ fontSize: "12px", color: "#bbb", cursor: "pointer" }}
              onClick={() => setShowShareModal(false)}
            >
              稍后再说
            </Text>
          </View>
        </View>
      )}
    </View>
  );
};

export default IndexPage;
