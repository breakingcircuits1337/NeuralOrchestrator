import { useState } from 'react';
import { useIDEStore } from '@/stores/ideStore';
import { Folder, File, ChevronRight, ChevronDown, Plus } from 'lucide-react';

interface FileNode {
  name: string;
  type: 'file' | 'folder';
  children?: FileNode[];
  path: string;
}

const mockFileTree: FileNode = {
  name: 'neural-network-ide',
  type: 'folder',
  path: '',
  children: [
    {
      name: 'src',
      type: 'folder',
      path: 'src',
      children: [
        { name: 'orchestrator.ts', type: 'file', path: 'src/orchestrator.ts' },
        { name: 'agent-network.ts', type: 'file', path: 'src/agent-network.ts' },
        { name: 'neural-bus.ts', type: 'file', path: 'src/neural-bus.ts' }
      ]
    },
    {
      name: 'agents',
      type: 'folder',
      path: 'agents',
      children: [
        { name: 'planning-cortex.ts', type: 'file', path: 'agents/planning-cortex.ts' },
        { name: 'language-cortex.ts', type: 'file', path: 'agents/language-cortex.ts' },
        { name: 'memory-cortex.ts', type: 'file', path: 'agents/memory-cortex.ts' }
      ]
    },
    {
      name: 'cortex',
      type: 'folder',
      path: 'cortex',
      children: [
        { name: 'sensory.ts', type: 'file', path: 'cortex/sensory.ts' },
        { name: 'reasoning.ts', type: 'file', path: 'cortex/reasoning.ts' },
        { name: 'personality.ts', type: 'file', path: 'cortex/personality.ts' }
      ]
    },
    { name: 'package.json', type: 'file', path: 'package.json' },
    { name: 'tsconfig.json', type: 'file', path: 'tsconfig.json' },
    { name: 'README.md', type: 'file', path: 'README.md' }
  ]
};

function FileTreeNode({ node, level = 0 }: { node: FileNode; level?: number }) {
  const [isExpanded, setIsExpanded] = useState(level < 2);
  const { activeFile, setActiveFile, addOpenFile } = useIDEStore();

  const handleClick = () => {
    if (node.type === 'folder') {
      setIsExpanded(!isExpanded);
    } else {
      setActiveFile(node.name);
      addOpenFile(node.name);
    }
  };

  const getFileIcon = (filename: string) => {
    if (filename.endsWith('.ts') || filename.endsWith('.tsx')) {
      return 'ibm-blue';
    } else if (filename.endsWith('.js') || filename.endsWith('.jsx')) {
      return 'ibm-green';
    } else if (filename.endsWith('.json')) {
      return 'ibm-yellow';
    } else if (filename.endsWith('.md')) {
      return 'ibm-purple';
    }
    return 'carbon-text-40';
  };

  const isActive = activeFile === node.name;

  return (
    <div>
      <div
        className={`flex items-center space-x-2 hover:carbon-bg-80 p-1 rounded cursor-pointer ${
          isActive ? 'carbon-bg-80' : ''
        }`}
        style={{ paddingLeft: `${level * 12 + 4}px` }}
        onClick={handleClick}
      >
        {node.type === 'folder' ? (
          <>
            {isExpanded ? (
              <ChevronDown className="w-3 h-3 carbon-text-40" />
            ) : (
              <ChevronRight className="w-3 h-3 carbon-text-40" />
            )}
            <Folder className="w-4 h-4 carbon-text-40" />
            <span className="text-sm">{node.name}</span>
          </>
        ) : (
          <>
            <div className="w-3" /> {/* Spacer for alignment */}
            <File className={`w-4 h-4 ${getFileIcon(node.name)}`} />
            <span className="text-sm">{node.name}</span>
            {isActive && <span className="text-xs carbon-text-40">•</span>}
          </>
        )}
      </div>
      
      {node.type === 'folder' && isExpanded && node.children && (
        <div>
          {node.children.map((child, index) => (
            <FileTreeNode key={index} node={child} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export function FileExplorer() {
  const { currentProject } = useIDEStore();

  return (
    <div className="flex-1 p-3 overflow-y-auto">
      {/* Project Header */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-medium uppercase tracking-wide carbon-text-40">
            Current Project
          </h3>
          <Plus className="w-3 h-3 carbon-text-40 hover:carbon-text-10 cursor-pointer" />
        </div>
        <div className="text-sm font-medium ibm-blue">
          {currentProject?.name || 'neural-network-ide'}
        </div>
      </div>

      {/* File Tree */}
      <div className="space-y-1 text-sm">
        <FileTreeNode node={mockFileTree} />
      </div>

      {/* Agent Status Summary */}
      <div className="mt-6">
        <h4 className="text-xs font-medium uppercase tracking-wide carbon-text-40 mb-3">
          Quick Status
        </h4>
        <div className="space-y-1 text-xs">
          <div className="flex justify-between">
            <span>Total Files</span>
            <span className="carbon-text-40">12</span>
          </div>
          <div className="flex justify-between">
            <span>Modified</span>
            <span className="ibm-green">3</span>
          </div>
          <div className="flex justify-between">
            <span>Code Lines</span>
            <span className="carbon-text-40">2,847</span>
          </div>
        </div>
      </div>
    </div>
  );
}
