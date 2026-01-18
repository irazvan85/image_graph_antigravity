import React, { useState, useEffect } from 'react';
import GraphView from './components/GraphView';
import ControlPanel from './components/ControlPanel';

const API_Base = "http://localhost:8001";

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

  const handleUpdateParams = (threshold) => {
    setSimThreshold(threshold);
    fetchGraph(threshold);
  }

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', fontFamily: 'Segoe UI, sans-serif' }}>
      <div style={{ width: '350px', flexShrink: 0 }}>
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
  );
}

export default App;
