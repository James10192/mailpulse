"use client";

import { useCallback, useState, useRef, createContext } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Connection,
  type Node,
  type Edge,
  BackgroundVariant,
  MarkerType,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Plus, Power, PowerOff } from "lucide-react";
import { WorkflowNode } from "./workflow-node";
import { AddNodePanel } from "./add-node-panel";
import { NodeConfigPanel } from "./node-config-panel";
import {
  getNodeLabel,
  getDefaultConfig,
  type WorkflowNodeType,
  type WorkflowNodeData,
} from "./workflow-types";
import { saveWorkflow, updateAutomationStatus } from "@/app/(dashboard)/dashboard/automations/actions";

const EDGE_COLOR = "#71717a";

const nodeTypes = {
  workflowNode: WorkflowNode,
};

export const WorkflowContext = createContext<{
  onAddFromNode: (nodeId: string) => void;
}>({ onAddFromNode: () => {} });

function makeEdge(sourceId: string, targetId: string, sourceHandle?: string | null): Edge {
  return {
    id: `edge_${sourceId}_${targetId}_${sourceHandle ?? "default"}_${Date.now()}`,
    source: sourceId,
    target: targetId,
    sourceHandle: sourceHandle ?? null,
    targetHandle: null,
    type: "smoothstep",
    animated: true,
    style: { stroke: EDGE_COLOR, strokeWidth: 2 },
    markerEnd: { type: MarkerType.ArrowClosed, color: EDGE_COLOR },
  };
}

interface WorkflowEditorProps {
  automationId: string;
  automationName: string;
  automationStatus: string;
  automationTrigger: string;
  initialNodes: Node[];
  initialEdges: Edge[];
}

export function WorkflowEditor(props: WorkflowEditorProps) {
  return (
    <ReactFlowProvider>
      <WorkflowEditorInner {...props} />
    </ReactFlowProvider>
  );
}

