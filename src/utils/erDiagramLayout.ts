import { TableDefinition } from '../types/database';

export interface ERDNode {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  columns: {
    name: string;
    type: string;
    primaryKey: boolean;
    foreignKey?: boolean;
  }[];
}

export interface ERDEdge {
  id: string;
  fromTable: string;
  fromColumn: string;
  toTable: string;
  toColumn: string;
}

export function computeInitialERDLayout(tables: TableDefinition[]): {
  nodes: ERDNode[];
  edges: ERDEdge[];
} {
  const nodes: ERDNode[] = [];
  const edges: ERDEdge[] = [];

  const CARD_WIDTH = 240;
  const HEADER_HEIGHT = 42;
  const ROW_HEIGHT = 26;
  const GAP_X = 80;
  const GAP_Y = 60;
  const COLUMNS_PER_ROW = 3;

  tables.forEach((tbl, idx) => {
    const colIndex = idx % COLUMNS_PER_ROW;
    const rowIndex = Math.floor(idx / COLUMNS_PER_ROW);

    const x = 50 + colIndex * (CARD_WIDTH + GAP_X);
    const y = 50 + rowIndex * (280 + GAP_Y);

    const height = HEADER_HEIGHT + tbl.columns.length * ROW_HEIGHT + 14;

    nodes.push({
      id: tbl.name,
      name: tbl.name,
      x,
      y,
      width: CARD_WIDTH,
      height,
      columns: tbl.columns.map((c) => ({
        name: c.name,
        type: c.type,
        primaryKey: c.primaryKey,
        foreignKey: !!c.foreignKey,
      })),
    });

    if (tbl.foreignKeys) {
      tbl.foreignKeys.forEach((fk, fkIdx) => {
        edges.push({
          id: `edge_${tbl.name}_${fk.foreignTable}_${fkIdx}`,
          fromTable: tbl.name,
          fromColumn: fk.column,
          toTable: fk.foreignTable,
          toColumn: fk.foreignColumn,
        });
      });
    }
  });

  return { nodes, edges };
}

export function calculateBezierPath(
  source: { x: number; y: number; width: number; height: number },
  target: { x: number; y: number; width: number; height: number }
): string {
  // Determine if target is to the right or left
  const isRight = target.x >= source.x + source.width;
  const startX = isRight ? source.x + source.width : source.x;
  const startY = source.y + 40;

  const endX = isRight ? target.x : target.x + target.width;
  const endY = target.y + 40;

  const dx = Math.abs(endX - startX) * 0.5;
  const c1x = isRight ? startX + dx : startX - dx;
  const c1y = startY;
  const c2x = isRight ? endX - dx : endX + dx;
  const c2y = endY;

  return `M ${startX} ${startY} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${endX} ${endY}`;
}
