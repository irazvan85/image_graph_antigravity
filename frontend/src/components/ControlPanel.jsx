import React, { useState, useEffect } from 'react';
import { Search, Play, Settings, Image as ImageIcon } from 'lucide-react';

const API_Base = "http://localhost:8001";

const ControlPanel = ({ onScan, onUpdateParams, onSelectImage, selectedNode, onSearch }) => {
    const [path, setPath] = useState("");
    const [status, setStatus] = useState("idle");
    const [progress, setProgress] = useState({ current: "", processed: 0, total: 0 });
    const [simThreshold, setSimThreshold] = useState(0.7);
    const [imageMetadata, setImageMetadata] = useState(null);
    const [searchQuery, setSearchQuery] = useState("");

    // LLM Settings
    const [useLlm, setUseLlm] = useState(false);
    const [apiKey, setApiKey] = useState("");

    useEffect(() => {
        const checkStatus = async () => {
            try {
                const res = await fetch(`${API_Base}/progress`);
                const data = await res.json();
                if (data.status === "scanning") {
                    setStatus("scanning");
                    // Also update basic details if possible
                    setProgress(data);
                }
            } catch (e) {
                console.error("Failed to check status", e);
            }
        }
        checkStatus();
    }, []);

    useEffect(() => {
        let interval;
        if (status === "scanning") {
            interval = setInterval(async () => {
                try {
                    const res = await fetch(`${API_Base}/progress`);
                    const data = await res.json();
                    setProgress(data);
                    if (data.status === "idle" && data.total > 0 && data.processed === data.total) {
                        setStatus("idle");
                        onScan(); // Refresh graph
                    }
                } catch (e) {
                    console.error(e);
                }
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [status, onScan]);

    useEffect(() => {
        if (selectedNode && selectedNode.type === 'image') {
            // Fetch details
            const id = selectedNode.id.split('_')[1];
            fetch(`${API_Base}/image/${id}`)
                .then(res => res.json())
                .then(data => setImageMetadata(data))
                .catch(e => console.error(e));
        } else {
            setImageMetadata(null);
        }
    }, [selectedNode]);

    const handleScan = async () => {
        if (!path) return;
        try {
            const res = await fetch(`${API_Base}/scan`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    path,
                    use_llm: useLlm,
                    api_key: apiKey
                })
            });
            if (res.ok) {
                setStatus("scanning");
            } else {
                alert("Scan failed to start (Check API Key if LLM enabled)");
            }
        } catch (e) {
            alert("Error connecting backend");
        }
    };

    const handleSearchChange = (e) => {
        const val = e.target.value;
        setSearchQuery(val);
        onSearch(val);
    };

    return (
        <div style={{ padding: '20px', background: '#f8f9fa', height: '100%', borderRight: '1px solid #ddd', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h2 style={{ margin: 0 }}>ImageGraph</h2>

            {/* Search Box */}
            <div>
                <div style={{ display: 'flex', gap: '5px', padding: '5px', background: '#fff', border: '1px solid #ddd', borderRadius: '4px' }}>
                    <Search size={18} color="#888" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={handleSearchChange}
                        placeholder="Search tags or images..."
                        style={{ border: 'none', outline: 'none', flex: 1, fontSize: '14px' }}
                    />
                </div>
            </div>

            {/* Analysis Methods Tooltip/Info */}
            <div style={{ fontSize: '12px', color: '#666', background: '#eef2f7', padding: '8px', borderRadius: '4px', borderLeft: '4px solid #007bff' }}>
                <strong>Analysis Methods:</strong>
                <ul style={{ margin: '4px 0 0 16px', padding: 0 }}>
                    <li>Captioning: BLIP</li>
                    <li>Text Extraction: EasyOCR</li>
                    <li>Connectivity: CLIP (ViT-B-32)</li>
                    {useLlm && <li>Deep Analysis: Gemini 1.5 Flash</li>}
                </ul>
            </div>

            <div style={{ padding: '15px', background: '#fff', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Scan Folder</label>
                <div style={{ display: 'flex', gap: '5px' }}>
                    <input
                        type="text"
                        value={path}
                        onChange={(e) => setPath(e.target.value)}
                        placeholder="C:/Photos"
                        style={{ flex: 1, padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
                    />
                    <button onClick={handleScan} disabled={status === "scanning"} style={{ padding: '8px 15px', background: '#007bff', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                        <Play size={16} />
                    </button>
                </div>

                {/* LLM Toggle */}
                <div style={{ marginTop: '15px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
                        <input type="checkbox" checked={useLlm} onChange={(e) => setUseLlm(e.target.checked)} />
                        Enable Deep LLM Analysis
                    </label>
                    {useLlm && (
                        <input
                            type="password"
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            placeholder="Gemini API Key"
                            style={{ width: '100%', marginTop: '8px', padding: '6px', fontSize: '12px', boxSizing: 'border-box' }}
                        />
                    )}
                </div>
            </div>

            {status === "scanning" && (
                <div style={{ padding: '10px', background: '#e9ecef', borderRadius: '4px' }}>
                    <div style={{ fontWeight: 'bold' }}>Scanning... {progress.processed} / {progress.total}</div>
                    <div style={{ fontSize: '11px', color: '#666', marginTop: '5px', wordBreak: 'break-all' }}>
                        {progress.current}
                    </div>
                </div>
            )}

            <div>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px' }}>Similarity Threshold: {simThreshold}</label>
                <input
                    type="range"
                    min="0.5"
                    max="1.0"
                    step="0.01"
                    value={simThreshold}
                    onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        setSimThreshold(val);
                        onUpdateParams(val);
                    }}
                    style={{ width: '100%' }}
                />
            </div>

            <div style={{ flex: 1, overflowY: 'auto' }}>
                {selectedNode ? (
                    <div style={{ padding: '10px', background: '#fff', borderRadius: '8px', border: '1px solid #eee' }}>
                        <h3 style={{ marginTop: 0 }}>{selectedNode.name}</h3>
                        <div style={{ color: '#666', fontSize: '12px', textTransform: 'uppercase' }}>Type: {selectedNode.type}</div>

                        {imageMetadata && (
                            <div style={{ marginTop: '15px' }}>
                                <img
                                    src={`${API_Base}/image_content/${imageMetadata.id}`}
                                    alt="preview"
                                    style={{ width: '100%', borderRadius: '4px', marginBottom: '10px' }}
                                />
                                <p style={{ fontSize: '14px' }}><strong>Caption:</strong> {imageMetadata.caption}</p>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                                    {imageMetadata.tags.map(tag => (
                                        <span key={tag} style={{ padding: '2px 8px', background: '#e9ecef', borderRadius: '12px', fontSize: '11px' }}>{tag}</span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div style={{ color: '#888', fontStyle: 'italic', textAlign: 'center', marginTop: '20px' }}>
                        Select a node to view details
                    </div>
                )}
            </div>
        </div>
    );
};

export default ControlPanel;
