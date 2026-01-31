import React, { useState, useEffect, useCallback } from 'react';
import GraphView from './components/GraphView';
import ControlPanel from './components/ControlPanel';
import { ToastProvider } from './components/Toast';

const API_Base = "http://localhost:8001";

// Simple debounce utility
function debounce(fn, delay) {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

function App() {
  const [elements, setElements] = useState([]);
  const [selectedNode, setSelectedNode] = useState(null);
  const [simThreshold, setSimThreshold] = useState(0.7);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchGraph = async (threshold = 0.7) => {
    try {
      const res = await fetch(`${API_Base}/graph?sim_threshold=${threshold}`);
      const data = await res.json();
      setElements(data.elements);
    } catch (e) {
      console.error("Failed to fetch graph", e);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchGraph();
  }, []);

  // Debounced fetch for slider changes
  const debouncedFetchGraph = useCallback(
    debounce((threshold) => fetchGraph(threshold), 300),
    []
  );

  const handleUpdateParams = (threshold) => {
    setSimThreshold(threshold);
    debouncedFetchGraph(threshold);
  }

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl+F or Cmd+F to focus search
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        const searchInput = document.querySelector('input[placeholder="Search tags or images..."]');
        if (searchInput) searchInput.focus();
      }
      // Esc to deselect
      if (e.key === 'Escape') {
        setSelectedNode(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <ToastProvider>
      <div style={{
        display: 'flex',
        height: '100vh',
        width: '100vw',
        fontFamily: "'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif",
        background: 'var(--bg-primary)'
      }}>
        <div style={{
          width: '360px',
          flexShrink: 0,
          height: '100%'
        }}>
          <ControlPanel
            onScan={() => fetchGraph(simThreshold)}
            onUpdateParams={handleUpdateParams}
            selectedNode={selectedNode}
            onSearch={setSearchQuery}
          />
        </div>
        <div style={{ flex: 1, position: 'relative' }}>
          <GraphView
            elements={elements}
            onNodeClick={setSelectedNode}
            searchQuery={searchQuery}
          />
        </div>
      </div>
    </ToastProvider>
  );
}

export default App;
