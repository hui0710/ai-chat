#!/bin/bash

# 云函数部署脚本

echo "🚀 开始部署云函数..."

# 检查是否安装了 miniprogram-ci
if ! command -v miniprogram-ci &> /dev/null; then
    echo "❌ miniprogram-ci 未安装，正在安装..."
    npm install -g miniprogram-ci
fi

# 检查是否存在密钥文件
if [ ! -f "key/private.appid.key" ]; then
    echo "⚠️  警告：未找到云函数密钥文件"
    echo "📝 请按照以下步骤操作："
    echo "   1. 登录微信公众平台"
    echo "   2. 进入 开发 → 开发管理 → 开发设置"
    echo "   3. 下载 云函数密钥（private.appid.key）"
    echo "   4. 将密钥文件放到 key/ 目录下"
    echo ""
    read -p "是否继续使用微信开发者工具手动部署？(y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "✅ 请在微信开发者工具中手动部署云函数"
        exit 0
    else
        echo "❌ 部署取消"
        exit 1
    fi
fi

# 读取配置
VERSION=$(node -p "require('./package.json').version")
DESC="部署 chat 云函数 - $(date +'%Y-%m-%d %H:%M:%S')"

echo "📦 版本号: $VERSION"
echo "📝 描述: $DESC"
echo ""

# 部署云函数
echo "📤 正在部署云函数..."
miniprogram-ci upload \
    --project . \
    --version $VERSION \
    --desc "$DESC" \
    --upload-desc "$DESC"

if [ $? -eq 0 ]; then
    echo "✅ 云函数部署成功！"
    echo ""
    echo "📝 后续步骤："
    echo "   1. 在微信开发者工具中查看云函数"
    echo "   2. 配置云函数环境变量"
    echo "   3. 测试云函数是否正常工作"
else
    echo "❌ 云函数部署失败"
    exit 1
fi
