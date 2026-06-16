<template>
  <header class="chat-header">
    <button class="back" aria-label="返回" type="button">‹</button>
    <div class="avatar" :class="{ empty: !state.character.avatar }">
      <img v-if="state.character.avatar" :src="state.character.avatar" alt="" />
      <span v-else>{{ avatarText }}</span>
    </div>
    <div class="identity">
      <div class="name-row">
        <strong>{{ state.character.name }}</strong>
        <span :class="['online-dot', { offline: !state.character.online }]"></span>
      </div>
      <p>{{ subtitle }}</p>
    </div>
  </header>
</template>

<script setup lang="ts">
import type { PhoneState } from '../types';

const props = defineProps<{ state: PhoneState }>();

const avatarText = computed(() => props.state.character.name.slice(0, 1) || '角');
const subtitle = computed(() => {
  const parts = [props.state.character.status_text, props.state.character.mood, props.state.character.location].filter(Boolean);
  return parts.join(' · ');
});
</script>

<style lang="scss" scoped>
.chat-header {
  box-sizing: border-box;
  height: 66px;
  padding: 8px 14px 10px 10px;
  display: flex;
  align-items: center;
  gap: 10px;
  border-bottom: 1px solid var(--phone-line);
  background: rgba(250, 252, 255, 0.76);
  backdrop-filter: blur(14px);
}

.back {
  width: 24px;
  border: 0;
  background: transparent;
  color: var(--phone-accent-deep);
  font-size: 30px;
  line-height: 1;
  padding: 0;
}

.avatar {
  width: 42px;
  height: 42px;
  flex: 0 0 42px;
  border-radius: 16px;
  overflow: hidden;
  background: linear-gradient(135deg, #b6fff0, #7aa8ff);
  display: grid;
  place-items: center;
  color: #ffffff;
  font-weight: 800;
  box-shadow: 0 8px 18px rgba(49, 130, 206, 0.25);

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.identity {
  min-width: 0;
  flex: 1;

  p {
    margin: 3px 0 0;
    color: var(--phone-muted);
    font-size: 11px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
}

.name-row {
  display: flex;
  align-items: center;
  gap: 6px;

  strong {
    min-width: 0;
    font-size: 15px;
    color: var(--phone-text);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
}

.online-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #2bd67b;
  box-shadow: 0 0 0 3px rgba(43, 214, 123, 0.16);

  &.offline {
    background: #9aa7b8;
    box-shadow: 0 0 0 3px rgba(154, 167, 184, 0.16);
  }
}
</style>
