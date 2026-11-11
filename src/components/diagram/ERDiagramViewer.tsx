import React, { useState, useRef, useEffect } from 'react';
import { TableDefinition } from '../../types/database';
import {
  computeInitialERDLayout,
  calculateBezierPath,
  ERDNode,
  ERDEdge,
} from '../../utils/erDiagramLayout';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Key,
  Link,
  Table as TableIcon,
  Download,
  Info,
} from 'lucide-react';

interface ERDiagramViewerProps {
  tables: TableDefinition[];
  connectionName: string;
  onSelectTable?: (tableName: string) => void;
}

export const ERDiagramViewer: React.FC<ERDiagramViewerProps> = ({
  tables,
  connectionName,
  onSelectTable,
}) => {
  const [nodes, setNodes] = useState<ERDNode[]>([]);
  const [edges, setEdges] = useState<ERDEdge[]>([]);
  const [zoom, setZoom] = useState(1);
  const [hoveredEdgeId, setHoveredEdgeId] = useState<string | null>(null);
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Initialize nodes and edges
  useEffect(() => {
    const layout = computeInitialERDLayout(tables);
    setNodes(layout.nodes);
    setEdges(layout.edges);
  }, [tables]);

  // Handle Dragging
  const handleMouseDown = (nodeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDraggedNodeId(nodeId);
    const node = nodes.find((n) => n.id === nodeId);
    if (node && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setDragOffset({
        x: (e.clientX - rect.left) / zoom - node.x,
        y: (e.clientY - rect.top) / zoom - node.y,
      });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!draggedNodeId || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const newX = (e.clientX - rect.left) / zoom - dragOffset.x;
    const newY = (e.clientY - rect.top) / zoom - dragOffset.y;

    setNodes((prevNodes) =>
      prevNodes.map((node) =>
        node.id === draggedNodeId
          ? { ...node, x: Math.max(10, newX), y: Math.max(10, newY) }
          : node
      )
    );
  };

  const handleMouseUp = () => {
    setDraggedNodeId(null);
  };

  const resetLayout = () => {
    const layout = computeInitialERDLayout(tables);
    setNodes(layout.nodes);
    setEdges(layout.edges);
    setZoom(1);
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      className="relative w-full h-full bg-[#181818] overflow-hidden select-none font-sans"
    >
      {/* Background Dot Grid */}
      <div
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{
          backgroundImage: 'radial-gradient(#555555 1px, transparent 1px)',
          backgroundSize: '20px 20px',
        }}
      />

      {/* Floating Toolbar */}
      <div className="absolute top-3 right-3 z-30 flex items-center gap-1.5 bg-[#252526]/90 backdrop-blur border border-[#3c3c3c] rounded-lg p-1.5 shadow-xl text-xs">
        <button
          onClick={() => setZoom((z) => Math.min(2, +(z + 0.1).toFixed(1)))}
          className="p-1 hover:bg-[#3c3c3c] rounded text-[#cccccc] hover:text-white"
          title="Zoom In"
          aria-label="Zoom In"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <span className="text-[11px] font-mono text-[#858585] px-1">
          {Math.round(zoom * 100)}%
        </span>
        <button
          onClick={() => setZoom((z) => Math.max(0.5, +(z - 0.1).toFixed(1)))}
          className="p-1 hover:bg-[#3c3c3c] rounded text-[#cccccc] hover:text-white"
          title="Zoom Out"
          aria-label="Zoom Out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          onClick={resetLayout}
          className="p-1 hover:bg-[#3c3c3c] rounded text-[#cccccc] hover:text-white"
          title="Reset Layout"
          aria-label="Reset Layout"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* Legend & Info Badge */}
      <div className="absolute bottom-3 left-3 z-30 flex items-center gap-3 bg-[#252526]/90 backdrop-blur border border-[#3c3c3c] rounded-lg px-3 py-1.5 shadow-xl text-[11px] text-[#cccccc]">
        <div className="flex items-center gap-1">
          <Key className="w-3.5 h-3.5 text-amber-400" />
          <span>Primary Key</span>
        </div>
        <div className="flex items-center gap-1">
          <Link className="w-3.5 h-3.5 text-sky-400" />
          <span>Foreign Key</span>
        </div>
        <div className="text-[#858585]">| Drag cards to reposition</div>
      </div>

      {/* Scaled Canvas Container */}
      <div
        className="relative w-full h-full origin-top-left"
        style={{ transform: `scale(${zoom})` }}
      >
        {/* SVG Relationship Connecting Edges */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-10 overflow-visible">
          <defs>
            <marker
              id="erd-arrow"
              viewBox="0 0 10 10"
              refX="6"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 8 5 L 0 9 z" fill="#007acc" />
            </marker>
            <marker
              id="erd-arrow-active"
              viewBox="0 0 10 10"
              refX="6"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 8 5 L 0 9 z" fill="#38bdf8" />
            </marker>
          </defs>

          {edges.map((edge) => {
            const sourceNode = nodes.find((n) => n.id === edge.fromTable);
            const targetNode = nodes.find((n) => n.id === edge.toTable);
            if (!sourceNode || !targetNode) return null;

            const path = calculateBezierPath(sourceNode, targetNode);
            const isHovered = hoveredEdgeId === edge.id;

            return (
              <g key={edge.id} className="pointer-events-auto cursor-pointer">
                <path
                  d={path}
                  fill="none"
                  stroke={isHovered ? '#38bdf8' : '#007acc'}
                  strokeWidth={isHovered ? 3 : 1.5}
                  strokeDasharray={isHovered ? 'none' : '4 2'}
                  markerEnd={isHovered ? 'url(#erd-arrow-active)' : 'url(#erd-arrow)'}
                  onMouseEnter={() => setHoveredEdgeId(edge.id)}
                  onMouseLeave={() => setHoveredEdgeId(null)}
                />
              </g>
            );
          })}
        </svg>

        {/* Table Cards */}
        {nodes.map((node) => {
          return (
            <div
              key={node.id}
              style={{
                transform: `translate(${node.x}px, ${node.y}px)`,
                width: `${node.width}px`,
              }}
              onMouseDown={(e) => handleMouseDown(node.id, e)}
              className="absolute z-20 bg-[#252526] border border-[#3c3c3c] hover:border-[#007acc] rounded-lg shadow-2xl cursor-grab active:cursor-grabbing transition-shadow hover:shadow-cyan-900/20"
            >
              {/* Card Header */}
              <div
                className="flex items-center justify-between px-3 py-2 bg-[#2d2d2d] rounded-t-lg border-b border-[#3c3c3c]"
                onDoubleClick={() => onSelectTable && onSelectTable(node.name)}
                title="Double click to open table data"
              >
                <div className="flex items-center gap-2 truncate">
                  <TableIcon className="w-4 h-4 text-sky-400 shrink-0" />
                  <span className="font-bold text-white tracking-wide truncate">
                    {node.name}
                  </span>
                </div>
                <span className="text-[10px] bg-[#1e1e1e] text-[#858585] px-1.5 py-0.5 rounded font-mono">
                  {node.columns.length} cols
                </span>
              </div>

              {/* Column Rows */}
              <div className="py-1">
                {node.columns.map((col) => (
                  <div
                    key={col.name}
                    className="flex items-center justify-between px-3 py-1 hover:bg-[#2f2f35] text-xs transition-colors"
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      {col.primaryKey ? (
                        <span title="Primary Key">
                          <Key className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        </span>
                      ) : col.foreignKey ? (
                        <span title="Foreign Key">
                          <Link className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                        </span>
                      ) : (
                        <span className="w-3.5 h-3.5 inline-block" />
                      )}
                      <span
                        className={`truncate ${
                          col.primaryKey ? 'font-semibold text-amber-200' : 'text-[#cccccc]'
                        }`}
                      >
                        {col.name}
                      </span>
                    </div>

                    <span className="text-[10px] text-[#777777] font-mono ml-2">
                      {col.type}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
