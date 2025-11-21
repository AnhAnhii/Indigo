import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Global Error Handler to prevent White Screen of Death
window.onerror = function(message, source, lineno, colno, error) {
  const root = document.getElementById('root');
  if (root) {
    root.innerHTML = `
      <div style="padding: 20px; font-family: sans-serif; color: #333;">
        <h1 style="color: #e11d48;">Đã xảy ra lỗi hệ thống</h1>
        <p>Ứng dụng không thể khởi động. Vui lòng kiểm tra Console log hoặc gửi thông báo này cho kỹ thuật viên.</p>
        <div style="background: #f1f5f9; padding: 15px; border-radius: 8px; overflow: auto; font-family: monospace; margin-top: 10px;">
          <strong>Message:</strong> ${message}<br/>
          <strong>Source:</strong> ${source}:${lineno}<br/>
          <strong>Stack:</strong> ${error?.stack || 'N/A'}
        </div>
      </div>
    `;
  }
  console.error("Global Error Caught:", error);
};

const rootElement = document.getElementById('root');
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  try {
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  } catch (e) {
    console.error("Render Error:", e);
  }
} else {
  console.error("Root element 'root' not found in index.html");
}