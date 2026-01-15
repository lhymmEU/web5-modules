
import { useState } from 'react';
import reactLogo from './assets/react.svg';
import viteLogo from '/vite.svg';
import './App.css';
import { KeyManager } from './components/KeyManager';

function App() {
  return (
    <div className="container">
      <div className="header-logos">
        <a href="https://vitejs.dev" target="_blank">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>Web5 Console</h1>

      <KeyManager />
    </div>
  );
}

export default App;
