
import { useState } from 'react';

export function HomePage() {
  const [count, setCount] = useState(0);

  return (
    <div className="home-page">
      <div className="card">
        <h2>Welcome to Console</h2>
        <p>This is the main dashboard for managing your Web5 applications.</p>
        <div style={{ margin: '2rem 0' }}>
          <button onClick={() => setCount((count) => count + 1)}>
            count is {count}
          </button>
        </div>
        <p className="read-the-docs">
          Click on the Vite and React logos to learn more
        </p>
      </div>
    </div>
  );
}
