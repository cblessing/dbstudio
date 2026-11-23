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
  Move,
} from 'lucide-react';

interface ERDiagramViewerProps {
  tables: TableDefinition[];
  connectionName: string;
  onSelectTable?: (tableName: string) => void;
}

function EdgePathItem({
  edge,
  nodes,
  isHovered,
  onHover,
}: {
  edge: ERDEdge;
  nodes: ERDNode[];
  isHovered: boolean;
  onHover: (id: string | null) => void;
}) {
  const sourceNode = nodes.find((n) => n.id === edge.fromTable);
  const targetNode = nodes.find((n) => n.id === edge.toTable);
  if (!sourceNode || !targetNode) return null;

  const path = calculateBezierPath(sourceNode, targetNode);

  return (
    <g className="pointer-events-auto cursor-pointer">
      <path
        d={path}
        fill="none"
        stroke={isHovered ? '#38bdf8' : '#007acc'}
        strokeWidth={isHovered ? 3 : 1.5}
        strokeDasharray={isHovered ? 'none' : '4 2'}
        markerEnd={isHovered ? 'url(#erd-arrow-active)' : 'url(#erd-arrow)'}
        onMouseEnter={() => onHover(edge.id)}
        onMouseLeave={() => onHover(null)}
      />
    </g>
  );
}

