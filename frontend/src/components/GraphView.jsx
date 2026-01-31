import React, { useEffect, useRef, useState } from 'react';
import CytoscapeComponent from 'react-cytoscapejs';
import { ZoomIn, ZoomOut, Maximize2, Grid3X3 } from 'lucide-react';

const API_Base = "http://localhost:8001";

const GraphView = ({ elements, onNodeClick, searchQuery }) => {
    const cyRef = useRef(null);
    const [layout, setLayout] = useState('cose');

    const style = [
        {
            selector: 'node',
            style: {
                'label': 'data(name)',
                'text-valign': 'bottom',
                'text-halign': 'center',
                'font-size': '11px',
                'font-weight': '500',
                'color': '#e4e6eb',
                'text-outline-color': '#0f1419',
                'text-outline-width': '2px',
                'background-color': '#6b7280',
                'width': 30,
                'height': 30,
                'transition-property': 'background-color, opacity, width, height, border-width',
                'transition-duration': '0.25s',
                'border-width': 0,
                'border-color': '#fbbf24'
            }
        },
        {
            selector: 'node[type="image"]',
            style: {
                'background-color': '#3b82f6',
                'shape': 'round-rectangle',
                'width': 64,
                'height': 64,
                'background-image': (node) => `${API_Base}/thumbnail/${node.data('id').split('_')[1]}`,
                'background-fit': 'cover',
                'border-width': 2,
                'border-color': 'rgba(255, 255, 255, 0.2)'
            }
        },
        {
            selector: 'node[type="text"]',
            style: {
                'background-color': '#f59e0b',
                'shape': 'ellipse',
                'width': 40,
                'height': 40
            }
        },
        {
            selector: 'node[type="concept"]',
            style: {
                'background-color': '#10b981',
                'shape': 'ellipse',
                'width': 22,
                'height': 22,
                'font-size': '9px'
            }
        },
        {
            selector: 'node:active',
            style: {
                'overlay-opacity': 0.1,
                'overlay-color': '#3b82f6'
            }
        },
        {
            selector: 'node.highlighted',
            style: {
                'background-color': '#fbbf24',
                'color': '#fbbf24',
                'font-weight': 'bold',
                'width': 56,
                'height': 56,
                'z-index': 1000,
                'border-width': 3,
                'border-color': '#ffffff'
            }
        },
        {
            selector: 'node.dimmed',
            style: {
                'opacity': 0.15
            }
        },
        {
            selector: 'node:selected',
            style: {
                'border-width': 3,
                'border-color': '#8b5cf6'
            }
        },
        {
            selector: 'edge',
            style: {
                'width': 1,
                'line-color': 'rgba(107, 114, 128, 0.4)',
                'curve-style': 'bezier',
                'target-arrow-shape': 'none',
                'transition-property': 'opacity, line-color, width',
                'transition-duration': '0.25s'
            }
        },
        {
            selector: 'edge.dimmed',
            style: {
                'opacity': 0.05
            }
        },
        {
            selector: 'edge[type="has_concept"]',
            style: {
                'line-color': 'rgba(107, 114, 128, 0.25)',
                'width': 1
            }
        },
        {
            selector: 'edge[type="similar"]',
            style: {
                'line-color': 'rgba(59, 130, 246, 0.5)',
                'width': 2,
                'line-style': 'solid'
            }
        },
        {
            selector: 'edge:selected',
            style: {
                'line-color': '#8b5cf6',
                'width': 3
            }
        }
    ];

    // CSS-based animation is handled in the stylesheet definition for edge[type="similar"]

    const runLayout = (name) => {
        if (!cyRef.current) return;

        const layouts = {
            cose: {
                name: 'cose',
                animate: true,
                animationDuration: 500,
                randomize: false,
                componentSpacing: 120,
                nodeRepulsion: 500000,
                edgeElasticity: 100,
                nestingFactor: 5,
            },
            circle: {
                name: 'circle',
                animate: true,
                animationDuration: 500,
            },
            grid: {
                name: 'grid',
                animate: true,
                animationDuration: 500,
            },
            concentric: {
                name: 'concentric',
                animate: true,
                animationDuration: 500,
                minNodeSpacing: 50,
            }
        };

        cyRef.current.layout(layouts[name] || layouts.cose).run();
    };

    useEffect(() => {
        if (cyRef.current) {
            runLayout(layout);
        }
    }, [elements, layout]);

    useEffect(() => {
        if (!cyRef.current) return;
        const cy = cyRef.current;

        if (!searchQuery) {
            cy.elements().removeClass('highlighted dimmed');
            return;
        }

        const query = searchQuery.toLowerCase();
        const matches = cy.nodes().filter(node => {
            const data = node.data();
            return (data.name && data.name.toLowerCase().includes(query)) ||
                (data.caption && data.caption.toLowerCase().includes(query));
        });

        cy.elements().addClass('dimmed').removeClass('highlighted');
        matches.removeClass('dimmed').addClass('highlighted');

        if (matches.length > 0) {
            cy.animate({
                center: { eles: matches },
                zoom: Math.min(cy.zoom() * 1.2, 2),
                duration: 400,
                easing: 'ease-out-cubic'
            });
        }
    }, [searchQuery]);

    const handleZoomIn = () => {
        if (cyRef.current) {
            cyRef.current.animate({ zoom: cyRef.current.zoom() * 1.3, duration: 200 });
        }
    };

    const handleZoomOut = () => {
        if (cyRef.current) {
            cyRef.current.animate({ zoom: cyRef.current.zoom() / 1.3, duration: 200 });
        }
    };

    const handleFit = () => {
        if (cyRef.current) {
            cyRef.current.animate({ fit: { padding: 50 }, duration: 300 });
        }
    };

    const controlsStyle = {
        position: 'absolute',
        top: '16px',
        right: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        zIndex: 100
    };

    const btnStyle = {
        width: '36px',
        height: '36px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-md)',
        color: 'var(--text-secondary)',
        cursor: 'pointer',
        transition: 'all var(--transition-fast)',
        backdropFilter: 'blur(8px)'
    };

    const legendStyle = {
        position: 'absolute',
        bottom: '16px',
        right: '16px',
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-md)',
        padding: '12px',
        fontSize: '11px',
        color: 'var(--text-secondary)',
        backdropFilter: 'blur(8px)',
        zIndex: 100
    };

    const legendItem = {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginBottom: '6px'
    };

    // Empty state
    if (!elements || elements.length === 0) {
        return (
            <div style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'var(--bg-primary)',
                color: 'var(--text-muted)'
            }}>
                <Grid3X3 size={64} style={{ marginBottom: '20px', opacity: 0.3 }} />
                <div style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px', color: 'var(--text-secondary)' }}>
                    No Graph Data
                </div>
                <div style={{ fontSize: '13px', maxWidth: '300px', textAlign: 'center', lineHeight: '1.5' }}>
                    Enter a folder path in the control panel and click the play button to analyze your images.
                </div>
            </div>
        );
    }

    return (
        <div style={{ width: '100%', height: '100%', position: 'relative', background: 'var(--bg-primary)' }}>
            <CytoscapeComponent
                elements={elements}
                style={{ width: '100%', height: '100%' }}
                stylesheet={style}
                cy={(cy) => {
                    cyRef.current = cy;
                    cy.on('tap', 'node', (event) => {
                        onNodeClick(event.target.data());
                    });
                    cy.on('tap', (event) => {
                        if (event.target === cy) {
                            onNodeClick(null);
                        }
                    });
                }}
            />

            {/* Floating Controls */}
            <div style={controlsStyle}>
                <button
                    style={btnStyle}
                    onClick={handleZoomIn}
                    onMouseOver={(e) => { e.currentTarget.style.background = 'var(--bg-elevated)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
                    onMouseOut={(e) => { e.currentTarget.style.background = 'var(--bg-surface)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
                    title="Zoom In"
                >
                    <ZoomIn size={18} />
                </button>
                <button
                    style={btnStyle}
                    onClick={handleZoomOut}
                    onMouseOver={(e) => { e.currentTarget.style.background = 'var(--bg-elevated)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
                    onMouseOut={(e) => { e.currentTarget.style.background = 'var(--bg-surface)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
                    title="Zoom Out"
                >
                    <ZoomOut size={18} />
                </button>
                <button
                    style={btnStyle}
                    onClick={handleFit}
                    onMouseOver={(e) => { e.currentTarget.style.background = 'var(--bg-elevated)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
                    onMouseOut={(e) => { e.currentTarget.style.background = 'var(--bg-surface)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
                    title="Fit to Screen"
                >
                    <Maximize2 size={18} />
                </button>

                <div style={{ position: 'relative' }}>
                    <button
                        style={btnStyle}
                        onClick={() => {
                            const layouts = ['cose', 'circle', 'grid', 'concentric'];
                            const nextIdx = (layouts.indexOf(layout) + 1) % layouts.length;
                            setLayout(layouts[nextIdx]);
                        }}
                        onMouseOver={(e) => { e.currentTarget.style.background = 'var(--bg-elevated)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
                        onMouseOut={(e) => { e.currentTarget.style.background = 'var(--bg-surface)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
                        title={`Current Layout: ${layout.charAt(0).toUpperCase() + layout.slice(1)} (Click to switch)`}
                    >
                        <Grid3X3 size={18} />
                    </button>
                    <div style={{
                        position: 'absolute',
                        right: '44px',
                        top: '0',
                        background: 'var(--bg-surface)',
                        padding: '4px 10px',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '10px',
                        whiteSpace: 'nowrap',
                        color: 'var(--text-muted)',
                        border: '1px solid var(--border-color)',
                        pointerEvents: 'none'
                    }}>
                        Layout: {layout}
                    </div>
                </div>
            </div>

            {/* Legend */}
            <div style={legendStyle}>
                <div style={{ fontWeight: '600', marginBottom: '10px', color: 'var(--text-primary)' }}>Legend</div>
                <div style={legendItem}>
                    <div style={{ width: 14, height: 14, background: '#3b82f6', borderRadius: '3px' }} />
                    <span>Images</span>
                </div>
                <div style={legendItem}>
                    <div style={{ width: 14, height: 14, background: '#f59e0b', borderRadius: '50%' }} />
                    <span>Text Files</span>
                </div>
                <div style={{ ...legendItem, marginBottom: 0 }}>
                    <div style={{ width: 12, height: 12, background: '#10b981', borderRadius: '50%' }} />
                    <span>Concepts/Tags</span>
                </div>
            </div>
        </div>
    );
};

export default GraphView;
