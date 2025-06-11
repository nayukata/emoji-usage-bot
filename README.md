# EMOJI 集計ちゃん 🎯

Discord サーバーで使用された絵文字の使用率を集計し、ランキング形式で定期投稿する TypeScript 製 Discord BOT です。

## ✨ 主な機能

- 📊 **絵文字使用率分析**: 指定チャンネルでのリアクション絵文字を自動集計
- 🏆 **ランキング表示**: 使用頻度順にソートされた見やすいランキング
- 🔄 **定期自動投稿**: cron スケジュールによる自動実行
- 🎨 **包括的対応**: Unicode 絵文字・カスタム絵文字・アニメーション絵文字に完全対応
- ⚡ **高性能**: TypeScript による型安全性と最適化されたデータ処理
- 🧪 **高品質**: 包括的なテストカバレッジ（45 テストケース）

## 🚀 クイックスタート

### 1. Discord Application の作成

1. [Discord Developer Portal](https://discord.com/developers/applications) にアクセス
2. 「New Application」→ アプリケーション名を入力（例: EMOJI 集計ちゃん）
3. 「Bot」タブ → 「Add Bot」をクリック
4. Bot トークンをコピーして保存

### 2. Bot 権限の設定

#### 必要な Bot 権限
Installation > Default Install Settings から以下の権限を有効にしてください：

Guild Install
***Scopes**
- ✅ **applications.commands** -
- ✅ **applications.commands** -

***Permissions***
- ✅ **Read Message History** - メッセージ履歴の読み取り
- ✅ **Send Messages** - メッセージ送信
- ✅ **View Channels** - チャンネルの閲覧
- ✅ **Use Slash Commands** - /コマンドの使用
- ✅ **Add Reactions** - リアクションの追加（推奨）

#### 特権インテント（重要）
「Bot」タブの「Privileged Gateway Intents」で以下を有効化：

- ✅ **Message Content Intent** - メッセージ内容へのアクセス

### 3. サーバー招待

1. 「Installation」→「Install Link」
2. CopyボタンでURLをコピーしてサーバーに招待

### 4. 環境設定

```bash
# リポジトリクローン
git clone <your-repository-url>
cd emoji-usage-bot

# 依存関係インストール
pnpm install

# 環境変数設定
cp .env.example .env
```

`.env` ファイルを編集：

```env
# Discord BOT設定
DISCORD_TOKEN=your_bot_token_here
CLIENT_ID=your_client_id_here

# チャンネル設定（カンマ区切りで複数指定可能）
TARGET_CHANNELS=channel_id_1,channel_id_2,channel_id_3
REPORT_CHANNEL=report_channel_id

# 集計設定
ANALYSIS_DAYS=7              # 集計期間（日数）
TOP_EMOJI_COUNT=20          # 表示ランキング数

# 定期実行設定（任意 - 設定しない場合は手動実行のみ）
# SCHEDULE_CRON=0 10 * * 1    # 毎週月曜日 10:00（コメントアウトで無効化）
```

### 5. 実行

```bash
# 開発モード（TypeScript 直接実行）
pnpm dev

# 本番モード（ビルド後実行）
pnpm build
pnpm start
```

## 🛠️ 開発環境

### 前提条件
- Node.js 18.0.0 以上
- pnpm 8.0.0 以上

### 開発用コマンド

```bash
# TypeScript ビルド
pnpm build

# 型チェック
pnpm type-check

# リンター実行
pnpm lint

# テスト実行
pnpm test              # watch モード
pnpm test:run          # 単発実行
pnpm test:coverage     # カバレッジ付き

# テスト UI（ブラウザ）
pnpm test:ui
```

### テスト

このプロジェクトは **vitest** による包括的なテストスイートを含んでいます：

- **45 個のテストケース** - 全主要機能をカバー
- **高いカバレッジ率** - 核心ロジックで 90%+ を達成
- **型安全なテスト** - TypeScript による堅牢なテスト

```bash
# 全テスト実行
pnpm test:run

# カバレッジレポート
pnpm test:coverage
```

## 📁 プロジェクト構成

```
emoji-usage-bot/
├── src/
│   ├── index.ts                    # メインエントリーポイント
│   ├── types/
│   │   └── index.ts               # 型定義
│   ├── bot/
│   │   ├── client.ts              # Discord クライアント
│   │   ├── commands.ts            # スラッシュコマンド定義
│   │   ├── deploy-commands.ts     # コマンドデプロイ
│   │   └── slash-commands.ts      # コマンドハンドラー
│   ├── services/
│   │   ├── message.ts             # メッセージ取得
│   │   ├── emoji.ts               # 絵文字分析エンジン
│   │   ├── ranking.ts             # ランキング生成
│   │   └── scheduler.ts           # 定期実行管理
│   └── utils/
│       ├── config.ts              # 設定管理
│       ├── logger.ts              # ログ出力
│       └── permissions.ts         # 権限チェック
├── *.test.ts                      # テストファイル
├── vitest.config.ts               # テスト設定
├── tsconfig.json                  # TypeScript 設定
└── package.json                   # プロジェクト設定
```

## ⚙️ 設定リファレンス

### 環境変数

| 変数名              | 必須 | 説明                               | 例                         |
|---------------------|------|------------------------------------|----------------------------|
| `DISCORD_TOKEN`     | ✅    | Discord BOT トークン               | `MTIzNDU2Nzg5MA...`        |
| `CLIENT_ID`         | ✅    | BOT のクライアント ID              | `1234567890123456789`      |
| `TARGET_CHANNELS`   | ✅    | 集計対象チャンネル ID（複数可）    | `123,456,789`              |
| `REPORT_CHANNEL`    | ✅    | 結果投稿チャンネル ID              | `1234567890123456789`      |
| `ANALYSIS_DAYS`     |      | 集計期間（日数、デフォルト: 7）    | `14`                       |
| `TOP_EMOJI_COUNT`   |      | 表示ランキング数（デフォルト: 20） | `30`                       |
| `SCHEDULE_CRON`     |      | 定期実行スケジュール（任意）       | `0 9 * * 1`（毎週月曜9時） |
| `SCHEDULE_TIMEZONE` |      | タイムゾーン（任意）               | `Asia/Tokyo`               |
| `NODE_ENV`          |      | 実行環境                           | `production`               |

### Discord ID の取得方法

1. Discord で「開発者モード」を有効化
2. チャンネル・サーバーを右クリック →「ID をコピー」

## 🎯 使用方法

### 自動実行（任意）
`SCHEDULE_CRON` を設定した場合、BOT が起動すると設定されたスケジュールに従って自動的に絵文字使用率レポートを投稿します。

### 手動実行
スラッシュコマンドでいつでも手動実行可能：

```
/emoji analyze        # 絵文字分析を手動実行
/emoji stats          # 統計情報を表示
/emoji help           # ヘルプ表示
```

### 出力例

```
✨ **絵文字使用率ランキング (TOP 10)**

1. 👍 50回 (25.0%)
2. 😊 30回 (15.0%)
3. 🎉 25回 (12.5%)
...

📊 **総リアクション数**: 200個
🎨 **絵文字種類数**: 15種類
```

## 🔧 トラブルシューティング

### よくある問題

#### Bot が反応しない
- [ ] Bot トークンが正しく設定されているか確認
- [ ] 必要な権限がすべて付与されているか確認
- [ ] Message Content Intent が有効になっているか確認

#### 絵文字が集計されない
- [ ] TARGET_CHANNELS に正しいチャンネル ID が設定されているか確認
- [ ] Bot が対象チャンネルにアクセス権限を持っているか確認
- [ ] チャンネルにリアクションが存在するか確認

#### 定期実行が動作しない
- [ ] `SCHEDULE_CRON` が設定されているか確認（設定されていない場合は手動実行のみ）
- [ ] SCHEDULE_CRON の形式が正しいか確認
- [ ] Bot が継続的に稼働しているか確認

### ログの確認

```bash
# ログレベル詳細表示
NODE_ENV=development pnpm start
```

## 🚀 デプロイ

### Docker による本番環境デプロイ

```bash
# Docker イメージビルド
docker build -t emoji-usage-bot .

# コンテナ実行
docker run -d \
  --env-file .env \
  --name emoji-bot \
  emoji-usage-bot
```

### クラウドプラットフォーム

- **Railway**: `railway.toml` 設定済み
- **Koyeb**: `koyeb.yaml` 設定済み
- **Heroku**: `package.json` の engines 設定済み

## 🤝 コントリビューション

1. このリポジトリをフォーク
2. フィーチャーブランチを作成（`git checkout -b feature/amazing-feature`）
3. 変更をコミット（`git commit -m 'Add amazing feature'`）
4. ブランチにプッシュ（`git push origin feature/amazing-feature`）
5. プルリクエストを作成

### 開発ガイドライン

- TypeScript の厳格な型チェックに準拠
- 新機能には必ずテストを追加
- コミット前に `pnpm test:run` と `pnpm build` を実行
- コードフォーマットは Prettier に従う

## 📄 ライセンス

MIT License - 詳細は [LICENSE](LICENSE) ファイルを参照してください。

## 📞 サポート

問題が発生した場合は、[Issues](https://github.com/your-username/emoji-usage-bot/issues) でお気軽にお知らせください。

---

**EMOJI 集計ちゃん** で楽しい Discord ライフを！ 🎉