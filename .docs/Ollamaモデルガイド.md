# Ollama モデルガイド

Ollama で利用できる主要モデルの比較と導入方法をまとめます。

---

## モデル一覧・比較

### 軽量モデル（〜4B）

| モデル        | パラメータ数 | サイズ目安 | 日本語 | 特徴                                                          |
| ------------- | ------------ | ---------- | :----: | ------------------------------------------------------------- |
| `gemma3:1b`   | 1B           | ~1.0 GB    |   △    | Google 製。最軽量で高速。簡単なタスク向き                     |
| `gemma3:4b`   | 4B           | ~3.3 GB    |   ○    | Google 製。軽量ながら実用的な品質。本プロジェクトのデフォルト |
| `phi4-mini`   | 3.8B         | ~2.5 GB    |   △    | Microsoft 製。推論・コード生成に強い                          |
| `llama3.2:3b` | 3B           | ~2.0 GB    |   △    | Meta 製。英語タスク全般にバランスが良い                       |
| `qwen3:4b`    | 4B           | ~2.6 GB    |   ○    | Alibaba 製。日本語を含む多言語対応が優秀                      |

### 中量モデル（7B〜14B）

| モデル           | パラメータ数 | サイズ目安 | 日本語 | 特徴                                              |
| ---------------- | ------------ | ---------- | :----: | ------------------------------------------------- |
| `gemma3:12b`     | 12B          | ~8.1 GB    |   ◎    | Google 製。画像入力にも対応（マルチモーダル）     |
| `llama3.1:8b`    | 8B           | ~4.7 GB    |   ○    | Meta 製。汎用性が高く広く使われている             |
| `qwen3:8b`       | 8B           | ~5.2 GB    |   ◎    | Alibaba 製。日本語品質が高い。thinking モード対応 |
| `phi4:14b`       | 14B          | ~9.1 GB    |   ○    | Microsoft 製。推論・数学・コードに特化            |
| `deepseek-r1:8b` | 8B           | ~4.9 GB    |   ○    | DeepSeek 製。推論特化。思考過程を出力             |
| `mistral:7b`     | 7B           | ~4.1 GB    |   △    | Mistral AI 製。英語中心の汎用モデル               |

### 大型モデル（27B〜）

| モデル            | パラメータ数 | サイズ目安 | 日本語 | 特徴                                              |
| ----------------- | ------------ | ---------- | :----: | ------------------------------------------------- |
| `gemma3:27b`      | 27B          | ~17 GB     |   ◎    | Google 製。高品質。マルチモーダル対応             |
| `qwen3:32b`       | 32B          | ~20 GB     |   ◎    | Alibaba 製。日本語最高レベル。thinking モード対応 |
| `llama3.3:70b`    | 70B          | ~43 GB     |   ◎    | Meta 製。オープンモデル最高峰の一つ               |
| `deepseek-r1:70b` | 70B          | ~43 GB     |   ◎    | DeepSeek 製。複雑な推論タスクに最適               |
| `command-r:35b`   | 35B          | ~20 GB     |   ◎    | Cohere 製。RAG に最適化されたモデル               |

### コード特化モデル

| モデル                  | パラメータ数 | サイズ目安 | 特徴                                    |
| ----------------------- | ------------ | ---------- | --------------------------------------- |
| `qwen2.5-coder:7b`      | 7B           | ~4.7 GB    | コード生成・補完に特化。多言語対応      |
| `codellama:7b`          | 7B           | ~3.8 GB    | Meta 製。コード生成のベースライン       |
| `codegemma:7b`          | 7B           | ~5.0 GB    | Google 製。コード補完とインフィルに対応 |
| `deepseek-coder-v2:16b` | 16B          | ~8.9 GB    | コードと数学推論の両方に強い            |

### 埋め込み（Embedding）モデル

| モデル                   | パラメータ数 | サイズ目安 | 次元数 | 特徴                          |
| ------------------------ | ------------ | ---------- | ------ | ----------------------------- |
| `nomic-embed-text`       | 137M         | ~274 MB    | 768    | 軽量で高速。RAG の第一選択    |
| `mxbai-embed-large`      | 335M         | ~670 MB    | 1024   | 高精度な埋め込み              |
| `bge-m3`                 | 567M         | ~1.2 GB    | 1024   | 多言語対応。日本語 RAG に最適 |
| `snowflake-arctic-embed` | 335M         | ~670 MB    | 1024   | 検索タスクに特化              |

> **日本語の凡例**: ◎ = 高品質 / ○ = 実用的 / △ = 基本対応

---

## 用途別おすすめ

| ユースケース               | おすすめモデル             | 理由                                |
| -------------------------- | -------------------------- | ----------------------------------- |
| 初めて試す / リソース少    | `gemma3:4b`                | 軽量で日本語も OK。バランス◎        |
| 日本語チャット重視         | `qwen3:8b`                 | 日本語品質が高い                    |
| コード生成・補完           | `qwen2.5-coder:7b`         | コード特化で多言語対応              |
| 複雑な推論                 | `deepseek-r1:8b`           | 思考過程を出力する推論特化          |
| RAG (検索拡張生成)         | `command-r:35b` + `bge-m3` | RAG 最適化モデル + 多言語 Embedding |
| マルチモーダル（画像入力） | `gemma3:12b`               | 画像理解が可能                      |
| 最高品質（メモリ余裕あり） | `qwen3:32b`                | 日本語・推論ともにトップクラス      |

