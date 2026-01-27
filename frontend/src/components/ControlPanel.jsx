import React, { useState, useEffect } from 'react';
import { Search, Play, Square, ChevronDown, ChevronUp, Zap, Image as ImageIcon, FileText, ExternalLink, Copy } from 'lucide-react';
import { useToast } from './Toast';

const API_Base = "http://localhost:8001";

const ControlPanel = ({ onScan, onUpdateParams, onSelectImage, selectedNode, onSearch }) => {
    const toast = useToast();
    const [path, setPath] = useState("");
    const [status, setStatus] = useState("idle");
    const [progress, setProgress] = useState({ current: "", processed: 0, total: 0 });
    const [simThreshold, setSimThreshold] = useState(0.7);
    const [imageMetadata, setImageMetadata] = useState(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [llmExpanded, setLlmExpanded] = useState(false);

    // LLM Settings
    const [useLlm, setUseLlm] = useState(false);
    const [provider, setProvider] = useState("gemini");
    const [apiKey, setApiKey] = useState("");
    const [baseUrl, setBaseUrl] = useState("http://localhost:1234/v1");
    const [models, setModels] = useState([]);
    const [selectedModel, setSelectedModel] = useState("gemini-1.5-flash-latest");

    // Load settings from localStorage on mount
    useEffect(() => {
        const savedPath = localStorage.getItem('ig_path');
        const savedProvider = localStorage.getItem('ig_provider');
        const savedApiKey = localStorage.getItem('ig_apiKey');
        const savedBaseUrl = localStorage.getItem('ig_baseUrl');
        const savedUseLlm = localStorage.getItem('ig_useLlm') === 'true';

        if (savedPath) setPath(savedPath);
        if (savedProvider) setProvider(savedProvider);
        if (savedApiKey) setApiKey(savedApiKey);
        if (savedBaseUrl) setBaseUrl(savedBaseUrl);
        setUseLlm(savedUseLlm);
    }, []);

    // Save settings to localStorage on change
    useEffect(() => {
        localStorage.setItem('ig_path', path);
        localStorage.setItem('ig_provider', provider);
        localStorage.setItem('ig_apiKey', apiKey);
        localStorage.setItem('ig_baseUrl', baseUrl);
        localStorage.setItem('ig_useLlm', useLlm);
    }, [path, provider, apiKey, baseUrl, useLlm]);

    // Styles
    const styles = {
        panel: {
            padding: '20px',
            background: 'linear-gradient(180deg, var(--bg-secondary) 0%, var(--bg-primary) 100%)',
            height: '100%',
            borderRight: '1px solid var(--border-color)',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            overflowY: 'auto'
        },
        header: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingBottom: '12px',
            borderBottom: '1px solid var(--border-color)'
        },
        title: {
            margin: 0,
            fontSize: '22px',
            fontWeight: '700',
            background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
        },
        resetBtn: {
            fontSize: '11px',
            padding: '6px 12px',
            background: 'transparent',
            color: 'var(--accent-error)',
            border: '1px solid var(--accent-error)',
            borderRadius: 'var(--radius-md)',
            cursor: 'pointer',
            transition: 'all var(--transition-fast)'
        },
        searchBox: {
            display: 'flex',
            gap: '10px',
            padding: '12px 14px',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-lg)',
            transition: 'all var(--transition-fast)'
        },
        searchInput: {
            border: 'none',
            outline: 'none',
            flex: 1,
            fontSize: '14px',
            background: 'transparent',
            color: 'var(--text-primary)'
        },
        card: {
            padding: '16px',
            background: 'var(--bg-surface)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-color)',
            boxShadow: 'var(--shadow-sm)'
        },
        label: {
            display: 'block',
            marginBottom: '8px',
            fontWeight: '600',
            fontSize: '13px',
            color: 'var(--text-secondary)'
        },
        input: {
            flex: 1,
            padding: '10px 14px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-color)',
            background: 'var(--bg-elevated)',
            color: 'var(--text-primary)',
            fontSize: '13px'
        },
        primaryBtn: {
            padding: '10px 16px',
            background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
            color: '#fff',
            border: 'none',
            borderRadius: 'var(--radius-md)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: 'var(--shadow-md)',
            transition: 'all var(--transition-fast)'
        },
        stopBtn: {
            padding: '10px 16px',
            background: 'var(--accent-error)',
            color: '#fff',
            border: 'none',
            borderRadius: 'var(--radius-md)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: 'var(--shadow-md)'
        },
        infoBox: {
            fontSize: '12px',
            color: 'var(--text-secondary)',
            background: 'var(--bg-surface)',
            padding: '12px',
            borderRadius: 'var(--radius-md)',
            borderLeft: '3px solid var(--accent-primary)'
        },
        progressBar: {
            width: '100%',
            height: '6px',
            background: 'var(--bg-elevated)',
            borderRadius: 'var(--radius-full)',
            overflow: 'hidden'
        },
        progressFill: {
            height: '100%',
            background: 'linear-gradient(90deg, var(--accent-success), var(--accent-primary))',
            transition: 'width 0.3s ease',
            borderRadius: 'var(--radius-full)'
        },
        logWindow: {
            height: '100px',
            background: 'var(--bg-primary)',
            color: 'var(--text-secondary)',
            padding: '10px',
            borderRadius: 'var(--radius-md)',
            fontSize: '10px',
            fontFamily: 'monospace',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column-reverse',
            border: '1px solid var(--border-color)'
        },
        slider: {
            width: '100%',
            accentColor: 'var(--accent-primary)'
        },
        tag: {
            padding: '4px 10px',
            background: 'var(--bg-elevated)',
            color: 'var(--accent-success)',
            borderRadius: 'var(--radius-full)',
            fontSize: '11px',
            border: '1px solid var(--border-color)'
        },
        accordion: {
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 0',
            color: 'var(--text-secondary)',
            fontSize: '13px'
        },
        select: {
            width: '100%',
            padding: '8px 12px',
            fontSize: '12px',
            background: 'var(--bg-elevated)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)'
        }
    };

    useEffect(() => {
        const fetchModels = async () => {
            const isReady = (provider === 'gemini' && apiKey.length > 20) ||
                (provider === 'openai' && apiKey.startsWith('sk-')) ||
                (provider === 'lmstudio' && baseUrl.length > 10);

            if (isReady) {
                try {
                    const res = await fetch(`${API_Base}/models`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ api_key: apiKey, provider: provider, base_url: baseUrl })
                    });
                    if (res.ok) {
                        const data = await res.json();
                        setModels(data.models);
                        if (data.models.length > 0) {
                            const defaultModel = provider === 'openai' ? 'gpt-4o-mini' : data.models[0].id;
                            setSelectedModel(data.models.find(m => m.id === defaultModel)?.id || data.models[0].id);
                        }
                    } else {
                        setModels([]);
                    }
                } catch (e) {
                    console.error("Failed to fetch models", e);
                    setModels([]);
                }
            }
        };
        if (useLlm) fetchModels();
    }, [apiKey, useLlm, provider, baseUrl]);

    useEffect(() => {
        const checkStatus = async () => {
            try {
                const res = await fetch(`${API_Base}/progress`);
                const data = await res.json();
                if (data.status === "scanning") {
                    setStatus("scanning");
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
                        onScan();
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
                    provider: provider,
                    base_url: baseUrl
                })
            });
            if (res.ok) {
                setStatus("scanning");
                toast.success("Scan started successfully");
            } else {
                toast.error("Scan failed to start (Check API Key if LLM enabled)");
            }
        } catch (e) {
            toast.error("Error connecting to backend");
        }
    };

    const handleReset = async () => {
        if (!window.confirm("Are you sure you want to clear the entire database? This cannot be undone.")) return;
        try {
            const res = await fetch(`${API_Base}/reset`, { method: 'POST' });
            if (res.ok) {
                toast.success("Database cleared successfully");
                onScan();
            }
        } catch (e) {
            toast.error("Failed to reset database");
        }
    };

    const handleStop = async () => {
        try {
            const res = await fetch(`${API_Base}/stop`, { method: 'POST' });
            if (res.ok) {
                setStatus("idle");
            }
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
        <div style={styles.panel}>
            {/* Header */}
            <div style={styles.header}>
                <h2 style={styles.title}>ImageGraph</h2>
                <button
                    onClick={handleReset}
                    style={styles.resetBtn}
                    onMouseOver={(e) => { e.target.style.background = 'var(--accent-error)'; e.target.style.color = '#fff'; }}
                    onMouseOut={(e) => { e.target.style.background = 'transparent'; e.target.style.color = 'var(--accent-error)'; }}
                >
                    Reset DB
                </button>
            </div>

            {/* Search Box */}
            <div style={styles.searchBox}>
                <Search size={18} color="var(--text-muted)" />
                <input
                    type="text"
                    value={searchQuery}
                    onChange={handleSearchChange}
                    placeholder="Search tags or images..."
                    style={styles.searchInput}
                />
            </div>

            {/* Analysis Methods Info */}
            <div style={styles.infoBox}>
                <strong style={{ color: 'var(--text-primary)' }}>Analysis Methods:</strong>
                <ul style={{ margin: '6px 0 0 16px', padding: 0, lineHeight: '1.6' }}>
                    <li>Captioning: BLIP</li>
                    <li>Text Extraction: EasyOCR</li>
                    <li>Connectivity: CLIP (ViT-B-32)</li>
                    {useLlm && <li style={{ color: 'var(--accent-warning)' }}>Deep Analysis: {provider.toUpperCase()}</li>}
                </ul>
            </div>

            {/* Scan Section */}
            <div style={styles.card}>
                <label style={styles.label}>Scan Folder</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                        type="text"
                        value={path}
                        onChange={(e) => setPath(e.target.value)}
                        placeholder="C:/Photos"
                        style={styles.input}
                    />
                    {status === "scanning" ? (
                        <button onClick={handleStop} style={styles.stopBtn}>
                            <Square size={16} />
                        </button>
                    ) : (
                        <button
                            onClick={handleScan}
                            disabled={!path}
                            style={{ ...styles.primaryBtn, opacity: path ? 1 : 0.5 }}
                        >
                            <Play size={16} />
                        </button>
                    )}
                </div>

                {/* LLM Settings Accordion */}
                <div
                    style={styles.accordion}
                    onClick={() => setLlmExpanded(!llmExpanded)}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Zap size={14} color={useLlm ? 'var(--accent-warning)' : 'var(--text-muted)'} />
                        <span>Deep LLM Analysis</span>
                    </div>
                    {llmExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </div>

                {llmExpanded && (
                    <div style={{ padding: '12px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', marginTop: '8px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer', marginBottom: '12px' }}>
                            <input
                                type="checkbox"
                                checked={useLlm}
                                onChange={(e) => setUseLlm(e.target.checked)}
                                style={{ accentColor: 'var(--accent-primary)' }}
                            />
                            Enable LLM Analysis
                        </label>

                        {useLlm && (
                            <>
                                <div style={{ marginBottom: '10px' }}>
                                    <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Provider:</label>
                                    <select
                                        value={provider}
                                        onChange={(e) => {
                                            setProvider(e.target.value);
                                            setModels([]);
                                            setApiKey("");
                                        }}
                                        style={styles.select}
                                    >
                                        <option value="gemini">Google Gemini</option>
                                        <option value="openai">OpenAI</option>
                                        <option value="lmstudio">Local LLM (LM Studio)</option>
                                    </select>
                                </div>

                                {provider !== 'lmstudio' ? (
                                    <input
                                        type="password"
                                        value={apiKey}
                                        onChange={(e) => setApiKey(e.target.value)}
                                        placeholder={`${provider === 'gemini' ? 'Gemini' : 'OpenAI'} API Key`}
                                        style={{ ...styles.input, width: '100%', marginBottom: '10px' }}
                                    />
                                ) : (
                                    <input
                                        type="text"
                                        value={baseUrl}
                                        onChange={(e) => setBaseUrl(e.target.value)}
                                        placeholder="http://localhost:1234/v1"
                                        style={{ ...styles.input, width: '100%', marginBottom: '10px' }}
                                    />
                                )}

                                {models.length > 0 && (
                                    <div>
                                        <label style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>Model:</label>
                                        <select
                                            value={selectedModel}
                                            onChange={(e) => setSelectedModel(e.target.value)}
                                            style={styles.select}
                                        >
                                            {models.map(m => (
                                                <option key={m.id} value={m.id}>{m.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                )}
            </div>

            {/* Progress Section */}
            {(status === "scanning" || (progress.logs && progress.logs.length > 0)) && (
                <div style={styles.card}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <span style={{ fontSize: '12px', fontWeight: '600', color: status === 'scanning' ? 'var(--accent-success)' : 'var(--text-secondary)' }}>
                            {status === "scanning" ? '● Scanning...' : 'Last Scan'}
                        </span>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                            {progress.processed} / {progress.total}
                        </span>
                    </div>

                    <div style={styles.progressBar}>
                        <div style={{ ...styles.progressFill, width: `${progressPct}%` }} />
                    </div>

                    <div style={{ ...styles.logWindow, marginTop: '10px' }}>
                        {progress.logs && [...progress.logs].reverse().map((line, i) => (
                            <div key={i} style={{ marginBottom: '2px' }}>{line}</div>
                        ))}
                    </div>
                </div>
            )}

            {/* Similarity Threshold */}
            <div>
                <label style={{ ...styles.label, display: 'flex', justifyContent: 'space-between' }}>
                    <span>Similarity Threshold</span>
                    <span style={{ color: 'var(--accent-primary)', fontWeight: '700' }}>{simThreshold}</span>
                </label>
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
                    style={styles.slider}
                />
            </div>

            {/* Node Details */}
            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px', flex: 1 }}>
                {selectedNode ? (
                    <div style={styles.card}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                            {selectedNode.type === 'image' ? <ImageIcon size={16} color="var(--node-image)" /> :
                                selectedNode.type === 'text' ? <FileText size={16} color="var(--node-text)" /> :
                                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--node-concept)' }} />}
                            <h3 style={{ margin: 0, fontSize: '14px', color: 'var(--text-primary)' }}>{selectedNode.name}</h3>
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '12px' }}>
                            {selectedNode.type}
                        </div>

                        {imageMetadata && (
                            <div>
                                {selectedNode.type === 'image' ? (
                                    <img
                                        src={`${API_Base}/image_content/${imageMetadata.id}`}
                                        alt="preview"
                                        style={{ width: '100%', borderRadius: 'var(--radius-md)', marginBottom: '12px' }}
                                    />
                                ) : (
                                    <div style={{
                                        padding: '10px',
                                        background: 'var(--bg-elevated)',
                                        borderRadius: 'var(--radius-md)',
                                        fontSize: '12px',
                                        maxHeight: '150px',
                                        overflowY: 'auto',
                                        marginBottom: '12px',
                                        whiteSpace: 'pre-wrap',
                                        border: '1px solid var(--border-color)',
                                        color: 'var(--text-secondary)'
                                    }}>
                                        {imageMetadata.ocr_text || "No content"}
                                    </div>
                                )}
                                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                                    <strong style={{ color: 'var(--text-primary)' }}>
                                        {selectedNode.type === 'image' ? 'Caption' : 'Summary'}:
                                    </strong>{' '}
                                    {imageMetadata.caption}
                                </p>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                    {imageMetadata.tags.map(tag => (
                                        <span key={tag} style={styles.tag}>{tag}</span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div style={{
                        color: 'var(--text-muted)',
                        textAlign: 'center',
                        padding: '40px 20px',
                        background: 'var(--bg-surface)',
                        borderRadius: 'var(--radius-lg)',
                        border: '1px dashed var(--border-color)'
                    }}>
                        <ImageIcon size={32} style={{ marginBottom: '12px', opacity: 0.5 }} />
                        <div style={{ fontSize: '13px' }}>Select a node to view details</div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ControlPanel;
