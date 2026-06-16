<template>
  <aside class="empty-state">
    <div class="signal-ring">
      <span></span>
      <span></span>
      <span></span>
    </div>
    <h2>等待角色状态数据</h2>
    <p>可提供 <code>stat_data.手机</code>、<code>stat_data.phone</code> 或聊天变量中的手机状态对象。</p>
    <button type="button" @click="store.loadExample()">加载示例预览</button>
  </aside>
</template>

<script setup lang="ts">
import { usePhoneStore } from '../store';

const store = usePhoneStore();
</script>

<style lang="scss" scoped>
.empty-state {
  position: absolute;
  z-index: 3;
  inset: 66px 12px 74px;
  padding: 18px 16px;
  border-radius: 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  background: rgba(255, 255, 255, 0.82);
  backdrop-filter: blur(16px);
  box-shadow: 0 18px 36px rgba(15, 23, 42, 0.14);

  h2 {
    margin: 12px 0 6px;
    font-size: 17px;
    color: var(--phone-text);
  }

  p {
    margin: 0;
    color: var(--phone-muted);
    font-size: 12px;
    line-height: 1.6;
  }

  code {
    color: var(--phone-accent-deep);
    font-size: 11px;
  }

  button {
    margin-top: 15px;
    border: 0;
    border-radius: 999px;
    padding: 9px 15px;
    color: #ffffff;
    background: linear-gradient(135deg, var(--phone-accent), var(--phone-accent-deep));
    font-size: 12px;
    font-weight: 800;
    box-shadow: 0 12px 24px rgba(21, 157, 147, 0.24);
  }
}

.signal-ring {
  position: relative;
  width: 58px;
  height: 58px;
  display: grid;
  place-items: center;

  span {
    position: absolute;
    border: 2px solid rgba(49, 199, 176, 0.58);
    border-radius: 50%;
    animation: pulse 1.8s ease-out infinite;

    &:nth-child(1) {
      width: 18px;
      height: 18px;
      background: var(--phone-accent);
      border-color: var(--phone-accent);
    }

    &:nth-child(2) {
      width: 36px;
      height: 36px;
      animation-delay: 0.2s;
    }

    &:nth-child(3) {
      width: 56px;
      height: 56px;
      animation-delay: 0.4s;
    }
  }
}

@keyframes pulse {
  0% {
    opacity: 0.95;
    transform: scale(0.86);
  }

  100% {
    opacity: 0.12;
    transform: scale(1.08);
  }
}
</style>
