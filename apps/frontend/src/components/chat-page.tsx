import { useState, useRef, useEffect } from "react";
import { useChat, type ChatMessage } from "@/hooks/use-chat";
import { Send, Trash2, Bot } from "lucide-react";

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 leading-relaxed whitespace-pre-wrap wrap-break-word ${
          isUser
            ? "bg-primary text-primary-foreground rounded-br-sm"
            : "bg-muted text-foreground rounded-bl-sm border border-border"
        }`}
      >
        {message.content || (
          <span className="italic text-muted-foreground animate-pulse">
            考え中...
          </span>
        )}
      </div>
    </div>
  );
}

export function ChatPage() {
  const { messages, sendMessage, clearMessages, isStreaming, error } =
    useChat();
  const [input, setInput] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 自動スクロール
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // フォーカス制御
  useEffect(() => {
    textareaRef.current?.focus();
  }, [isStreaming]);

  const handleSend = () => {
    if (!input.trim() || isStreaming) return;
    sendMessage(input.trim());
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card px-6 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <Bot className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-lg font-semibold">Local LLM Chat</h1>
            <p className="text-xs text-muted-foreground">
              Ollama を使ったローカル LLM チャット
            </p>
          </div>
        </div>
        <button
          onClick={clearMessages}
          className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted transition-colors"
          title="チャット履歴をクリア"
        >
          <Trash2 className="h-4 w-4" />
          クリア
        </button>
      </header>

      {/* Chat messages */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3">
            <Bot className="h-12 w-12" />
            <p className="text-lg">メッセージを入力して会話を始めましょう</p>
          </div>
        )}
        {messages.map((msg, i) => (
          <MessageBubble key={i} message={msg} />
        ))}
        {error && (
          <div className="text-sm text-destructive bg-destructive/10 rounded-lg px-4 py-2">
            エラー: {error.message}
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input area */}
      <div className="border-t border-border bg-card px-6 py-4 shrink-0">
        <div className="flex gap-3 items-end">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={2}
            placeholder="メッセージを入力... (Shift+Enter で改行)"
            className="flex-1 resize-none rounded-lg border border-input bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            disabled={isStreaming}
          />
          <button
            onClick={handleSend}
            disabled={isStreaming || !input.trim()}
            className="flex items-center justify-center rounded-lg bg-primary text-primary-foreground h-11 w-11 hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
