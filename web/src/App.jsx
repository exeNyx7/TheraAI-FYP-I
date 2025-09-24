import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [backendData, setBackendData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Fetch data from FastAPI backend
    const fetchBackendData = async () => {
      try {
        const response = await fetch('http://localhost:8000/');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setBackendData(data);
      } catch (err) {
        setError(err.message);
        console.error('Error fetching backend data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchBackendData();
  }, []);

  return (
    <div className="App">
      <header className="App-header">
        <h1>TheraAI Frontend</h1>
        <p>React app connected to FastAPI backend</p>
        
        <div className="backend-data">
          <h2>Backend Response:</h2>
          {loading && <p>Loading backend data...</p>}
          {error && (
            <div className="error">
              <p>Error: {error}</p>
              <p>Make sure the backend is running on http://localhost:8000</p>
            </div>
          )}
          {backendData && (
            <div className="success">
              <p><strong>Message:</strong> {backendData.message}</p>
              <p><strong>Status:</strong> {backendData.status}</p>
              <p><strong>Service:</strong> {backendData.service}</p>
              <p><strong>Version:</strong> {backendData.version}</p>
            </div>
          )}
        </div>
      </header>
    </div>
  );
}

export default App;