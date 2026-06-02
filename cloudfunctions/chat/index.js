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
} = require("./ai.config");

// ─── 云数据库引用 ───
const db = cloud.database();
const _ = db.command;
const userProfileCollection = db.collection("user_profiles");

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
// 入口分发
// ═══════════════════════════════════════════════

exports.main = async (event, context) => {
  const { action, data } = event;
  // 统一从 context.OPENID 获取（云函数自带），fallback 到前端传递
  const openid = context.OPENID || (data && data.openid) || "";
  try {
    switch (action) {
      case "sendMessage":
      case "chat":
        return await handleChat(data, context);
      case "getProfile":
        return { success: true, data: await getUserProfile(openid) };
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
  // 优先用 context.OPENID（云函数自带），fallback 到前端传递的 openid
  const openid = context.OPENID || data.openid || "";
  if (!message || !message.trim()) throw new Error("消息不能为空");

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

  return { success: true, data: { content: aiResponse.content } };
}
