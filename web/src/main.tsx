import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css'; 
import { BrowserRouter } from 'react-router-dom';

// Намира root елемента от index.html
const rootElement = document.getElementById('root');

if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      {/* Обгръщаме App, за да работят маршрутите (Routes) */}
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </React.StrictMode>,
  );
}