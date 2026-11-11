import React, { useState } from 'react';
import {
  X,
  Copy,
  Check,
  Terminal,
  Play,
  Package,
  Layers,
  FileCode,
  ExternalLink,
  Globe,
  UploadCloud,
  ShieldCheck,
  Cpu,
  Download,
  GitBranch,
} from 'lucide-react';

interface InstallVsCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InstallVsCodeModal: React.FC<InstallVsCodeModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'f5' | 'vsix' | 'marketplace' | 'git' | 'architecture'>('f5');
  const [copiedSnippet, setCopiedSnippet] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSnippet(id);
    setTimeout(() => setCopiedSnippet(null), 2000);
  };

  const f5Steps = [
    {
      title: 'Step 1: Open project in your local VS Code',
      desc: 'Open the directory containing this project in your local VS Code editor:',
      code: 'code .',
      id: 'cmd-code-open',
    },
    {
      title: 'Step 2: Install dependencies & build frontend bundle',
      desc: 'Ensure all dependencies and the Vite WebAssembly distribution are compiled:',
      code: 'npm install\nnpm run build',
      id: 'cmd-npm-build',
    },
    {
      title: 'Step 3: Press F5 (Launch Extension Development Host)',
      desc: 'In VS Code, press F5 or go to Run and Debug (Ctrl+Shift+D / Cmd+Shift+D) and select "Run Database Studio Extension". A fresh Extension Development Host window will open with the extension loaded.',
      code: '# Press F5 in VS Code to start debugging',
      id: 'cmd-f5',
    },
    {
      title: 'Step 4: Launch Database Studio in the new window',
      desc: 'In the newly opened Extension Development Host window, open the Command Palette (Ctrl+Shift+P / Cmd+Shift+P) and run:',
      code: 'Database Studio: Open Database Studio',
      id: 'cmd-launch-palette',
    },
  ];

  const vsixSteps = [
    {
      title: 'Step 1: Build the production bundle',
      desc: 'Compile the frontend application and WebAssembly engine assets:',
      code: 'npm run build',
      id: 'vsix-build',
    },
    {
      title: 'Step 2: Package into .vsix archive using VSCE',
      desc: 'Use the official Microsoft VS Code Extension manager (@vscode/vsce) to create the installer file:',
      code: 'npx @vscode/vsce package --no-dependencies',
      id: 'vsix-package',
    },
    {
      title: 'Step 3: Install the .vsix in your local VS Code',
      desc: 'Install the generated .vsix package directly from your command line:',
      code: 'code --install-extension database-studio-vscode-1.0.0.vsix',
      id: 'vsix-install-cli',
    },
    {
      title: 'Alternative: Install via VS Code GUI',
      desc: 'In VS Code, open Extensions (Ctrl+Shift+X), click the triple dots (...) menu at the top-right of the Extensions pane, click "Install from VSIX...", and select the generated .vsix file.',
      code: '# Extensions View -> ... Menu -> Install from VSIX...',
      id: 'vsix-gui',
    },
  ];

  const marketplaceSteps = [
    {
      title: 'Step 1: Get an Azure DevOps Personal Access Token (PAT)',
      desc: 'Microsoft requires an Azure DevOps PAT with Marketplace permissions. Go to dev.azure.com → User Settings (top right) → Personal Access Tokens → New Token. Select Organization: "All accessible organizations", Scopes: Custom defined → Marketplace (Acquire, Manage).',
      code: '# https://dev.azure.com -> Personal Access Tokens -> Marketplace (Acquire, Manage)',
      id: 'mkt-pat',
    },
    {
      title: 'Step 2: Create a Publisher Account on the Marketplace Portal',
      desc: 'Visit the VS Code Marketplace management portal (https://marketplace.visualstudio.com/manage) and create a publisher ID (e.g. "my-team-name"). Update the "publisher" field in package.extension.json to match.',
      code: '# Set "publisher": "your-publisher-id" in package.extension.json',
      id: 'mkt-publisher',
    },
    {
      title: 'Step 3: Authenticate VSCE on your local terminal',
      desc: 'Log in with the VS Code extension manager CLI using your publisher ID and paste your PAT when prompted:',
      code: 'npx @vscode/vsce login <your-publisher-id>',
      id: 'mkt-login',
    },
    {
      title: 'Step 4: Build & Publish to the Marketplace',
      desc: 'Compile production assets and publish the extension in one single command:',
      code: 'npm run build\nnpx @vscode/vsce publish',
      id: 'mkt-publish',
    },
    {
      title: 'Alternative: Web Upload .VSIX directly in your browser',
      desc: 'If you prefer not using the CLI login, simply build the .vsix package using "npx @vscode/vsce package --no-dependencies" and click "New extension" → "Visual Studio Code" on marketplace.visualstudio.com/manage to drag & drop upload!',
      code: 'npm run build && npx @vscode/vsce package --no-dependencies',
      id: 'mkt-web-upload',
    },
  ];

  const gitSteps = [
    {
      title: 'Step 1: Download Code from Google AI Studio',
      desc: 'In the top-right header of Google AI Studio, click "Download ZIP" or click the GitHub icon / "Export to GitHub" to automatically push to your GitHub account.',
      code: '# Use Google AI Studio top navigation bar -> "Download ZIP" or "Export to GitHub"',
      id: 'git-export-ui',
    },
    {
      title: 'Step 2: Initialize Git & Stage Files Locally',
      desc: 'Open your terminal in the extracted folder, initialize git, and make your first commit:',
      code: 'git init\ngit add .\ngit commit -m "feat: initial commit for Database Studio VS Code extension"',
      id: 'git-init',
    },
    {
      title: 'Step 3: Link to your Remote GitHub / GitLab Repo',
      desc: 'Create a new empty repository on github.com (or gitlab.com) and push your main branch:',
      code: 'git branch -M main\ngit remote add origin https://github.com/<your-username>/<your-repo-name>.git\ngit push -u origin main',
      id: 'git-push',
    },
    {
      title: 'Alternative: Push with GitHub CLI (gh)',
      desc: 'If you use GitHub CLI (gh), create the remote repository and push in one single command:',
      code: 'gh repo create database-studio --public --source=. --remote=origin --push',
      id: 'git-gh-cli',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-[#252526] border border-[#3c3c3c] rounded-lg shadow-2xl w-full max-w-2xl flex flex-col max-h-[85vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#3c3c3c] bg-[#1e1e1e]">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded bg-[#007acc] flex items-center justify-center text-white shadow-sm">
              <Package className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                Install & Publish Database Studio for VS Code
                <span className="text-[10px] font-normal px-2 py-0.5 rounded-full bg-blue-900/60 text-blue-300 border border-blue-700/50">
                  WebAssembly Extension
                </span>
              </h2>
              <p className="text-[11px] text-[#858585]">
                How to test locally, put into a Git repository, or publish to the VS Code Marketplace
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-[#3c3c3c] rounded text-[#858585] hover:text-white transition-colors"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-[#3c3c3c] bg-[#1e1e1e] px-4 gap-2 text-xs overflow-x-auto">
          <button
            onClick={() => setActiveTab('f5')}
            className={`flex items-center gap-1.5 py-2 px-3 border-b-2 font-medium whitespace-nowrap transition-colors ${
              activeTab === 'f5'
                ? 'border-[#007acc] text-white'
                : 'border-transparent text-[#858585] hover:text-[#cccccc]'
            }`}
          >
            <Play className="w-3.5 h-3.5 text-emerald-400" />
            1. Test via F5
          </button>
          <button
            onClick={() => setActiveTab('vsix')}
            className={`flex items-center gap-1.5 py-2 px-3 border-b-2 font-medium whitespace-nowrap transition-colors ${
              activeTab === 'vsix'
                ? 'border-[#007acc] text-white'
                : 'border-transparent text-[#858585] hover:text-[#cccccc]'
            }`}
          >
            <Package className="w-3.5 h-3.5 text-amber-400" />
            2. Package .VSIX
          </button>
          <button
            onClick={() => setActiveTab('git')}
            className={`flex items-center gap-1.5 py-2 px-3 border-b-2 font-medium whitespace-nowrap transition-colors ${
              activeTab === 'git'
                ? 'border-[#007acc] text-white'
                : 'border-transparent text-[#858585] hover:text-[#cccccc]'
            }`}
          >
            <GitBranch className="w-3.5 h-3.5 text-emerald-400" />
            3. Push to Git / GitHub
          </button>
          <button
            onClick={() => setActiveTab('marketplace')}
            className={`flex items-center gap-1.5 py-2 px-3 border-b-2 font-medium whitespace-nowrap transition-colors ${
              activeTab === 'marketplace'
                ? 'border-[#007acc] text-white'
                : 'border-transparent text-[#858585] hover:text-[#cccccc]'
            }`}
          >
            <Globe className="w-3.5 h-3.5 text-sky-400" />
            4. Publish to Marketplace
          </button>
          <button
            onClick={() => setActiveTab('architecture')}
            className={`flex items-center gap-1.5 py-2 px-3 border-b-2 font-medium whitespace-nowrap transition-colors ${
              activeTab === 'architecture'
                ? 'border-[#007acc] text-white'
                : 'border-transparent text-[#858585] hover:text-[#cccccc]'
            }`}
          >
            <Cpu className="w-3.5 h-3.5 text-purple-400" />
            Architecture
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          {activeTab === 'f5' && (
            <div className="space-y-4">
              <div className="bg-emerald-950/30 border border-emerald-800/40 rounded p-3 flex items-start gap-2.5 text-[#cccccc]">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-emerald-300">Fastest Way to Test</div>
                  <div className="text-[11px] text-[#999999] mt-0.5">
                    No packaging or global tools required. VS Code includes a built-in Extension Development Host that lets you test, debug, and run live with zero setup.
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                {f5Steps.map((step, idx) => (
                  <div key={idx} className="bg-[#1e1e1e] border border-[#3c3c3c] rounded p-3 space-y-1.5">
                    <div className="font-medium text-white flex items-center justify-between">
                      <span>{step.title}</span>
                      <button
                        onClick={() => handleCopy(step.code, step.id)}
                        className="flex items-center gap-1 px-2 py-0.5 bg-[#2d2d2d] hover:bg-[#3c3c3c] text-[#cccccc] hover:text-white rounded text-[11px] transition-colors"
                      >
                        {copiedSnippet === step.id ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-400" />
                            <span>Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                    <p className="text-[11px] text-[#858585]">{step.desc}</p>
                    <pre className="bg-[#141414] p-2 rounded font-mono text-[11px] text-sky-300 overflow-x-auto border border-[#2b2b2b]">
                      {step.code}
                    </pre>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'vsix' && (
            <div className="space-y-4">
              <div className="bg-amber-950/30 border border-amber-800/40 rounded p-3 flex items-start gap-2.5 text-[#cccccc]">
                <Package className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-amber-300">Standard VS Code Extension Package</div>
                  <div className="text-[11px] text-[#999999] mt-0.5">
                    Produces a self-contained <code>.vsix</code> archive you can install permanently into your primary VS Code instance or distribute to colleagues.
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                {vsixSteps.map((step, idx) => (
                  <div key={idx} className="bg-[#1e1e1e] border border-[#3c3c3c] rounded p-3 space-y-1.5">
                    <div className="font-medium text-white flex items-center justify-between">
                      <span>{step.title}</span>
                      <button
                        onClick={() => handleCopy(step.code, step.id)}
                        className="flex items-center gap-1 px-2 py-0.5 bg-[#2d2d2d] hover:bg-[#3c3c3c] text-[#cccccc] hover:text-white rounded text-[11px] transition-colors"
                      >
                        {copiedSnippet === step.id ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-400" />
                            <span>Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                    <p className="text-[11px] text-[#858585]">{step.desc}</p>
                    <pre className="bg-[#141414] p-2 rounded font-mono text-[11px] text-amber-300 overflow-x-auto border border-[#2b2b2b]">
                      {step.code}
                    </pre>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'git' && (
            <div className="space-y-4">
              <div className="bg-emerald-950/30 border border-emerald-800/40 rounded p-3 flex items-start gap-2.5 text-[#cccccc]">
                <GitBranch className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-semibold text-emerald-300">Push to GitHub, GitLab, or Bitbucket</div>
                  <div className="text-[11px] text-[#999999]">
                    Export your project from AI Studio, initialize version control locally, and push to your favorite Git hosting provider.
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                {gitSteps.map((step, idx) => (
                  <div key={idx} className="bg-[#1e1e1e] border border-[#3c3c3c] rounded p-3 space-y-1.5">
                    <div className="font-medium text-white flex items-center justify-between">
                      <span>{step.title}</span>
                      <button
                        onClick={() => handleCopy(step.code, step.id)}
                        className="flex items-center gap-1 px-2 py-0.5 bg-[#2d2d2d] hover:bg-[#3c3c3c] text-[#cccccc] hover:text-white rounded text-[11px] transition-colors"
                      >
                        {copiedSnippet === step.id ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-400" />
                            <span>Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                    <p className="text-[11px] text-[#858585]">{step.desc}</p>
                    <pre className="bg-[#141414] p-2 rounded font-mono text-[11px] text-emerald-300 overflow-x-auto border border-[#2b2b2b]">
                      {step.code}
                    </pre>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'marketplace' && (
            <div className="space-y-4">
              <div className="bg-sky-950/30 border border-sky-800/40 rounded p-3 flex items-start gap-2.5 text-[#cccccc]">
                <Globe className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-semibold text-sky-300">Publishing to Microsoft VS Code Marketplace</div>
                  <div className="text-[11px] text-[#999999]">
                    Once published, anyone can discover and install Database Studio directly inside VS Code through the standard Extensions view (<code>Ctrl+Shift+X</code>).
                  </div>
                </div>
              </div>

              {/* Pre-flight Checklist */}
              <div className="bg-[#1e1e1e] border border-[#3c3c3c] rounded p-3 space-y-2">
                <div className="font-semibold text-white text-[11px] flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  Pre-Publish Checklist in package.extension.json
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-[#858585]">
                  <div className="flex items-center gap-1.5">
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span>Unique <code>publisher</code> ID</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span>Semantic version (e.g. <code>1.0.0</code>)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span>Clear <code>README.md</code> description</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span>Extension 128x128 <code>icon.svg</code></span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                {marketplaceSteps.map((step, idx) => (
                  <div key={idx} className="bg-[#1e1e1e] border border-[#3c3c3c] rounded p-3 space-y-1.5">
                    <div className="font-medium text-white flex items-center justify-between">
                      <span>{step.title}</span>
                      <button
                        onClick={() => handleCopy(step.code, step.id)}
                        className="flex items-center gap-1 px-2 py-0.5 bg-[#2d2d2d] hover:bg-[#3c3c3c] text-[#cccccc] hover:text-white rounded text-[11px] transition-colors"
                      >
                        {copiedSnippet === step.id ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-400" />
                            <span>Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                    <p className="text-[11px] text-[#858585]">{step.desc}</p>
                    <pre className="bg-[#141414] p-2 rounded font-mono text-[11px] text-sky-300 overflow-x-auto border border-[#2b2b2b]">
                      {step.code}
                    </pre>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'architecture' && (
            <div className="space-y-4">
              <div className="bg-[#1e1e1e] border border-[#3c3c3c] rounded p-3.5 space-y-2">
                <div className="font-semibold text-white flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-[#007acc]" />
                  How the WebAssembly Extension Works in VS Code
                </div>
                <p className="text-[11px] text-[#858585] leading-relaxed">
                  VS Code extensions run in two processes: the <strong>Node.js Extension Host</strong> and the <strong>Webview Renderer</strong>. Database Studio is architected so that the complete React UI and high-performance WebAssembly query engine run directly inside an isolated VS Code Webview with zero external network dependencies.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
                  <div className="bg-[#252526] p-2.5 rounded border border-[#333]">
                    <div className="font-medium text-white text-[11px] flex items-center gap-1.5">
                      <FileCode className="w-3.5 h-3.5 text-blue-400" />
                      Extension Wrapper
                    </div>
                    <div className="text-[10px] text-[#858585] mt-1">
                      Located in <code>src-extension/extension.ts</code>. Registers commands and binds the Activity Bar icon.
                    </div>
                  </div>
                  <div className="bg-[#252526] p-2.5 rounded border border-[#333]">
                    <div className="font-medium text-white text-[11px] flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-purple-400" />
                      WASM Database Core
                    </div>
                    <div className="text-[10px] text-[#858585] mt-1">
                      Runs <code>sql.js</code> in 32-bit linear address space, executing queries with sub-millisecond local latency.
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-[#1e1e1e] border border-[#3c3c3c] rounded p-3 space-y-2">
                <div className="font-medium text-white">Files Provided in Codebase:</div>
                <ul className="space-y-1 text-[11px] font-mono text-[#cccccc]">
                  <li>• <code>/.vscode/launch.json</code> — Pre-configured F5 debug target</li>
                  <li>• <code>/.vscode/tasks.json</code> — Automatic npm build pre-launch task</li>
                  <li>• <code>/src-extension/extension.ts</code> — VS Code extension lifecycle & WebviewPanel</li>
                  <li>• <code>/package.extension.json</code> — Standard extension manifest & contribution points</li>
                  <li>• <code>/public/icon.svg</code> — Activity Bar database icon</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-[#3c3c3c] bg-[#1e1e1e] flex items-center justify-between">
          <div className="text-[11px] text-[#858585]">
            Supports VS Code 1.85.0+ on macOS, Windows, and Linux
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-[#007acc] hover:bg-[#0062a3] text-white rounded text-xs font-medium transition-colors"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};
