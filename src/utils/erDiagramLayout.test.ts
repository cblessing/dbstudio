import test from 'node:test';
import assert from 'node:assert/strict';
import { computeInitialERDLayout, calculateBezierPath } from './erDiagramLayout';
import { INITIAL_ECOMMERCE_TABLES } from '../engine/sqlEngineCore';

test('computeInitialERDLayout creates nodes and edges from tables', () => {
  const { nodes, edges } = computeInitialERDLayout(INITIAL_ECOMMERCE_TABLES);

  assert.equal(nodes.length, INITIAL_ECOMMERCE_TABLES.length);
  assert.ok(edges.length > 0);

  const productsNode = nodes.find((n) => n.id === 'products');
  assert.ok(productsNode);
  assert.ok(productsNode.columns.some((c) => c.name === 'sku'));

  const edge = edges.find((e) => e.fromTable === 'products' && e.toTable === 'categories');
  assert.ok(edge);
});

test('calculateBezierPath outputs valid SVG path command', () => {
  const path = calculateBezierPath(
    { x: 100, y: 100, width: 200, height: 200 },
    { x: 500, y: 150, width: 200, height: 200 }
  );

  assert.ok(path.startsWith('M 300 140 C '));
});
