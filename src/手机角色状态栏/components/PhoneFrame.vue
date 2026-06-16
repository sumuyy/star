<template>
  <section class="phone-frame" aria-label="手机角色状态栏">
    <div class="phone-glare"></div>
    <div class="phone-screen">
      <div class="notch" aria-hidden="true">
        <span class="speaker"></span>
        <span class="camera"></span>
      </div>

      <header class="system-bar">
        <span class="clock">{{ displayClock }}</span>
        <span class="system-icons">
          <span class="signal" aria-label="信号强度">
            <i v-for="level in 4" :key="level" :class="{ active: level <= state.signal }"></i>
          </span>
          <span class="battery" aria-label="电量">
            <span :style="{ width: `${state.battery}%` }"></span>
          </span>
        </span>
      </header>

      <div class="screen-content">
        <slot></slot>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { PhoneState } from '../types';

const props = defineProps<{ state: PhoneState }>();
const now = useNow({ interval: 30_000 });

const displayClock = computed(() => {
  if (props.state.clock.trim()) {
    return props.state.clock;
  }
  return now.value.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
});
</script>

<style lang="scss" scoped>
.phone-frame {
  box-sizing: border-box;
  position: relative;
  width: min(390px, 100%);
  aspect-ratio: 9 / 19.5;
  padding: 12px;
  border-radius: var(--phone-radius);
  background:
    linear-gradient(145deg, rgba(255, 255, 255, 0.16), transparent 32%),
    linear-gradient(315deg, #07090f, var(--phone-shell));
  box-shadow:
    0 24px 55px var(--phone-shadow),
    inset 0 0 0 1px rgba(255, 255, 255, 0.08),
    0 0 24px var(--phone-shell-glow);
  overflow: hidden;
}

.phone-glare {
  position: absolute;
  inset: 18px auto auto 28px;
  width: 24%;
  height: 42%;
  border-radius: 999px;
  background: linear-gradient(90deg, rgba(255, 255, 255, 0.16), transparent);
  filter: blur(12px);
  pointer-events: none;
}

.phone-screen {
  position: relative;
  width: 100%;
  height: 100%;
  border-radius: calc(var(--phone-radius) - 14px);
  background:
    radial-gradient(circle at 10% 0%, rgba(49, 199, 176, 0.18), transparent 34%),
    linear-gradient(180deg, #f8fbff, var(--phone-screen) 48%, var(--phone-screen-deep));
  overflow: hidden;
}

.notch {
  position: absolute;
  z-index: 5;
  top: 0;
  left: 50%;
  width: 42%;
  height: 25px;
  transform: translateX(-50%);
  border-radius: 0 0 18px 18px;
  background: #05070c;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  box-shadow: 0 6px 14px rgba(0, 0, 0, 0.18);
}

.speaker {
  width: 48px;
  max-width: 45%;
  height: 4px;
  border-radius: 999px;
  background: #222a38;
}

.camera {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: radial-gradient(circle at 35% 35%, #3f5d82, #111827 65%);
}

.system-bar {
  position: relative;
  z-index: 4;
  height: 36px;
  padding: 8px 20px 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12px;
  font-weight: 700;
  color: var(--phone-text);
}

.system-icons {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.signal {
  display: inline-flex;
  align-items: flex-end;
  gap: 2px;

  i {
    display: block;
    width: 3px;
    border-radius: 999px;
    background: rgba(23, 32, 51, 0.22);

    &:nth-child(1) { height: 5px; }
    &:nth-child(2) { height: 7px; }
    &:nth-child(3) { height: 9px; }
    &:nth-child(4) { height: 11px; }

    &.active {
      background: var(--phone-text);
    }
  }
}

.battery {
  position: relative;
  width: 24px;
  height: 11px;
  padding: 2px;
  border: 1px solid rgba(23, 32, 51, 0.72);
  border-radius: 4px;

  &::after {
    content: '';
    position: absolute;
    right: -4px;
    top: 3px;
    width: 2px;
    height: 5px;
    border-radius: 0 2px 2px 0;
    background: rgba(23, 32, 51, 0.72);
  }

  span {
    display: block;
    height: 100%;
    max-width: 100%;
    border-radius: 2px;
    background: linear-gradient(90deg, var(--phone-accent), #7ddf93);
  }
}

.screen-content {
  position: absolute;
  inset: 36px 0 0;
  display: flex;
  flex-direction: column;
}
</style>
