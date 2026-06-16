<template>
  <footer class="status-footer">
    <button type="button" aria-label="添加">＋</button>
    <div class="input-pill">
      <span class="cursor"></span>
      <span>输入消息…</span>
    </div>
    <button class="send" type="button" aria-label="发送">↑</button>
  </footer>
</template>

<style lang="scss" scoped>
.status-footer {
  box-sizing: border-box;
  height: 62px;
  padding: 10px 12px 14px;
  display: flex;
  align-items: center;
  gap: 8px;
  border-top: 1px solid var(--phone-line);
  background: rgba(248, 251, 255, 0.82);
  backdrop-filter: blur(14px);

  button {
    width: 31px;
    height: 31px;
    border: 0;
    border-radius: 50%;
    display: grid;
    place-items: center;
    color: var(--phone-muted);
    background: rgba(23, 32, 51, 0.08);
    font-weight: 800;
  }

  .send {
    color: #ffffff;
    background: linear-gradient(135deg, var(--phone-accent), var(--phone-accent-deep));
  }
}

.input-pill {
  min-width: 0;
  flex: 1;
  height: 34px;
  padding: 0 12px;
  border-radius: 999px;
  display: flex;
  align-items: center;
  gap: 7px;
  color: var(--phone-muted);
  background: #ffffff;
  box-shadow: inset 0 0 0 1px rgba(15, 23, 42, 0.08);
  font-size: 12px;
}

.cursor {
  width: 2px;
  height: 16px;
  border-radius: 999px;
  background: var(--phone-accent);
  animation: blink 1.2s steps(2, jump-none) infinite;
}

@keyframes blink {
  50% { opacity: 0; }
}
</style>
