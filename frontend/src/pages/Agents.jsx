import { useState, useEffect } from 'react';
import api from '../api/axios';
import ItemCard from '../components/ItemCard';

export default function Agents() {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/agents').then((res) => setAgents(res.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading"><div className="spinner" /><p>Loading agents…</p></div>;

  return (
    <div className="container">
      <div className="page-header">
        <h1 className="page-title">👤 Available Agents</h1>
      </div>
      {agents.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">👤</div>
          <h3>No agents listed yet</h3>
          <p>Check back soon!</p>
        </div>
      ) : (
        <div className="grid">
          {agents.map((agent) => <ItemCard key={agent.id} item={agent} type="agent" />)}
        </div>
      )}
    </div>
  );
}
