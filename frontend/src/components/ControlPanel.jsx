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
    const [provider, setProvider] = useState("gemini");
    const [apiKey, setApiKey] = useState("");
    const [models, setModels] = useState([]);
    const [selectedModel, setSelectedModel] = useState("gemini-1.5-flash-latest");

    useEffect(() => {
        const fetchModels = async () => {
            // OpenAI keys start with sk-, Gemini keys are longer/different
            // We just check for some minimum length
            if (apiKey.length > 20 || (provider === 'openai' && apiKey.startsWith('sk-'))) {
                try {
                    const res = await fetch(`${API_Base}/models`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ api_key: apiKey, provider: provider })
                    });
                    if (res.ok) {
                        const data = await res.json();
                        setModels(data.models);
                        if (data.models.length > 0) {
                            // If OpenAI, gpt-4o-mini is a good default
                            const defaultModel = provider === 'openai' ? 'gpt-4o-mini' : data.models[0].id;
                            setSelectedModel(data.models.find(m => m.id === defaultModel)?.id || data.models[0].id);
                        }
                    }
                } catch (e) {
                    console.error("Failed to fetch models", e);
                }
            }
        };
        if (useLlm) fetchModels();
    }, [apiKey, useLlm, provider]);

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
        if (selectedNode && (selectedNode.type === 'image' || selectedNode.type === 'text')) {
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
                    api_key: apiKey,
                    model_id: selectedModel,
                    provider: provider
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

    const handleReset = async () => {
        if (!window.confirm("Are you sure you want to clear the entire database? This cannot be undone.")) return;
        try {
            const res = await fetch(`${API_Base}/reset`, { method: 'POST' });
            if (res.ok) {
                alert("Database cleared");
                onScan(); // Refresh graph
            }
        } catch (e) {
            alert("Failed to reset database");
        }
    };

    const handleStop = async () => {
        try {
            const res = await fetch(`${API_Base}/stop`, { method: 'POST' });
            if (!res.ok) alert("Failed to stop scan");
        } catch (e) {
            console.error("Error stopping scan", e);
        }
    };

    const handleSearchChange = (e) => {
        const val = e.target.value;
        setSearchQuery(val);
        onSearch(val);
    };

    const progressPct = progress.total > 0 ? (progress.processed / progress.total) * 100 : 0;

    return (
        <div style={{
            padding: '20px',
            background: '#f8f9fa',
            height: '100%',
            borderRight: '1px solid #ddd',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
            overflowY: 'auto'
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ margin: 0 }}>ImageGraph</h2>
                <button
                    onClick={handleReset}
                    style={{ fontSize: '11px', padding: '4px 8px', background: '#dc3545', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                >
                    Reset DB
                </button>
            </div>

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
                        <div style={{ marginTop: '10px', padding: '10px', background: '#f8f8f8', borderRadius: '4px' }}>
                            <div style={{ marginBottom: '8px' }}>
                                <label style={{ fontSize: '11px', color: '#666', display: 'block' }}>Provider:</label>
                                <select
                                    value={provider}
                                    onChange={(e) => {
                                        setProvider(e.target.value);
                                        setModels([]);
                                        setApiKey("");
                                    }}
                                    style={{ width: '100%', padding: '6px', fontSize: '12px' }}
                                >
                                    <option value="gemini">Google Gemini</option>
                                    <option value="openai">OpenAI</option>
                                </select>
                            </div>

                            <input
                                type="password"
                                value={apiKey}
                                onChange={(e) => setApiKey(e.target.value)}
                                placeholder={`${provider === 'gemini' ? 'Gemini' : 'OpenAI'} API Key`}
                                style={{ width: '100%', marginBottom: '8px', padding: '6px', fontSize: '12px', boxSizing: 'border-box' }}
                            />

                            {models.length > 0 && (
                                <div>
                                    <label style={{ fontSize: '11px', color: '#666', marginBottom: '2px', display: 'block' }}>Select Model:</label>
                                    <select
                                        value={selectedModel}
                                        onChange={(e) => setSelectedModel(e.target.value)}
                                        style={{ width: '100%', padding: '6px', fontSize: '12px' }}
                                    >
                                        {models.map(m => (
                                            <option key={m.id} value={m.id}>{m.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {(status === "scanning" || (progress.logs && progress.logs.length > 0)) && (
                <div style={{ padding: '10px', background: '#fff', borderRadius: '8px', border: '1px solid #ddd', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between' }}>
                        <span>{status === "scanning" ? 'Scanning Folder...' : 'Last Scan Result'}</span>
                        <span>{progress.processed} / {progress.total}</span>
                    </div>

                    {/* Progress Bar */}
                    <div style={{ width: '100%', height: '8px', background: '#eee', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ width: `${progressPct}%`, height: '100%', background: '#28a745', transition: 'width 0.3s ease' }} />
                    </div>

                    {/* Log Window */}
                    <div style={{
                        height: '120px',
                        background: '#1e1e1e',
                        color: '#d4d4d4',
                        padding: '8px',
                        borderRadius: '4px',
                        fontSize: '10px',
                        fontFamily: 'monospace',
                        overflowY: 'auto',
                        display: 'flex',
                        flexDirection: 'column-reverse' // Auto-scroll to bottom
                    }}>
                        {progress.logs && [...progress.logs].reverse().map((line, i) => (
                            <div key={i} style={{ marginBottom: '2px' }}>{line}</div>
                        ))}
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

            <div style={{ borderTop: '1px solid #eee', paddingTop: '10px' }}>
                {selectedNode ? (
                    <div style={{ padding: '10px', background: '#fff', borderRadius: '8px', border: '1px solid #eee' }}>
                        <h3 style={{ marginTop: 0 }}>{selectedNode.name}</h3>
                        <div style={{ color: '#666', fontSize: '12px', textTransform: 'uppercase' }}>Type: {selectedNode.type}</div>

                        {imageMetadata && (
                            <div style={{ marginTop: '15px' }}>
                                {selectedNode.type === 'image' ? (
                                    <img
                                        src={`${API_Base}/image_content/${imageMetadata.id}`}
                                        alt="preview"
                                        style={{ width: '100%', borderRadius: '4px', marginBottom: '10px' }}
                                    />
                                ) : (
                                    <div style={{
                                        padding: '10px',
                                        background: '#f1f3f5',
                                        borderRadius: '4px',
                                        fontSize: '12px',
                                        maxHeight: '200px',
                                        overflowY: 'auto',
                                        marginBottom: '10px',
                                        whiteSpace: 'pre-wrap',
                                        border: '1px solid #dee2e6'
                                    }}>
                                        {imageMetadata.ocr_text || "No content"}
                                    </div>
                                )}
                                <p style={{ fontSize: '14px' }}><strong>{selectedNode.type === 'image' ? 'Caption' : 'Summary'}:</strong> {imageMetadata.caption}</p>
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
