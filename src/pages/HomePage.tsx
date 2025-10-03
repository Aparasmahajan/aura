import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Globe } from 'lucide-react';
import './HomePage.scss';

const HomePage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="home-page">
      <div className="home-container">
        <div className="home-content">
          <Globe size={64} className="home-icon" />
          <h1>Aura</h1>
          <p className="subtitle">
            Access your portal by visiting <code>/portalName</code>
          </p>
          <div className="info-box">
            <h3>Example</h3>
            <p>If your portal name is "aura", visit:</p>
            <code className="url-example">/aura</code>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
