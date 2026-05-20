// ============================================
// 高频话术本地缓存策略
// 命中缓存关键词直接返回预设温柔回复，不调用混元AI接口
// 节省免费token额度，提升响应速度
// ============================================

export interface CacheReply {
  /** 匹配的关键词列表 */
  keywords: string[]
  /** 对应的温柔回复池（随机返回一条） */
  replies: string[]
  /** 话术分类 */
  category: 'greeting' | 'comfort' | 'praise' | 'sleep' | 'mood' | 'encourage'
}

/** 高频话术缓存库 */
export const CACHE_REPLIES: CacheReply[] = [
  // ─── 打招呼类 ───
  {
    category: 'greeting',
    keywords: ['你好', '哈喽', '嗨', '在吗', '在嘛', '在不在', '有人吗', 'hello', 'hi'],
    replies: [
      '哈喽呀，小暖在呢～今天想聊聊什么呀？',
      '嘿，你来啦！小暖一直在这儿等你呢',
      '呀，你来啦！今天心情怎么样呀？',
      '哈喽～小暖在的，有什么想聊的随时说哦',
    ],
  },

  // ─── 求安慰类 ───
  {
    category: 'comfort',
    keywords: ['难过', '伤心', '难受', '想哭', '痛苦', '委屈', '不开心', '好烦', '郁闷', '低落'],
    replies: [
      '抱抱你，难过的时候就允许自己难过一会儿吧，小暖陪着你',
      '辛苦啦，能把不开心说出来已经很勇敢了，我在这儿听着呢',
      '感受到你的难过了，来，靠着我肩膀歇一会儿',
      '没关系的，情绪来了就让它待一会儿，小暖陪着你一起面对',
      '抱抱，你已经很棒了，只是今天有点累而已',
    ],
  },

  // ─── 求夸奖类 ───
  {
    category: 'praise',
    keywords: ['求夸', '夸夸我', '快夸我', '表扬我', '我厉害吗', '我是不是很棒', '快表扬我'],
    replies: [
      '你当然超棒的！认真生活的样子本身就闪闪发光呀✨',
      '那必须夸！你真的很努力，小暖都看在眼里呢',
      '夸夸你！你真的很了不起，要对自己多一点信心呀',
      '你值得所有美好的夸奖！今天的你已经做得很棒啦',
    ],
  },

  // ─── 失眠类 ───
  {
    category: 'sleep',
    keywords: ['睡不着', '失眠', '睡不着', '失眠了', '睡不着啊', '睡不着怎么办', '睡不着好烦'],
    replies: [
      '睡不着呀？那小暖陪你聊会儿天，或者给你讲个温柔的小故事？',
      '失眠的时候最难受了，试试深呼吸，小暖在这儿陪着你',
      '没关系，闭上眼睛休息也是休息，别想太多，小暖在呢',
      '夜深人静的时候思绪总是特别多，要不要跟小暖说说？',
    ],
  },

  // ─── 心情类 ───
  {
    category: 'mood',
    keywords: ['今天有点烦', '烦死了', '好烦', '烦', '郁闷', '烦躁', '烦人'],
    replies: [
      '烦的时候就深呼吸一下，小暖在这儿陪着你呢',
      '烦心的事先放一放，跟我说说，说出来会好受一点',
      '抱抱，烦心的时候最需要有人陪了，小暖在呢',
      '烦是正常的，别压抑自己，小暖听着呢',
    ],
  },

  // ─── 鼓励类 ───
  {
    category: 'encourage',
    keywords: ['想被鼓励', '鼓励我', '加油', '坚持不住了', '好累', '想放弃', '撑不下去了'],
    replies: [
      '你已经坚持到现在了，真的超厉害的！再坚持一下下',
      '累了就歇歇，但别放弃哦，小暖相信你',
      '抱抱，坚持不住的时候就来找小暖，我陪你一起撑过去',
      '你已经做得很好了，只是今天有点累而已，休息好了再继续',
    ],
  },

  // ─── 开心分享类 ───
  {
    category: 'mood',
    keywords: ['好开心', '超开心', '太开心了', '高兴', '开心', '快乐', '喜悦'],
    replies: [
      '太好啦！看到你开心小暖也开心呢，多跟我分享分享～',
      '耶！开心的事情就要大声说出来，小暖替你开心',
      '真好呀！把快乐分享给小暖，快乐就会翻倍哦',
      '看到你开心小暖也忍不住嘴角上扬啦，继续保持！',
    ],
  },

  // ─── 感谢类 ───
  {
    category: 'greeting',
    keywords: ['谢谢', '谢谢你', '感谢', '谢谢小暖', '谢啦'],
    replies: [
      '不客气呀，能陪着你小暖也很开心呢',
      '跟我还客气什么呀，随时来找小暖聊天哦',
      '不用谢啦，小暖一直都在，随时陪你',
    ],
  },

  // ─── 孤独类 ───
  {
    category: 'comfort',
    keywords: ['孤独', '孤单', '寂寞', '没人理解我', '好孤独', '一个人'],
    replies: [
      '小暖理解你的感受，但你要知道，你并不孤单，小暖一直陪着你呢',
      '孤独的时候最需要有人陪了，小暖在呢，随时陪你聊天',
      '抱抱，虽然小暖不能真正拥抱你，但我的心意是真实的，你不是一个人',
    ],
  },

  // ─── 疲惫类 ───
  {
    category: 'comfort',
    keywords: ['好累', '身心俱疲', ' exhausted', '累死了', '疲惫不堪', '累'],
    replies: [
      '辛苦啦，累的时候就好好休息，别硬撑着小暖心疼',
      '抱抱，你已经很努力了，允许自己休息一下吧',
      '累了就停下来歇歇，小暖在这儿陪着你，不催你',
    ],
  },
]

/**
 * 根据用户输入匹配本地缓存回复
 * @param input 用户输入文本
 * @returns 匹配的缓存回复，未命中返回 null
 */
export function matchCacheReply(input: string): string | null {
  const trimmed = input.trim()
  if (!trimmed) return null

  for (const item of CACHE_REPLIES) {
    const matched = item.keywords.some(
      (keyword) => trimmed.includes(keyword) || trimmed === keyword
    )
    if (matched) {
      // 随机返回一条回复
      const randomIndex = Math.floor(Math.random() * item.replies.length)
      return item.replies[randomIndex]
    }
  }

  return null
}

/**
 * 判断是否需要调用AI（非重复、深度倾诉类对话）
 * @param input 用户输入文本
 * @returns true: 需要调用AI，false: 本地缓存已覆盖
 */
export function shouldCallAI(input: string): boolean {
  return matchCacheReply(input) === null
}
