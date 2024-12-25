import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import '@mantine/core/styles.css';

import { MantineProvider } from '@mantine/core';


const accessKeyId = window.prompt("accesssKey", localStorage.getItem("accessKeyId") || "");
if (accessKeyId) {
  localStorage.setItem("accessKeyId", accessKeyId);
}

const secretKey = window.prompt("secretKey", localStorage.getItem("secretKey") || "");
if (secretKey) {
  localStorage.setItem("secretKey", secretKey);
}

createRoot(document.getElementById('root')!).render(
    <MantineProvider>
      <App />
    </MantineProvider>
)
