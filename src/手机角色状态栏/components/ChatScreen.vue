<template>
  <section class="chat-screen">
    <PhoneHeader :state="state" />

    <div class="status-card">
      <span class="label">当前状态</span>
      <strong>{{ state.character.mood }}</strong>
      <p>{{ state.character.location }}</p>
    </div>

    <div class="message-list" aria-label="聊天记录">
      <MessageBubble
        v-for="(message, index) in displayMessages"
        :key="`${message.role}-${index}-${message.text}`"
        :message="message"
        :fallback-name="state.character.name"
      />
    </div>

    <StatusFooter />
  </section>
</template>

<script setup lang="ts">
import MessageBubble from './MessageBubble.vue';
import PhoneHeader from './PhoneHeader.vue';
import StatusFooter from './StatusFooter.vue';
import type { PhoneMessage, PhoneState } from '../types';

const props = defineProps<{ state: PhoneState }>();

const displayMessages = computed<PhoneMessage[]>(() => {
  if (props.state.messages.length > 0) {
    return props.state.messages;
  }
  return [
    { role: 'system', name: '', text: '尚未读取到聊天消息，正在等待角色状态。', time: '' },
    {
      role: 'assistant',
      name: props.state.character.name,
      text: props.state.character.status_text || '我会在这里显示当前状态和对话。',
      time: '现在',
    },
  ];
});
</script>

<style lang="scss" scoped>
.chat-screen {
  position: relative;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.status-card {
  margin: 10px 13px 6px;
  padding: 10px 12px;
  border-radius: 18px;
  background: linear-gradient(135deg, rgba(49, 199, 176, 0.18), rgba(255, 255, 255, 0.72));
  border: 1px solid rgba(49, 199, 176, 0.18);
  box-shadow: 0 12px 24px rgba(15, 23, 42, 0.08);

  .label {
    color: var(--phone-accent-deep);
    font-size: 10px;
    font-weight: 800;
    letter-spacing: 0.08em;
  }

  strong {
    display: block;
    margin-top: 2px;
    font-size: 15px;
    color: var(--phone-text);
  }

  p {
    margin: 3px 0 0;
    color: var(--phone-muted);
    font-size: 11px;
    overflow-wrap: anywhere;
  }
}

.message-list {
  min-height: 0;
  flex: 1;
  padding: 7px 12px 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: rgba(107, 122, 144, 0.35) transparent;

  &::-webkit-scrollbar {
    width: 4px;
  }

  &::-webkit-scrollbar-thumb {
    border-radius: 999px;
    background: rgba(107, 122, 144, 0.32);
  }
}
</style>
