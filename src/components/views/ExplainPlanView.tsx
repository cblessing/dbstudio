import React from 'react';
import { ExecutionPlanStep } from '../../types/database';
import { GitCommit, Layers, Database, ArrowRight, CheckCircle } from 'lucide-react';

interface ExplainPlanViewProps {
  steps: ExecutionPlanStep[];
  query: string;
}

export const ExplainPlanView: React.FC<ExplainPlanViewProps> = ({ steps, query }) => {
  if (!steps || steps.length === 0) {
    return (
      <div className="p-6 text-center text-[#858585] font-sans text-xs">
        <GitCommit className="w-8 h-8 text-purple-400 mx-auto mb-2 opacity-50" />
        <p>No execution plan available. Click "Explain Plan" in the toolbar to generate one.</p>
      </div>
    );
  }

  const renderStep = (step: ExecutionPlanStep, depth = 0) => {
    const isJoin = step.operation.includes('JOIN');
    const isIndex = step.operation.includes('INDEX');
    const isScan = step.operation.includes('SCAN');

    return (
      <div key={step.id} className="flex flex-col gap-1">
        <div
          className={`flex items-start gap-2.5 p-2.5 rounded-lg border transition-all ${
            isJoin
              ? 'bg-purple-950/20 border-purple-800/40 text-purple-200'
              : isIndex
              ? 'bg-emerald-950/20 border-emerald-800/40 text-emerald-200'
              : isScan
              ? 'bg-blue-950/20 border-blue-800/40 text-blue-200'
              : 'bg-[#252526] border-[#3c3c3c] text-[#cccccc]'
          }`}
          style={{ marginLeft: `${depth * 24}px` }}
        >
          <div className="mt-0.5">
            {isJoin ? (
              <GitCommit className="w-4 h-4 text-purple-400" />
            ) : isIndex ? (
              <CheckCircle className="w-4 h-4 text-emerald-400" />
            ) : (
              <Layers className="w-4 h-4 text-blue-400" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <span className="font-bold text-white tracking-wide">{step.operation}</span>
              {step.cost && (
                <span className="text-[10px] bg-black/40 text-[#858585] px-1.5 py-0.5 rounded font-mono">
                  cost={step.cost}
                </span>
              )}
            </div>

            {step.target && (
              <p className="text-[11px] font-medium text-sky-300 mt-0.5">
                Target: {step.target}
              </p>
            )}

            <p className="text-[11px] text-[#a0a0a0] mt-0.5 font-mono">{step.details}</p>

            {step.rowsEstimate !== undefined && (
              <div className="text-[10px] text-zinc-500 mt-1">
                Estimated Rows: <span className="text-zinc-300">{step.rowsEstimate}</span>
              </div>
            )}
          </div>
        </div>

        {step.children && step.children.length > 0 && (
          <div className="flex flex-col gap-1 relative before:absolute before:left-3 before:top-0 before:bottom-3 before:w-px before:bg-[#333333]">
            {step.children.map((child) => renderStep(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="p-4 overflow-y-auto h-full bg-[#181818] text-xs font-sans space-y-4">
      <div className="flex items-center justify-between pb-2 border-b border-[#2d2d2d]">
        <div>
          <h4 className="font-semibold text-white flex items-center gap-1.5">
            <GitCommit className="w-4 h-4 text-purple-400" />
            WebAssembly Query Execution Plan
          </h4>
          <p className="text-[11px] text-[#858585] mt-0.5">
            Engine pipeline breakdown: cost estimates, indexing paths, and SIMD/memory scans.
          </p>
        </div>
      </div>

      <div className="space-y-2">
        {steps.map((step) => renderStep(step))}
      </div>
    </div>
  );
};