---

## 必要スペック目安

| モデルサイズ | 必要メモリ (RAM) | 推奨 GPU VRAM |
| ------------ | ---------------- | ------------- |
| 1B〜3B       | 4 GB 以上        | なしでも可    |
| 4B〜8B       | 8 GB 以上        | 6 GB 以上     |
| 12B〜14B     | 16 GB 以上       | 10 GB 以上    |
| 27B〜35B     | 32 GB 以上       | 24 GB 以上    |
| 70B          | 64 GB 以上       | 48 GB 以上    |

> CPU のみでも動作しますが、GPU があると大幅に高速化されます。
> Docker で GPU を利用する場合は [GPU 対応の設定](#gpu-対応docker) を参照してください。

---

## モデルの導入方法

### 基本操作

```bash
# モデルをダウンロード
docker exec ollama ollama pull <モデル名>

# 例: gemma3 の 4B モデル
docker exec ollama ollama pull gemma3:4b

# 例: qwen3 の 8B モデル
docker exec ollama ollama pull qwen3:8b
```

### モデル管理コマンド

```bash
# インストール済みモデル一覧
docker exec ollama ollama list

# モデルの詳細情報を表示
docker exec ollama ollama show gemma3:4b

# モデルを削除（ディスク容量の解放）
docker exec ollama ollama rm gemma3:4b

# モデルをコピー（カスタム名を付ける）
docker exec ollama ollama cp gemma3:4b my-model
```

### CLI で直接対話する

```bash
# インタラクティブモードで対話
docker exec -it ollama ollama run gemma3:4b

# 1回だけ質問する
docker exec ollama ollama run gemma3:4b "東京の人口は？"
```

### API で呼び出す

```bash
# チャット API（非ストリーミング）
curl http://localhost:11434/api/chat -d '{
  "model": "gemma3:4b",
  "messages": [{"role": "user", "content": "こんにちは"}],
  "stream": false
}'

# 埋め込み API
curl http://localhost:11434/api/embed -d '{
  "model": "nomic-embed-text",
  "input": "検索したいテキスト"
}'
```

```powershell
# PowerShell の場合
$body = @{
  model = "gemma3:4b"
  messages = @(@{ role = "user"; content = "こんにちは" })
  stream = $false
} | ConvertTo-Json -Depth 3

Invoke-RestMethod -Uri "http://localhost:11434/api/chat" -Method Post -Body $body -ContentType "application/json"
```

---

## 本プロジェクトでモデルを変更する

### 方法 1: 環境変数で指定

```bash
MODEL_NAME=qwen3:8b npm run dev -w backend
```

### 方法 2: app.ts のデフォルト値を変更

```typescript
// apps/backend/src/app.ts
const MODEL_NAME = process.env.MODEL_NAME ?? "qwen3:8b"; // ← ここを変更
```

---

## GPU 対応（Docker）

NVIDIA GPU を利用してモデル推論を高速化する場合：

### 1. NVIDIA Container Toolkit をインストール

```bash
# Ubuntu / WSL2
sudo apt-get install -y nvidia-container-toolkit
sudo systemctl restart docker
```

### 2. docker-compose.yml を修正

```yaml
services:
  ollama:
    image: ollama/ollama:latest
    container_name: ollama
    ports:
      - "11434:11434"
    volumes:
      - ollama_data:/root/.ollama
    restart: unless-stopped
    deploy: # ← 追加
      resources: # ← 追加
        reservations: # ← 追加
          devices: # ← 追加
            - driver: nvidia # ← 追加
              count: all # ← 追加
              capabilities: # ← 追加
                - gpu # ← 追加

volumes:
  ollama_data:
```

### 3. GPU が認識されているか確認

```bash
docker exec ollama nvidia-smi
```

---

## カスタムモデルの作成（Modelfile）

既存モデルをベースにシステムプロンプトやパラメータをカスタマイズできます。

### 1. Modelfile を作成

```dockerfile
# Modelfile
FROM gemma3:4b

SYSTEM "あなたは親切な日本語アシスタントです。簡潔に回答してください。"

PARAMETER temperature 0.7
PARAMETER top_p 0.9
PARAMETER num_ctx 4096
```

### 2. カスタムモデルをビルド

```bash
# Modelfile をコンテナにコピーして作成
docker cp Modelfile ollama:/tmp/Modelfile
docker exec ollama ollama create my-assistant -f /tmp/Modelfile
```

### 3. カスタムモデルを使用

```bash
docker exec -it ollama ollama run my-assistant
```

本プロジェクトで使う場合：

```bash
MODEL_NAME=my-assistant npm run dev -w backend
```

---

## 参考リンク

- [Ollama 公式モデルライブラリ](https://ollama.com/library)
- [Ollama GitHub](https://github.com/ollama/ollama)
- [Ollama API リファレンス](https://github.com/ollama/ollama/blob/main/docs/api.md)
