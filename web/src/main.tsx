import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css'; // Линкува Tailwind стиловете

// Намира root елемента от index.html
const rootElement = document.getElementById('root');

if (rootElement) {
  // Зарежда App компонента вътре в него
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
} else {
    // В случай, че element root липсва (за да няма грешка)
    console.error('Failed to find the root element with ID "root".');
}