function NodeCardItem({
  node,
  onMouseDown,
  onSelectTable,
}: {
  node: ERDNode;
  onMouseDown: (nodeId: string, e: React.MouseEvent) => void;
  onSelectTable?: (tableName: string) => void;
}) {
  return (
    <div
      style={{
        transform: `translate(${node.x}px, ${node.y}px)`,
        width: `${node.width}px`,
      }}
      onMouseDown={(e) => onMouseDown(node.id, e)}
      className="absolute z-20 bg-[#252526] border border-[#3c3c3c] hover:border-[#007acc] rounded-lg shadow-2xl cursor-grab active:cursor-grabbing transition-shadow hover:shadow-cyan-900/20"
    >
      <div
        className="flex items-center justify-between px-3 py-2 bg-[#2d2d2d] rounded-t-lg border-b border-[#3c3c3c]"
        onDoubleClick={() => onSelectTable?.(node.name)}
        title="Double click to open table data"
      >
        <div className="flex items-center gap-2 truncate">
          <TableIcon className="w-4 h-4 text-sky-400 shrink-0" />
          <span className="font-bold text-white tracking-wide truncate">{node.name}</span>
        </div>
        <span className="text-[10px] bg-[#1e1e1e] text-[#858585] px-1.5 py-0.5 rounded font-mono">
          {node.columns.length} cols
        </span>
      </div>

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

            <span className="text-[10px] text-[#777777] font-mono ml-2">{col.type}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export const ERDiagramViewer: React.FC<ERDiagramViewerProps> = ({
  tables,
  onSelectTable,
}) => {
  const [nodes, setNodes] = useState<ERDNode[]>([]);
  const [edges, setEdges] = useState<ERDEdge[]>([]);
  const [zoom, setZoom] = useState(1);
  const [hoveredEdgeId, setHoveredEdgeId] = useState<string | null>(null);
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanningCanvas, setIsPanningCanvas] = useState(false);
  const panStartRef = useRef({ clientX: 0, clientY: 0, scrollLeft: 0, scrollTop: 0 });
  const viewportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const layout = computeInitialERDLayout(tables);
    setNodes(layout.nodes);
    setEdges(layout.edges);
  }, [tables]);

  const canvasWidth = Math.max(1400, ...nodes.map((n) => n.x + n.width + 240));
  const canvasHeight = Math.max(900, ...nodes.map((n) => n.y + n.height + 240));

  const handleNodeMouseDown = (nodeId: string, e: React.MouseEvent) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    const viewport = viewportRef.current;
    const node = nodes.find((n) => n.id === nodeId);
    if (!node || !viewport) return;

    const rect = viewport.getBoundingClientRect();
    const pointerCanvasX = (e.clientX - rect.left + viewport.scrollLeft) / zoom;
    const pointerCanvasY = (e.clientY - rect.top + viewport.scrollTop) / zoom;

    setDraggedNodeId(nodeId);
    setDragOffset({ x: pointerCanvasX - node.x, y: pointerCanvasY - node.y });
  };

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0 || !viewportRef.current) return;
    setIsPanningCanvas(true);
    panStartRef.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      scrollLeft: viewportRef.current.scrollLeft,
      scrollTop: viewportRef.current.scrollTop,
    };
  };

  useEffect(() => {
    const isInteracting = Boolean(draggedNodeId) || isPanningCanvas;
    if (!isInteracting) return;

    const handleWindowMouseMove = (e: MouseEvent) => {
      const viewport = viewportRef.current;
      if (!viewport) return;

      if (draggedNodeId) {
        const rect = viewport.getBoundingClientRect();
        const newX = Math.max(16, (e.clientX - rect.left + viewport.scrollLeft) / zoom - dragOffset.x);
        const newY = Math.max(16, (e.clientY - rect.top + viewport.scrollTop) / zoom - dragOffset.y);
        setNodes((prev) =>
          prev.map((n) => (n.id === draggedNodeId ? { ...n, x: newX, y: newY } : n))
        );
      } else {
        viewport.scrollLeft = panStartRef.current.scrollLeft - (e.clientX - panStartRef.current.clientX);
        viewport.scrollTop = panStartRef.current.scrollTop - (e.clientY - panStartRef.current.clientY);
      }
    };

    const handleWindowMouseUp = () => {
      setDraggedNodeId(null);
      setIsPanningCanvas(false);
    };

    window.addEventListener('mousemove', handleWindowMouseMove);
    window.addEventListener('mouseup', handleWindowMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleWindowMouseMove);
      window.removeEventListener('mouseup', handleWindowMouseUp);
    };
  }, [draggedNodeId, isPanningCanvas, dragOffset, zoom]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (e.deltaY === 0) return;

      const rect = viewport.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      setZoom((prevZoom) => {
        const step = e.deltaY < 0 ? 0.1 : -0.1;
        const nextZoom = Math.min(2, Math.max(0.3, +(prevZoom + step).toFixed(2)));
        if (nextZoom === prevZoom) return prevZoom;

        const canvasPointX = (viewport.scrollLeft + mouseX) / prevZoom;
        const canvasPointY = (viewport.scrollTop + mouseY) / prevZoom;

        requestAnimationFrame(() => {
          if (viewportRef.current) {
            viewportRef.current.scrollLeft = Math.max(0, canvasPointX * nextZoom - mouseX);
            viewportRef.current.scrollTop = Math.max(0, canvasPointY * nextZoom - mouseY);
          }
        });

        return nextZoom;
      });
    };

    viewport.addEventListener('wheel', handleWheel, { passive: false });
    return () => viewport.removeEventListener('wheel', handleWheel);
  }, []);

  const resetLayout = () => {
    const layout = computeInitialERDLayout(tables);
    setNodes(layout.nodes);
    setEdges(layout.edges);
    setZoom(1);
    if (viewportRef.current) {
      viewportRef.current.scrollLeft = 0;
      viewportRef.current.scrollTop = 0;
    }
  };

  const isGrabbing = isPanningCanvas || Boolean(draggedNodeId);

  return (
    <div className="relative w-full h-full bg-[#181818] overflow-hidden select-none font-sans">
      <div className="absolute top-3 right-5 z-30 flex items-center gap-1.5 bg-[#252526]/95 backdrop-blur border border-[#3c3c3c] rounded-lg p-1.5 shadow-xl text-xs">
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
          onClick={() => setZoom((z) => Math.max(0.4, +(z - 0.1).toFixed(1)))}
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

      <div className="absolute bottom-5 left-3 z-30 flex items-center gap-3 bg-[#252526]/95 backdrop-blur border border-[#3c3c3c] rounded-lg px-3 py-1.5 shadow-xl text-[11px] text-[#cccccc] pointer-events-none">
        <div className="flex items-center gap-1">
          <Key className="w-3.5 h-3.5 text-amber-400" />
          <span>Primary Key</span>
        </div>
        <div className="flex items-center gap-1">
          <Link className="w-3.5 h-3.5 text-sky-400" />
          <span>Foreign Key</span>
        </div>
        <div className="flex items-center gap-1 text-[#858585]">
          <Move className="w-3 h-3" />
          <span>Scroll wheel to zoom • Drag background to pan • Drag cards to move</span>
        </div>
      </div>

      <div
        ref={viewportRef}
        onMouseDown={handleCanvasMouseDown}
        className={`w-full h-full overflow-auto relative ${
          isGrabbing ? 'cursor-grabbing' : 'cursor-grab'
        }`}
      >
        <div
          style={{
            width: `${Math.round(canvasWidth * zoom)}px`,
            height: `${Math.round(canvasHeight * zoom)}px`,
          }}
          className="relative"
        >
          <div
            className="absolute inset-0 pointer-events-none opacity-20"
            style={{
              backgroundImage: 'radial-gradient(#555555 1px, transparent 1px)',
              backgroundSize: `${Math.max(10, Math.round(20 * zoom))}px ${Math.max(10, Math.round(20 * zoom))}px`,
            }}
          />

          <div
            className="relative origin-top-left"
            style={{
              width: `${canvasWidth}px`,
              height: `${canvasHeight}px`,
              transform: `scale(${zoom})`,
            }}
          >
            <svg
              width={canvasWidth}
              height={canvasHeight}
              className="absolute inset-0 pointer-events-none z-10 overflow-visible"
            >
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

              {edges.map((edge) => (
                <EdgePathItem
                  key={edge.id}
                  edge={edge}
                  nodes={nodes}
                  isHovered={hoveredEdgeId === edge.id}
                  onHover={setHoveredEdgeId}
                />
              ))}
            </svg>

            {nodes.map((node) => (
              <NodeCardItem
                key={node.id}
                node={node}
                onMouseDown={handleNodeMouseDown}
                onSelectTable={onSelectTable}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
