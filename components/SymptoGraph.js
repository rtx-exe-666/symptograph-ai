"use client";
import React, { useEffect, useState, useRef } from "react";

export default function SymptoGraph({ data }) {
  const [nodes, setNodes] = useState([]);
  const [links, setLinks] = useState([]);
  const [selectedNode, setSelectedNode] = useState(null);
  const [dimensions, setDimensions] = useState({ width: 600, height: 400 });
  const [draggedNodeId, setDraggedNodeId] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const containerRef = useRef(null);
  const svgRef = useRef(null);

  // Parse nodes and links, start simple layout
  useEffect(() => {
    if (!data || !data.nodes) return;

    const width = containerRef.current?.clientWidth || 600;
    const height = containerRef.current?.clientHeight || 400;
    setDimensions({ width, height });

    const centerX = width / 2;
    const centerY = height / 2;

    // Initialize node positions
    const initialNodes = data.nodes.map((node) => {
      let x = centerX;
      let y = centerY;

      if (node.type !== "condition") {
        const angle = Math.random() * Math.PI * 2;
        const dist = 120 + Math.random() * 60;
        x = centerX + Math.cos(angle) * dist;
        y = centerY + Math.sin(angle) * dist;
      }

      return {
        ...node,
        x,
        y,
        vx: 0,
        vy: 0,
      };
    });

    setNodes(initialNodes);
    setLinks(data.links || []);
    setSelectedNode(initialNodes.find((n) => n.type === "condition") || null);
  }, [data]);

  // Run a force-directed simulation tick loop
  useEffect(() => {
    if (nodes.length === 0) return;

    let ticks = 0;
    const maxTicks = 200; // Run simulation slightly longer to settle down
    const centerX = dimensions.width / 2;
    const centerY = dimensions.height / 2;

    const interval = setInterval(() => {
      setNodes((currentNodes) => {
        const updated = currentNodes.map((n) => ({ ...n }));

        // Repel force between all nodes
        for (let i = 0; i < updated.length; i++) {
          for (let j = i + 1; j < updated.length; j++) {
            const n1 = updated[i];
            const n2 = updated[j];

            // If a node is active dragged, don't move it with automatic forces
            if (n1.id === draggedNodeId || n2.id === draggedNodeId) {
              // But still calculate forces for others
            }

            const dx = n2.x - n1.x;
            const dy = n2.y - n1.y;
            const dist = Math.hypot(dx, dy) || 1;

            if (dist < 160) {
              const force = (160 - dist) * 0.035;
              const fx = (dx / dist) * force;
              const fy = (dy / dist) * force;

              if (n1.type !== "condition" && n1.id !== draggedNodeId) {
                n1.x -= fx;
                n1.y -= fy;
              }
              if (n2.type !== "condition" && n2.id !== draggedNodeId) {
                n2.x += fx;
                n2.y += fy;
              }
            }
          }
        }

        // Link forces
        links.forEach((link) => {
          const sourceNode = updated.find((n) => n.id === link.source);
          const targetNode = updated.find((n) => n.id === link.target);

          if (sourceNode && targetNode) {
            const dx = targetNode.x - sourceNode.x;
            const dy = targetNode.y - sourceNode.y;
            const dist = Math.hypot(dx, dy) || 1;
            const desiredDist = 110;

            if (dist > desiredDist) {
              const force = (dist - desiredDist) * 0.06;
              const fx = (dx / dist) * force;
              const fy = (dy / dist) * force;

              if (sourceNode.type !== "condition" && sourceNode.id !== draggedNodeId) {
                sourceNode.x += fx;
                sourceNode.y += fy;
              }
              if (targetNode.type !== "condition" && targetNode.id !== draggedNodeId) {
                targetNode.x -= fx;
                targetNode.y -= fy;
              }
            }
          }
        });

        // Center force
        updated.forEach((node) => {
          if (node.type === "condition") {
            // Pin central node unless dragged
            if (node.id !== draggedNodeId) {
              node.x = centerX;
              node.y = centerY;
            }
            return;
          }
          if (node.id === draggedNodeId) return; // Keep dragged node exactly at cursor

          const dx = centerX - node.x;
          const dy = centerY - node.y;
          node.x += dx * 0.02;
          node.y += dy * 0.02;
        });

        return updated;
      });

      ticks++;
      // If user is actively dragging, keep the simulation warm and running!
      if (ticks >= maxTicks && !draggedNodeId) {
        clearInterval(interval);
      }
    }, 15);

    return () => clearInterval(interval);
  }, [links, dimensions, draggedNodeId]);

  // Drag handlers
  const handleDragStart = (node, e) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedNode(node);

    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    const svgRect = svgRef.current.getBoundingClientRect();
    const relativeX = clientX - svgRect.left;
    const relativeY = clientY - svgRect.top;

    setDraggedNodeId(node.id);
    setDragOffset({
      x: relativeX - node.x,
      y: relativeY - node.y,
    });
  };

  const handleDragMove = (e) => {
    if (!draggedNodeId) return;

    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    const svgRect = svgRef.current.getBoundingClientRect();
    const relativeX = clientX - svgRect.left;
    const relativeY = clientY - svgRect.top;

    setNodes((currentNodes) =>
      currentNodes.map((n) => {
        if (n.id === draggedNodeId) {
          return {
            ...n,
            x: Math.max(20, Math.min(dimensions.width - 20, relativeX - dragOffset.x)),
            y: Math.max(20, Math.min(dimensions.height - 20, relativeY - dragOffset.y)),
          };
        }
        return n;
      })
    );
  };

  const handleDragEnd = () => {
    setDraggedNodeId(null);
  };

  // Color mapping
  const getNodeColor = (type) => {
    switch (type) {
      case "condition":
        return {
          bg: "#06b6d4",
          glow: "rgba(6, 182, 212, 0.8)",
          border: "#0891b2",
        };
      case "organ":
        return {
          bg: "#a78bfa",
          glow: "rgba(167, 139, 250, 0.6)",
          border: "#8b5cf6",
        };
      case "medication":
        return {
          bg: "#10b981",
          glow: "rgba(16, 185, 129, 0.6)",
          border: "#059669",
        };
      case "symptom":
        return {
          bg: "#fbbf24",
          glow: "rgba(251, 191, 36, 0.6)",
          border: "#d97706",
        };
      case "habit":
        return {
          bg: "#ec4899",
          glow: "rgba(236, 72, 153, 0.6)",
          border: "#db2777",
        };
      default:
        return {
          bg: "#94a3b8",
          glow: "rgba(148, 163, 184, 0.4)",
          border: "#64748b",
        };
    }
  };

  const getLinkPoints = (link) => {
    const sourceNode = nodes.find((n) => n.id === link.source);
    const targetNode = nodes.find((n) => n.id === link.target);

    if (!sourceNode || !targetNode) return null;
    return {
      x1: sourceNode.x,
      y1: sourceNode.y,
      x2: targetNode.x,
      y2: targetNode.y,
    };
  };

  return (
    <div className="graph-card glass-panel" ref={containerRef}>
      <div className="graph-header flex justify-between items-center">
        <div>
          <h3 className="glow-text">🕸️ Condition Relationship Network</h3>
          <p className="graph-subtitle">
            Neo4j ontology linkages. <strong>Click and drag</strong> nodes to interact, select for details.
          </p>
        </div>
      </div>

      <div className="graph-viewport-wrapper">
        <svg
          ref={svgRef}
          className="graph-svg"
          width="100%"
          height="100%"
          onMouseMove={handleDragMove}
          onTouchMove={handleDragMove}
          onMouseUp={handleDragEnd}
          onTouchEnd={handleDragEnd}
          onMouseLeave={handleDragEnd}
        >
          <defs>
            <filter id="glow" x="-25%" y="-25%" width="150%" height="150%">
              <feGaussianBlur stdDeviation="7" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            <marker
              id="arrow"
              viewBox="0 0 10 10"
              refX="18"
              refY="5"
              markerWidth="5"
              markerHeight="5"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#334155" />
            </marker>
          </defs>

          {/* Links */}
          {links.map((link, i) => {
            const pts = getLinkPoints(link);
            if (!pts) return null;

            return (
              <g key={`link-${i}`}>
                <line
                  x1={pts.x1}
                  y1={pts.y1}
                  x2={pts.x2}
                  y2={pts.y2}
                  className="graph-line"
                  stroke="#334155"
                  strokeWidth="1.8"
                  markerEnd="url(#arrow)"
                />
                <text
                  x={(pts.x1 + pts.x2) / 2}
                  y={(pts.y1 + pts.y2) / 2 - 6}
                  fill="#64748b"
                  fontSize="9"
                  textAnchor="middle"
                  className="graph-link-label"
                >
                  {link.relation}
                </text>
              </g>
            );
          })}

          {/* Nodes */}
          {nodes.map((node) => {
            const colors = getNodeColor(node.type);
            const isSelected = selectedNode?.id === node.id;
            const isDragged = draggedNodeId === node.id;

            return (
              <g
                key={node.id}
                className={`graph-node-group ${isDragged ? "dragging" : ""}`}
                onMouseDown={(e) => handleDragStart(node, e)}
                onTouchStart={(e) => handleDragStart(node, e)}
                style={{ cursor: isDragged ? "grabbing" : "grab" }}
              >
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={node.val || 20}
                  fill={colors.bg}
                  stroke={isSelected ? "#ffffff" : colors.border}
                  strokeWidth={isSelected ? 3 : 1.5}
                  filter="url(#glow)"
                  className="graph-node-circle"
                />
                <text
                  x={node.x}
                  y={node.y + (node.val || 20) + 14}
                  fill="#f1f5f9"
                  fontSize="10"
                  textAnchor="middle"
                  fontWeight="bold"
                  className="graph-node-text"
                >
                  {node.label}
                </text>
                <text
                  x={node.x}
                  y={node.y + 3}
                  fill="#000"
                  fontSize="9"
                  textAnchor="middle"
                  fontWeight="bold"
                  style={{ pointerEvents: "none", userSelect: "none" }}
                >
                  {node.type.slice(0, 3).toUpperCase()}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Selected info overlay */}
        {selectedNode && (
          <div className="node-info-overlay glass-panel border border-cyan-500/50">
            <div className="flex justify-between items-start">
              <h4 className="text-cyan-400 font-bold flex items-center gap-2">
                <span
                  className="bullet"
                  style={{ backgroundColor: getNodeColor(selectedNode.type).bg }}
                />
                {selectedNode.label}
              </h4>
              <button
                className="text-gray-500 hover:text-white text-xs"
                onClick={() => setSelectedNode(null)}
              >
                ✕
              </button>
            </div>
            <p className="text-2xs text-gray-400 capitalize">Ontology Node: {selectedNode.type}</p>
            <div className="text-2xs mt-2.5 leading-relaxed text-gray-300">
              {selectedNode.type === "condition" &&
                "This condition represents the primary diagnosis or clinical focal point. It coordinates medications, triggers organ system load, and requires preventative habits."}
              {selectedNode.type === "organ" &&
                "The physiological system most directly affected by the primary condition. Monitoring indicators related to this organ system is crucial for long-term health."}
              {selectedNode.type === "medication" &&
                "Prescribed drug used to manage or resolve the target condition. Pay close attention to side-effects and daily schedules."}
              {selectedNode.type === "symptom" &&
                "Physical manifestations connected directly to this medical condition. Report persistent or worsening symptoms to your physician."}
              {selectedNode.type === "habit" &&
                "Scientific preventative lifestyle habits proven to mitigate symptoms and aid overall prognosis of the condition."}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
