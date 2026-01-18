import React, { useEffect, useRef } from 'react';
import CytoscapeComponent from 'react-cytoscapejs';
import cytoscape from 'cytoscape';

const GraphView = ({ elements, onNodeClick, searchQuery }) => {
    const cyRef = useRef(null);

    const style = [
        {
            selector: 'node',
            style: {
                'label': 'data(name)',
                'text-valign': 'bottom',
                'text-halign': 'center',
                'font-size': '12px',
                'color': '#333',
                'background-color': '#888',
                'width': 30,
                'height': 30,
                'transition-property': 'background-color, opacity, color',
                'transition-duration': '0.3s'
            }
        },
        {
            selector: 'node[type="image"]',
            style: {
                'background-color': '#007bff',
                'shape': 'rectangle',
                'width': 50,
                'height': 50
            }
        },
        {
            selector: 'node[type="concept"]',
            style: {
                'background-color': '#28a745',
                'shape': 'ellipse',
                'width': 20,
                'height': 20,
                'font-size': '10px'
            }
        },
        {
            selector: 'node.highlighted',
            style: {
                'background-color': '#ffc107',
                'color': '#000',
                'font-weight': 'bold',
                'width': 60,
                'height': 60,
                'z-index': 1000
            }
        },
        {
            selector: 'node.dimmed',
            style: {
                'opacity': 0.2,
                'text-outline-opacity': 0
            }
        },
        {
            selector: 'edge',
            style: {
                'width': 1,
                'line-color': '#ccc',
                'curve-style': 'bezier',
                'target-arrow-shape': 'none',
                'transition-property': 'opacity',
                'transition-duration': '0.3s'
            }
        },
        {
            selector: 'edge.dimmed',
            style: {
                'opacity': 0.1
            }
        },
        {
            selector: 'edge[type="has_concept"]',
            style: {
                'line-color': '#ddd',
                'width': 1
            }
        },
        {
            selector: 'edge[type="similar"]',
            style: {
                'line-color': '#007bff',
                'width': 2,
                'opacity': 0.5
            }
        }
    ];

    useEffect(() => {
        if (cyRef.current) {
            cyRef.current.layout({
                name: 'cose',
                animate: true,
                randomize: false,
                componentSpacing: 100,
                nodeRepulsion: 400000,
                edgeElasticity: 100,
                nestingFactor: 5,
            }).run();
        }
    }, [elements]);

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

        // Center on matches if any
        if (matches.length > 0) {
            cy.animate({
                center: { eles: matches },
                zoom: 1.2,
                duration: 500
            });
        }
    }, [searchQuery]);

    return (
        <div style={{ width: '100%', height: '100%' }}>
            <CytoscapeComponent
                elements={elements}
                style={{ width: '100%', height: '100%' }}
                stylesheet={style}
                cy={(cy) => {
                    cyRef.current = cy;
                    cy.on('tap', 'node', (event) => {
                        onNodeClick(event.target.data());
                    });
                }}
            />
        </div>
    );
};

export default GraphView;