function WorkflowEditorInner({
  automationId,
  automationName,
  automationStatus,
  automationTrigger,
  initialNodes,
  initialEdges,
}: WorkflowEditorProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [showAddPanel, setShowAddPanel] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [connectFromNodeId, setConnectFromNodeId] = useState<string | null>(null);
  const [status, setStatus] = useState(automationStatus);
  const [saving, setSaving] = useState(false);
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Manual edge push — avoids addEdge() duplicate rejection
  const onConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return;
      setEdges((eds) => [
        ...eds,
        {
          id: `e-${connection.source}-${connection.target}-${Date.now()}`,
          source: connection.source,
          target: connection.target,
          sourceHandle: connection.sourceHandle ?? null,
          targetHandle: connection.targetHandle ?? null,
          type: "smoothstep",
          animated: true,
          style: { stroke: EDGE_COLOR, strokeWidth: 2 },
          markerEnd: { type: MarkerType.ArrowClosed, color: EDGE_COLOR },
        },
      ]);
    },
    [setEdges]
  );

  const scheduleSave = useCallback(
    (updatedNodes: Node[], updatedEdges: Edge[]) => {
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
      saveTimeout.current = setTimeout(async () => {
        setSaving(true);
        await saveWorkflow(automationId, JSON.stringify(updatedNodes), JSON.stringify(updatedEdges));
        setSaving(false);
      }, 1500);
    },
    [automationId]
  );

  // Callback passed into node data so nodes can trigger "add from me"
  const handleAddFromNode = useCallback(
    (nodeId: string) => {
      setConnectFromNodeId(nodeId);
      setShowAddPanel(true);
    },
    []
  );

  const contextValue = { onAddFromNode: handleAddFromNode };

  const handleAddNode = useCallback(
    (type: WorkflowNodeType) => {
      // Determine source node: either the specific node from "+" button, or last node
      const sourceNodeId = connectFromNodeId;
      const sourceNode = sourceNodeId
        ? nodes.find((n) => n.id === sourceNodeId)
        : nodes[nodes.length - 1];

      const x = sourceNode ? (sourceNode.position?.x ?? 0) : 300;
      const y = sourceNode ? (sourceNode.position?.y ?? 0) + 150 : 300;

      const newNode: Node = {
        id: `node_${Date.now()}`,
        type: "workflowNode",
        position: { x, y },
        data: {
          type,
          label: getNodeLabel(type),
          config: getDefaultConfig(type),
        } satisfies WorkflowNodeData,
      };

      const updatedNodes = [...nodes, newNode];
      setNodes(updatedNodes);

      // Auto-connect to source node — delay to let React Flow process the new node first
      if (sourceNode) {
        const newEdge = makeEdge(sourceNode.id, newNode.id);
        requestAnimationFrame(() => {
          setEdges((eds) => {
            const updated = [...eds, newEdge];
            scheduleSave(updatedNodes, updated);
            return updated;
          });
        });
      } else {
        scheduleSave(updatedNodes, edges);
      }

      // Reset connectFromNodeId
      setConnectFromNodeId(null);
    },
    [nodes, edges, setNodes, setEdges, scheduleSave, connectFromNodeId]
  );

  const handleNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      setSelectedNodeId(node.id);
    },
    []
  );

  const handleNodeUpdate = useCallback(
    (nodeId: string, newData: Partial<WorkflowNodeData>) => {
      setNodes((nds) => {
        const updated = nds.map((n) =>
          n.id === nodeId ? { ...n, data: { ...n.data, ...newData } } : n
        );
        scheduleSave(updated, edges);
        return updated;
      });
    },
    [setNodes, edges, scheduleSave]
  );

  const handleNodeDelete = useCallback(
    (nodeId: string) => {
      setSelectedNodeId(null);
      setNodes((nds) => {
        const updated = nds.filter((n) => n.id !== nodeId);
        setEdges((eds) => {
          const updatedEdges = eds.filter(
            (e) => e.source !== nodeId && e.target !== nodeId
          );
          scheduleSave(updated, updatedEdges);
          return updatedEdges;
        });
        return updated;
      });
    },
    [setNodes, setEdges, scheduleSave]
  );

  const handleToggleStatus = useCallback(async () => {
    const newStatus = status === "ACTIVE" ? "PAUSED" : "ACTIVE";
    await updateAutomationStatus(automationId, newStatus);
    setStatus(newStatus);
  }, [automationId, status]);

  const handlePaneClick = useCallback(() => {
    setSelectedNodeId(null);
  }, []);

  const handleCloseAddPanel = useCallback(() => {
    setShowAddPanel(false);
    setConnectFromNodeId(null);
  }, []);

  const selectedNode = selectedNodeId
    ? (nodes.find((n) => n.id === selectedNodeId) as (Node & { data: WorkflowNodeData }) | undefined) ?? null
    : null;

  const isActive = status === "ACTIVE";

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
            {automationName}
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                isActive
                  ? "bg-emerald-500/10 text-emerald-400"
                  : "bg-zinc-800 text-zinc-400"
              }`}
            >
              {isActive ? "ACTIF" : status}
            </span>
            {saving && (
              <span className="text-[10px] text-zinc-500 font-mono">
                Sauvegarde...
              </span>
            )}
          </div>
        </div>
        <button
          onClick={handleToggleStatus}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
            isActive
              ? "bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20"
              : "bg-emerald-600 hover:bg-emerald-500 text-white"
          }`}
        >
          {isActive ? (
            <>
              <PowerOff className="h-4 w-4" />
              Desactiver
            </>
          ) : (
            <>
              <Power className="h-4 w-4" />
              Activer le workflow
            </>
          )}
        </button>
      </div>

      {/* Canvas */}
      <div className="relative w-full h-[calc(100vh-220px)] rounded-xl border border-zinc-800 bg-zinc-950 overflow-hidden">
        <WorkflowContext.Provider value={contextValue}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={handleNodeClick}
          onPaneClick={handlePaneClick}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.3 }}
          defaultEdgeOptions={{
            type: "smoothstep",
            animated: true,
            style: { stroke: EDGE_COLOR, strokeWidth: 2 },
          }}
          connectionLineStyle={{ stroke: EDGE_COLOR, strokeWidth: 2 }}
          proOptions={{ hideAttribution: true }}
          className="!bg-zinc-950"
        >
          <Background
            variant={BackgroundVariant.Dots}
            gap={20}
            size={1}
            color="#27272a"
          />
          <Controls
            className="!bg-zinc-900 !border-zinc-800 !rounded-lg !shadow-xl [&>button]:!bg-zinc-900 [&>button]:!border-zinc-800 [&>button]:!text-zinc-400 [&>button:hover]:!bg-zinc-800 [&>button]:!cursor-pointer"
            showInteractive={false}
          />
          <MiniMap
            className="!bg-zinc-900 !border-zinc-800 !rounded-lg"
            nodeColor="#525252"
            maskColor="rgba(0,0,0,0.7)"
          />
        </ReactFlow>
        </WorkflowContext.Provider>

        {/* Floating + button */}
        <button
          onClick={() => {
            setConnectFromNodeId(null);
            setShowAddPanel(!showAddPanel);
          }}
          className="absolute bottom-6 right-6 z-40 w-12 h-12 rounded-full bg-orange-600 hover:bg-orange-500 text-white flex items-center justify-center shadow-lg shadow-orange-500/20 transition-all cursor-pointer hover:scale-105"
        >
          <Plus className="h-5 w-5" />
        </button>

        {/* Add node panel */}
        {showAddPanel && (
          <AddNodePanel
            onAdd={handleAddNode}
            onClose={handleCloseAddPanel}
          />
        )}

        {/* Config side panel */}
        {selectedNode && (
          <NodeConfigPanel
            node={selectedNode}
            onUpdate={handleNodeUpdate}
            onDelete={handleNodeDelete}
            onClose={() => setSelectedNodeId(null)}
          />
        )}
      </div>
    </div>
  );
}
