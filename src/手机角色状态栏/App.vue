<template>
  <main class="phone-status-root">
    <PhoneFrame :state="store.data">
      <ChatScreen :state="store.data" />
      <EmptyState v-if="!store.ready" />
    </PhoneFrame>
  </main>
</template>

<script setup lang="ts">
import ChatScreen from './components/ChatScreen.vue';
import EmptyState from './components/EmptyState.vue';
import PhoneFrame from './components/PhoneFrame.vue';
import { usePhoneStore } from './store';
import './styles/tokens.scss';

const store = usePhoneStore();
</script>

<style lang="scss" scoped>
.phone-status-root {
  box-sizing: border-box;
  width: 100%;
  padding: 10px 6px 14px;
  display: flex;
  justify-content: center;
  color: var(--phone-text);
  overflow-x: hidden;
}
</style>
