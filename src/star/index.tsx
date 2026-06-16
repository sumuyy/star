import { StrictMode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import App from './src/App';
import './src/index.css';

let root: Root | null = null;

const init = () => {
  const mountNode = document.getElementById('app');
  if (!mountNode) {
    throw Error('[star] missing #app mount node');
  }

  console.info('[star] iframe mount');
  root = createRoot(mountNode);
  root.render(
    <StrictMode>
      <App />
    </StrictMode>,
  );

  $(window).on('pagehide.star', () => {
    console.info('[star] iframe unmount');
    root?.unmount();
    root = null;
    $(window).off('pagehide.star');
  });
};

$(() => errorCatched(init)());
