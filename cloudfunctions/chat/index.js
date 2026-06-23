const cloud = require("wx-server-sdk");
const https = require("https");

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});

const {
  SYSTEM_PROMPT,
  AI_PROVIDER_MAP,
  DEFAULT_AI_PROVIDER,
  AI_REQUEST_CONFIG,
  MEMORY_EXTRACTION_PROMPT,
  MEMORY_INJECTION_TEMPLATE,
  COMFORT_PHRASES,
  QUOTA_CONFIG,
} = require("./ai.config");

// ─── 云数据库引用 ───
const db = cloud.database();
const _ = db.command;
const userProfileCollection = db.collection("user_profiles");
const appConfigCollection = db.collection("app_config");

// ─── AI 提供商路由 ───
function getAIProvider(providerName) {
  const name = providerName || process.env.AI_PROVIDER || DEFAULT_AI_PROVIDER;
  const provider = AI_PROVIDER_MAP[name];
  if (!provider) {
    throw new Error("不支持的 AI 提供商: " + name);
  }
  return { ...provider, providerKey: name };
}

// ─── 腾讯标准签名函数 (TC3-HMAC-SHA256) ───
function generateTencentSignature(secretId, secretKey, payload, host) {
  const crypto = require("crypto");
  const timestamp = Math.floor(Date.now() / 1000);
  const date = new Date(timestamp * 1000).toISOString().split("T")[0];

  const service = "hunyuan";
  const action = "ChatCompletions";
  const version = "2023-09-01";

  const canonicalUri = "/";
  const canonicalQueryString = "";
  const canonicalHeaders = `content-type:application/json\nhost:${host}\nx-tc-action:${action.toLowerCase()}\n`;
  const signedHeaders = "content-type;host;x-tc-action";

  const hashedRequestPayload = crypto
    .createHash("sha256")
    .update(JSON.stringify(payload))
    .digest("hex");
  const canonicalRequest = `POST\n${canonicalUri}\n${canonicalQueryString}\n${canonicalHeaders}\n${signedHeaders}\n${hashedRequestPayload}`;

  const algorithm = "TC3-HMAC-SHA256";
  const credentialScope = `${date}/${service}/tc3_request`;
  const hashedCanonicalRequest = crypto
    .createHash("sha256")
    .update(canonicalRequest)
    .digest("hex");
  const stringToSign = `${algorithm}\n${timestamp}\n${credentialScope}\n${hashedCanonicalRequest}`;

  const secretDate = crypto
    .createHmac("sha256", `TC3${secretKey}`)
    .update(date)
    .digest();
  const secretService = crypto
    .createHmac("sha256", secretDate)
    .update(service)
    .digest();
  const secretSigning = crypto
    .createHmac("sha256", secretService)
    .update("tc3_request")
    .digest();
  const signature = crypto
    .createHmac("sha256", secretSigning)
    .update(stringToSign)
    .digest("hex");

  const authorization = `${algorithm} Credential=${secretId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  return { authorization, timestamp, host, action, version };
}

function callHTTPS(url, headers, payload) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const data = JSON.stringify(payload);

    const httpsAgent = new https.Agent({
      rejectUnauthorized: false,
    });

    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname,
      method: "POST",
      headers: {
        ...headers,
        "Content-Length": Buffer.byteLength(data),
      },
      agent: httpsAgent,
    };

    const req = https.request(options, (res) => {
      let body = "";
      res.on("data", (chunk) => (body += chunk));
      res.on("end", () => {
        try {
          resolve({ statusCode: res.statusCode, data: JSON.parse(body) });
        } catch (e) {
          reject(new Error("JSON 解析失败"));
        }
      });
    });

    req.on("error", reject);
    req.write(data);
    req.end();
  });
}

// ─── 混元 API 调用 ───
async function callHunyuanAI(messages, provider) {
  const urlObj = new URL(provider.apiUrl);
  const payload = {
    Model: provider.model,
    Messages: messages.map((m) => ({
      Role:
        m.role === "system"
          ? "system"
          : m.role === "user"
            ? "user"
            : "assistant",
      Content: m.content,
    })),
    TopP: AI_REQUEST_CONFIG.topP,
    Temperature: AI_REQUEST_CONFIG.temperature,
  };

  const secretId = process.env.HUNYUAN_SECRET_ID;
  const secretKey = process.env.HUNYUAN_SECRET_KEY;
  if (!secretId || !secretKey)
    throw new Error("缺少环境变量 HUNYUAN_SECRET_ID/KEY");

  const sign = generateTencentSignature(
    secretId,
    secretKey,
    payload,
    urlObj.hostname,
  );

  const headers = {
    "Content-Type": "application/json",
    Authorization: sign.authorization,
    "X-TC-Timestamp": sign.timestamp.toString(),
    "X-TC-Action": sign.action,
    "X-TC-Version": sign.version,
  };

  const response = await callHTTPS(provider.apiUrl, headers, payload);

  if (response.statusCode === 200 && response.data && response.data.Response) {
    const resp = response.data.Response;
    if (resp.ErrorMsg) throw new Error("混元 API 报错: " + resp.ErrorMsg);
    if (resp.Choices && resp.Choices.length > 0) {
      return { content: resp.Choices[0].Message.Content };
    }
    throw new Error("AI 返回数据格式异常: " + JSON.stringify(resp));
  }
  throw new Error(
    "AI API 错误 (Status " +
      response.statusCode +
      "): " +
      JSON.stringify(response.data),
  );
}

// ─── OpenAI 兼容 API 调用（DeepSeek / OpenAI） ───
async function callOpenAICompatible(messages, provider) {
  const apiKey = provider.apiKeyEnv ? process.env[provider.apiKeyEnv] : "";
  if (!apiKey) throw new Error("缺少环境变量 " + provider.apiKeyEnv);

  const response = await callHTTPS(
    provider.apiUrl,
    {
      "Content-Type": "application/json",
      Authorization: "Bearer " + apiKey,
    },
    {
      model: provider.model,
      messages,
      temperature: AI_REQUEST_CONFIG.temperature,
      top_p: AI_REQUEST_CONFIG.topP,
    },
  );

  if (
    response.statusCode === 200 &&
    response.data &&
    response.data.choices &&
    response.data.choices.length > 0
  ) {
    return { content: response.data.choices[0].message.content };
  }
  throw new Error(
    "AI API 错误 (Status " +
      response.statusCode +
      "): " +
      JSON.stringify(response.data),
  );
}

// ─── 统一 AI 调用入口 ───
async function callAI(messages, providerName) {
  const provider = getAIProvider(providerName);
  if (provider.useTencentSign) {
    return callHunyuanAI(messages, provider);
  }
  return callOpenAICompatible(messages, provider);
}

// ═══════════════════════════════════════════════
// 用户记忆系统 — 云数据库持久化
// ═══════════════════════════════════════════════

/** 查询用户档案 */
async function getUserProfile(openid) {
  if (!openid) return null;
  try {
    const res = await userProfileCollection.where({ userId: openid }).get();
    if (res.data.length > 0) return res.data[0];
    return null;
  } catch (e) {
    console.error("获取用户档案失败:", e);
    return null;
  }
}

/** 创建或更新用户档案 */
async function createOrUpdateProfile(openid, extraction) {
  if (!openid) return;
  try {
    const existing = await getUserProfile(openid);
    const now = new Date().toISOString();
    const today = now.split("T")[0];

    if (existing) {
      const updateData = { updatedAt: now, lastChatDate: today };
      updateData.totalChats = _.inc(1);

      if (extraction.facts && extraction.facts.length) {
        const merged = [
          ...new Set([...(existing.facts || []), ...extraction.facts]),
        ].slice(-20);
        updateData.facts = merged;
      }
      if (extraction.emotions && extraction.emotions.length) {
        updateData.emotions = _.push({
          $each: extraction.emotions,
          $position: -30,
        });
      }
      if (extraction.preferences && extraction.preferences.length) {
        const merged = [
          ...new Set([
            ...(existing.preferences || []),
            ...extraction.preferences,
          ]),
        ].slice(-10);
        updateData.preferences = merged;
      }
      if (extraction.events && extraction.events.length) {
        updateData.events = _.push({
          $each: extraction.events,
          $position: -20,
        });
      }
      if (extraction.mood_score !== undefined) {
        updateData.moodHistory = _.push({
          $each: [{ date: today, score: extraction.mood_score }],
          $position: -60,
        });
        updateData.lastMoodScore = extraction.mood_score;
      }

      await userProfileCollection
        .doc(existing._id)
        .update({ data: updateData });
    } else {
      const newProfile = {
        userId: openid,
        facts: extraction.facts || [],
        emotions: extraction.emotions || [],
        preferences: extraction.preferences || [],
        events: extraction.events || [],
        moodHistory: extraction.mood_score
          ? [{ date: today, score: extraction.mood_score }]
          : [],
        totalChats: 1,
        firstChatDate: today,
        lastChatDate: today,
        lastMoodScore: extraction.mood_score || 5,
        createdAt: now,
        updatedAt: now,
      };
      await userProfileCollection.add({ data: newProfile });
    }
  } catch (e) {
    console.error("更新用户档案失败:", e);
  }
}

/** 构建记忆注入 prompt */
function buildMemoryPrompt(profile) {
  if (!profile) return "";

  const now = new Date();
  const firstDate = new Date(profile.firstChatDate || profile.createdAt);
  const daysSinceFirst = Math.max(
    1,
    Math.floor((now.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24)),
  );

  const recentEmotions = (profile.emotions || []).slice(-5);
  const recentEvents = (profile.events || []).slice(-3);

  let lastMood = "平静";
  const lastScore = profile.lastMoodScore || 5;
  if (lastScore <= 3) lastMood = "低落";
  else if (lastScore <= 5) lastMood = "一般";
  else if (lastScore <= 7) lastMood = "还不错";
  else lastMood = "很开心";

  const lastChatDate = new Date(profile.lastChatDate || profile.createdAt);
  const hoursAgo = Math.floor(
    (now.getTime() - lastChatDate.getTime()) / (1000 * 60 * 60),
  );
  let lastChatTime = "刚刚";
  if (hoursAgo >= 24) lastChatTime = Math.floor(hoursAgo / 24) + "天前";
  else if (hoursAgo >= 1) lastChatTime = hoursAgo + "小时前";

  // 纪念日检测
  const milestones = [7, 14, 30, 60, 90, 100, 180, 365];
  let annivHint = "";
  if (milestones.includes(daysSinceFirst)) {
    annivHint =
      "\n🎉 今天是你们认识第" + daysSinceFirst + "天的纪念日，可以适当提及！";
  }

  return (
    MEMORY_INJECTION_TEMPLATE.replace(
      "{days_since_first}",
      String(daysSinceFirst),
    )
      .replace("{total_chats}", String(profile.totalChats || 0))
      .replace("{facts}", (profile.facts || []).slice(-10).join("、") || "暂无")
      .replace("{recent_emotions}", recentEmotions.join("、") || "暂无")
      .replace(
        "{preferences}",
        (profile.preferences || []).slice(-5).join("、") || "暂无",
      )
      .replace("{recent_events}", recentEvents.join("、") || "暂无")
      .replace("{last_chat_time}", lastChatTime)
      .replace("{last_mood}", lastMood) + annivHint
  );
}

/** AI 提取记忆（异步，不阻塞回复） */
async function extractMemory(messages, aiReply) {
  try {
    const conversationText = messages
      .filter((m) => m.role !== "system")
      .map((m) => m.role + ": " + m.content)
      .concat(["assistant: " + aiReply])
      .join("\n");

    const prompt = MEMORY_EXTRACTION_PROMPT.replace(
      "{conversation}",
      conversationText,
    );
    const hunyuanProvider = getAIProvider("hunyuan");
    const result = await callHunyuanAI(
      [
        { role: "system", content: prompt },
        { role: "user", content: "请提取以上对话中的用户信息。" },
      ],
      hunyuanProvider,
    );

    // 解析 JSON（兼容 AI 可能包裹 ```json ... ```）
    const jsonMatch = result.content.match(/\{[\s\S]*\}/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]);
    return null;
  } catch (e) {
    console.error("记忆提取失败:", e);
    return null;
  }
}

// ═══════════════════════════════════════════════
// 额度系统 — 云端校验
// ═══════════════════════════════════════════════

/** 获取今天日期字符串 YYYY-MM-DD */
function getTodayStr() {
  return new Date().toISOString().split("T")[0];
}

/** 判断是否新用户（firstChatDate 距今 <= NEW_USER_DAYS 天） */
function isNewUser(profile) {
  if (!profile || !profile.firstChatDate) return true;
  const first = new Date(profile.firstChatDate);
  const now = new Date();
  const diffDays = Math.floor(
    (now.getTime() - first.getTime()) / (1000 * 60 * 60 * 24),
  );
  return diffDays <= QUOTA_CONFIG.NEW_USER_DAYS;
}

/** 获取用户每日额度上限 */
function getDailyLimit(profile) {
  return isNewUser(profile)
    ? QUOTA_CONFIG.NEW_USER_DAILY
    : QUOTA_CONFIG.OLD_USER_DAILY;
}

/** 读取并规范化用户额度数据（处理跨天重置、字段缺失） */
function normalizeQuota(profile) {
  const today = getTodayStr();
  const quota = (profile && profile.quota) || {};
  const dailyLimit = getDailyLimit(profile);
  const shareBonus = quota.shareBonus || 0;

  // 跨天或首次：重置 usedToday
  if (quota.quotaDate !== today) {
    return {
      usedToday: 0,
      quotaDate: today,
      shareBonus,
      dailyLimit,
      isNewUser: isNewUser(profile),
    };
  }

  return {
    usedToday: quota.usedToday || 0,
    quotaDate: today,
    shareBonus,
    dailyLimit,
    isNewUser: isNewUser(profile),
  };
}

/** 查询额度（只读，不消耗） */
async function getQuotaInfo(openid) {
  if (!openid) throw new Error("无法识别用户身份");

  const profile = await getUserProfile(openid);
  const q = normalizeQuota(profile);
  const totalAllowed = q.dailyLimit + q.shareBonus;
  const remaining = Math.max(0, totalAllowed - q.usedToday);
  const hasShared =
    (profile && profile.quota && profile.quota.hasShared) || false;
  const hasReceived =
    (profile && profile.quota && profile.quota.hasReceived) || false;
  const shareCount =
    (profile && profile.quota && profile.quota.shareCountDate === getTodayStr()
      ? profile.quota.shareCount || 0
      : 0);

  return {
    remaining,
    usedToday: q.usedToday,
    dailyLimit: q.dailyLimit,
    shareBonus: q.shareBonus,
    isNewUser: q.isNewUser,
    hasShared,
    hasReceived,
    shareCount,
  };
}

/** 检查并消耗一次额度（原子操作） */
async function checkAndConsumeQuota(openid) {
  if (!openid) throw new Error("无法识别用户身份");

  const profile = await getUserProfile(openid);
  const today = getTodayStr();
  const now = new Date().toISOString();

  // 新用户首次：自动创建档案
  if (!profile) {
    const dailyLimit = QUOTA_CONFIG.NEW_USER_DAILY;
    const newProfile = {
      userId: openid,
      facts: [],
      emotions: [],
      preferences: [],
      events: [],
      moodHistory: [],
      totalChats: 1,
      firstChatDate: today,
      lastChatDate: today,
      lastMoodScore: 5,
      createdAt: now,
      updatedAt: now,
      quota: {
        usedToday: 1,
        quotaDate: today,
        shareBonus: 0,
        hasShared: false,
      },
    };
    await userProfileCollection.add({ data: newProfile });
    return {
      allowed: true,
      remaining: dailyLimit - 1,
      quotaData: {
        usedToday: 1,
        quotaDate: today,
        shareBonus: 0,
        dailyLimit,
        isNewUser: true,
      },
    };
  }

  const q = normalizeQuota(profile);
  const totalAllowed = q.dailyLimit + q.shareBonus;

  // 额度用尽
  if (q.usedToday >= totalAllowed) {
    return { allowed: false, remaining: 0, quotaData: q };
  }

  // 原子递增 usedToday
  const hasQuotaField = !!(profile && profile.quota);
  const updateData = hasQuotaField
    ? {
        "quota.usedToday": _.inc(1),
        "quota.quotaDate": q.quotaDate,
        updatedAt: now,
      }
    : {
        quota: {
          usedToday: 1,
          quotaDate: today,
          shareBonus: q.shareBonus,
          hasShared: false,
        },
        updatedAt: now,
      };

  await userProfileCollection
    .where({ userId: openid })
    .update({ data: updateData });

  const newUsed = q.usedToday + 1;
  const remaining = Math.max(0, totalAllowed - newUsed);

  return {
    allowed: true,
    remaining,
    quotaData: { ...q, usedToday: newUsed },
  };
}

/** 领取分享奖励（分享者按次+每日上限，接收者按分享者去重） */
async function claimShareBonus(openid, type, fromOpenid) {
  if (!openid) throw new Error("无法识别用户身份");

  const isRecipient = type === "receive";
  const profile = await getUserProfile(openid);
  const now = new Date().toISOString();
  const today = getTodayStr();

  // 默认 quota 模板
  const defaultQuota = {
    usedToday: 0,
    quotaDate: today,
    shareBonus: 0,
    shareCount: 0,
    shareCountDate: today,
    receivedFrom: [],
  };

  // 用户不存在，先创建
  if (!profile) {
    const quota = { ...defaultQuota };
    if (isRecipient) {
      if (fromOpenid) {
        quota.shareBonus = QUOTA_CONFIG.SHARE_BONUS;
        quota.receivedFrom = [fromOpenid];
      }
    } else {
      quota.shareBonus = QUOTA_CONFIG.SHARE_BONUS;
      quota.shareCount = 1;
    }
    const newProfile = {
      userId: openid,
      facts: [], emotions: [], preferences: [], events: [], moodHistory: [],
      totalChats: 0, firstChatDate: today, lastChatDate: today, lastMoodScore: 5,
      createdAt: now, updatedAt: now, quota,
    };
    await userProfileCollection.add({ data: newProfile });
    const dailyLimit = QUOTA_CONFIG.NEW_USER_DAILY;
    return {
      success: true, shareBonus: quota.shareBonus,
      shareCount: quota.shareCount, newlyAdded: quota.shareBonus > 0 ? QUOTA_CONFIG.SHARE_BONUS : 0,
      remaining: dailyLimit + quota.shareBonus, usedToday: 0, dailyLimit,
    };
  }

  const quota = profile.quota || {};
  const dailyLimit = getDailyLimit(profile);
  const q = normalizeQuota(profile);
  const currentBonus = quota.shareBonus || 0;

  if (isRecipient) {
    // ── 接收者：按分享者去重 ──
    const receivedFrom = quota.receivedFrom || [];
    if (fromOpenid && receivedFrom.includes(fromOpenid)) {
      return {
        success: true, shareBonus: currentBonus, alreadyClaimed: true,
        remaining: Math.max(0, dailyLimit + currentBonus - q.usedToday),
        usedToday: q.usedToday, dailyLimit,
      };
    }
    const newBonus = currentBonus + QUOTA_CONFIG.SHARE_BONUS;
    const newReceivedFrom = fromOpenid ? [...receivedFrom, fromOpenid] : receivedFrom;
    const updateData = profile.quota
      ? { "quota.shareBonus": newBonus, "quota.receivedFrom": newReceivedFrom, updatedAt: now }
      : { quota: { ...defaultQuota, shareBonus: newBonus, receivedFrom: newReceivedFrom }, updatedAt: now };
    await userProfileCollection.doc(profile._id).update({ data: updateData });
    return {
      success: true, shareBonus: newBonus, newlyAdded: QUOTA_CONFIG.SHARE_BONUS,
      remaining: Math.max(0, dailyLimit + newBonus - q.usedToday),
      usedToday: q.usedToday, dailyLimit,
    };
  } else {
    // ── 分享者：按次+每日上限 ──
    const shareCountDate = quota.shareCountDate || "";
    const shareCount = shareCountDate === today ? (quota.shareCount || 0) : 0;

    if (shareCount >= QUOTA_CONFIG.MAX_DAILY_SHARE) {
      return {
        success: true, shareBonus: currentBonus, shareCount,
        alreadyClaimed: true,
        remaining: Math.max(0, dailyLimit + currentBonus - q.usedToday),
        usedToday: q.usedToday, dailyLimit,
      };
    }

    const newShareCount = shareCount + 1;
    const newBonus = currentBonus + QUOTA_CONFIG.SHARE_BONUS;
    const updateData = profile.quota
      ? {
          "quota.shareBonus": newBonus,
          "quota.shareCount": newShareCount,
          "quota.shareCountDate": today,
          updatedAt: now,
        }
      : {
          quota: { ...defaultQuota, shareBonus: newBonus, shareCount: newShareCount, shareCountDate: today },
          updatedAt: now,
        };
    await userProfileCollection.doc(profile._id).update({ data: updateData });
    return {
      success: true, shareBonus: newBonus, shareCount: newShareCount,
      newlyAdded: QUOTA_CONFIG.SHARE_BONUS,
      remaining: Math.max(0, dailyLimit + newBonus - q.usedToday),
      usedToday: q.usedToday, dailyLimit,
    };
  }
}

// ═══════════════════════════════════════════════
// 审核模式控制
// ═══════════════════════════════════════════════

/** 获取审核模式开关，默认 true（安全优先） */
async function getReviewMode() {
  try {
    const res = await appConfigCollection.where({ key: "review_mode" }).get();
    if (res.data.length > 0) {
      return res.data[0].enabled !== false;
    }
    return true;
  } catch (e) {
    console.error("获取审核模式配置失败:", e);
    return true;
  }
}

/** 审核模式下本地关键词匹配回复 */
function getLocalReply(message) {
  const lowerMsg = message.toLowerCase();
  for (const phrase of COMFORT_PHRASES) {
    if (phrase.keywords.some((kw) => lowerMsg.includes(kw))) {
      return phrase.replies[Math.floor(Math.random() * phrase.replies.length)];
    }
  }
  const allReplies = COMFORT_PHRASES.flatMap((p) => p.replies);
  return allReplies[Math.floor(Math.random() * allReplies.length)];
}

/** 设置审核模式开关 */
async function handleSetReviewMode(data) {
  const { enabled } = data;
  try {
    const res = await appConfigCollection.where({ key: "review_mode" }).get();
    if (res.data.length > 0) {
      await appConfigCollection.doc(res.data[0]._id).update({
        data: { enabled: !!enabled, updatedAt: new Date().toISOString() },
      });
    } else {
      await appConfigCollection.add({
        data: {
          key: "review_mode",
          enabled: !!enabled,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      });
    }
    return { success: true, data: { reviewMode: !!enabled } };
  } catch (e) {
    console.error("设置审核模式失败:", e);
    throw new Error("设置审核模式失败: " + e.message);
  }
}

// ═══════════════════════════════════════════════
// 入口分发
// ═══════════════════════════════════════════════

exports.main = async (event, context) => {
  const { action, data } = event;
  // 统一从 context.OPENID 获取（云函数自带），fallback 到 cloud.getWXContext()
  const wxContext = cloud.getWXContext();
  const openid = context.OPENID || wxContext.OPENID || (data && data.openid) || "";
  console.log("[DEBUG] action:", action, "context.OPENID:", context.OPENID, "wxContext.OPENID:", wxContext.OPENID, "openid:", openid ? openid.substring(0, 8) + "..." : "EMPTY");
  try {
    switch (action) {
      case "sendMessage":
      case "chat":
        return await handleChat(data, context);
      case "getProfile":
        return { success: true, data: await getUserProfile(openid) };
      case "getQuota":
        return { success: true, data: await getQuotaInfo(openid) };
      case "claimShareBonus":
        return { success: true, data: await claimShareBonus(openid, data && data.type, data && data.fromOpenid) };
      case "getMoodHistory": {
        const profile = await getUserProfile(openid);
        const history = profile
          ? (profile.moodHistory || []).slice(-(data.days || 7))
          : [];
        return { success: true, data: history };
      }
      case "getAnniversary": {
        const annivProfile = await getUserProfile(openid);
        if (!annivProfile) return { success: true, data: null };
        const days = Math.floor(
          (Date.now() - new Date(annivProfile.firstChatDate).getTime()) /
            (1000 * 60 * 60 * 24),
        );
        const milestones = [7, 14, 30, 60, 90, 100, 180, 365];
        return {
          success: true,
          data: { days, isAnniversary: milestones.includes(days) },
        };
      }
      case "getHistory":
        return { success: true, data: { messages: [] } };
      case "clearHistory":
        return { success: true };
      case "getOpenid":
        return { success: true, data: { openid: context.OPENID || "" } };
      case "setReviewMode":
        return await handleSetReviewMode(data);
      default:
        throw new Error("未知的操作: " + action);
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// ═══════════════════════════════════════════════
// 聊天处理（记忆闭环）
// ═══════════════════════════════════════════════

async function handleChat(data, context) {
  const { message, history, provider } = data;
  // 优先用 context.OPENID（云函数自带），fallback 到 cloud.getWXContext() 再到前端传递
  const wxContext = cloud.getWXContext();
  const openid = context.OPENID || wxContext.OPENID || data.openid || "";
  if (!message || !message.trim()) throw new Error("消息不能为空");

  // 0. 额度校验（最先执行，无论审核模式还是AI模式都要扣额度）
  const quotaResult = await checkAndConsumeQuota(openid);
  if (!quotaResult.allowed) {
    return {
      success: false,
      error: "QUOTA_EXHAUSTED",
      data: { quotaExhausted: true, remaining: 0, quotaData: quotaResult.quotaData },
    };
  }

  const quotaInfo = {
    remaining: quotaResult.remaining,
    usedToday: quotaResult.quotaData.usedToday,
    dailyLimit: quotaResult.quotaData.dailyLimit,
    shareBonus: quotaResult.quotaData.shareBonus,
  };

  // 0.5 检查审核模式
  const isReviewMode = await getReviewMode();
  if (isReviewMode) {
    const reply = getLocalReply(message);
    return { success: true, data: { content: reply, quota: quotaInfo } };
  }

  // 1. 查询用户档案
  const userProfile = await getUserProfile(openid);

  // 2. 构建增强 system prompt（注入记忆）
  let enhancedSystemPrompt = SYSTEM_PROMPT;
  const memoryPrompt = buildMemoryPrompt(userProfile);
  if (memoryPrompt) {
    enhancedSystemPrompt += memoryPrompt;
  }

  // 3. 构建消息数组（根据模型支持的历史条数）
  const aiProvider = getAIProvider(provider);
  const maxHistory = aiProvider.maxHistory || 6;
  const aiMessages = [
    { role: "system", content: enhancedSystemPrompt },
    ...(history || []).slice(-maxHistory),
    { role: "user", content: message },
  ];

  // 4. 调用 AI
  const aiResponse = await callAI(aiMessages, provider);

  // 5. 异步提取记忆（不阻塞用户收到回复）
  extractMemory(aiMessages, aiResponse.content)
    .then(async (extraction) => {
      if (extraction && openid) {
        await createOrUpdateProfile(openid, extraction);
        console.log("[Memory] 用户档案已更新:", openid);
      }
    })
    .catch((e) => console.error("异步记忆提取失败:", e));

  return {
    success: true,
    data: {
      content: aiResponse.content,
      quota: quotaInfo,
    },
  };
}