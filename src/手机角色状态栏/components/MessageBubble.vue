<template>
  <article :class="['message-row', message.role]">
    <div v-if="message.role !== 'user'" class="small-avatar">{{ avatarText }}</div>
    <div class="bubble-wrap">
      <div class="meta" v-if="message.name || message.time">
        <span>{{ message.name }}</span>
        <time>{{ message.time }}</time>
      </div>
      <p class="bubble">{{ message.text }}</p>
    </div>
  </article>
</template>

<script setup lang="ts">
import type { PhoneMessage } from '../types';

const props = defineProps<{ message: PhoneMessage; fallbackName: string }>();
const avatarText = computed(() => (props.message.name || props.fallbackName || '角').slice(0, 1));
</script>

<style lang="scss" scoped>
.message-row {
  display: flex;
  align-items: flex-end;
  gap: 7px;
  animation: bubble-in 0.24s ease both;

  &.user {
    justify-content: flex-end;

    .bubble-wrap {
      align-items: flex-end;
    }

    .bubble {
      color: #ffffff;
      background: linear-gradient(135deg, var(--phone-user), #35c5f3);
      border-bottom-right-radius: 7px;
      box-shadow: 0 8px 18px rgba(31, 156, 240, 0.24);
    }

    .meta {
      justify-content: flex-end;
    }
  }

  &.system {
    justify-content: center;

    .bubble-wrap {
      align-items: center;
    }

    .bubble {
      max-width: 92%;
      color: var(--phone-muted);
      background: rgba(255, 255, 255, 0.48);
      border-radius: 999px;
      font-size: 11px;
      box-shadow: none;
    }
  }
}

.small-avatar {
  width: 26px;
  height: 26px;
  flex: 0 0 26px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  color: #ffffff;
  font-size: 12px;
  font-weight: 800;
  background: linear-gradient(135deg, #5eead4, #60a5fa);
}

.bubble-wrap {
  max-width: 76%;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.meta {
  display: flex;
  align-items: center;
  gap: 7px;
  color: var(--phone-muted);
  font-size: 10px;
  padding: 0 4px;

  span,
  time {
    white-space: nowrap;
  }
}

.bubble {
  margin: 0;
  padding: 9px 11px;
  border-radius: 17px;
  border-bottom-left-radius: 7px;
  color: var(--phone-text);
  background: var(--phone-assistant);
  font-size: 13px;
  line-height: 1.48;
  overflow-wrap: anywhere;
  box-shadow: 0 9px 20px rgba(15, 23, 42, 0.08);
}

@keyframes bubble-in {
  from {
    opacity: 0;
    transform: translateY(8px) scale(0.98);
  }

  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}
</style>
