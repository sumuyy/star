import { createApp } from 'vue';
import App from './App.vue';

function init() {
  const app = createApp(App).use(createPinia());
  app.mount('#app');
  console.info('[手机角色状态栏] 前端界面已加载');
  $(window).on('pagehide', () => app.unmount());
}

$(() => {
  errorCatched(init)();
});
