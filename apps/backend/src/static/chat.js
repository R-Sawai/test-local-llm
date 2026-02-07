const chat = document.getElementById("chat");
const msgInput = document.getElementById("msg");
const sendBtn = document.getElementById("send");

/** @type {{ role: string; content: string }[]} */
const messages = [];

/**
 * チャットにメッセージバブルを追加する
 * @param {"user" | "assistant"} role
 * @param {string} text
 * @returns {HTMLDivElement}
 */
function addBubble(role, text) {
  const div = document.createElement("div");
  div.className = "msg " + role;
  div.textContent = text;
  chat.appendChild(div);
  chat.scrollTop = chat.scrollHeight;
  return div;
}

/**
 * メッセージを送信し、ストリーミングで応答を受け取る
 */
async function send() {
  const text = msgInput.value.trim();
  if (!text) return;

  msgInput.value = "";
  sendBtn.disabled = true;

  addBubble("user", text);
  messages.push({ role: "user", content: text });

  const bubble = addBubble("assistant", "");
  bubble.classList.add("typing");

  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages }),
    });

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let full = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      full += decoder.decode(value, { stream: true });
      bubble.textContent = full;
      chat.scrollTop = chat.scrollHeight;
    }

    bubble.classList.remove("typing");
    messages.push({ role: "assistant", content: full });
  } catch (e) {
    bubble.textContent = "エラー: " + e.message;
    bubble.classList.remove("typing");
  }

  sendBtn.disabled = false;
  msgInput.focus();
}

// ---- Event listeners ----
sendBtn.addEventListener("click", send);
msgInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    send();
  }
});
msgInput.focus();
