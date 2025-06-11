# Node.js 22を使用
FROM node:22-alpine

# 作業ディレクトリを設定
WORKDIR /app

# パッケージファイルをコピー
COPY package*.json ./
COPY pnpm-lock.yaml ./

# pnpmをインストール
RUN npm install -g pnpm

# 依存関係をインストール
RUN pnpm install --frozen-lockfile --prod

# アプリケーションコードをコピー
COPY src/ ./src/

# ポート3000を公開（Railwayで必要）
EXPOSE 3000

# アプリケーションを起動
CMD ["pnpm", "start"]