import React from 'react';
import ReactDOM from 'react-dom/client';
import './styling/global/index.css';
import App from './App';
import { initializeSyncEngine } from './utils/syncEngine';
import { warmServer } from './utils/warmup';

initializeSyncEngine(); //Offline sync watching internet status
warmServer();

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);