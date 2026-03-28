"use client";

import { useCallback, useState, useRef } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
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

const nodeTypes = {
  workflowNode: WorkflowNode,
};

interface WorkflowEditorProps {
  automationId: string;
  automationName: string;
  automationStatus: string;
  automationTrigger: string;
  initialNodes: Node[];
  initialEdges: Edge[];
}

export function WorkflowEditor({
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
  const [status, setStatus] = useState(automationStatus);
  const [saving, setSaving] = useState(false);
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds) =>
        addEdge(
          {
            ...connection,
            type: "smoothstep",
            animated: true,
            style: { stroke: "#525252", strokeWidth: 2 },
            markerEnd: { type: MarkerType.ArrowClosed, color: "#525252" },
          },
          eds
        )
      );
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

  const handleAddNode = useCallback(
    (type: WorkflowNodeType) => {
      const lastNode = nodes[nodes.length - 1];
      const x = lastNode ? (lastNode.position?.x ?? 0) : 300;
      const y = lastNode ? (lastNode.position?.y ?? 0) + 150 : 300;

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

      // Auto-connect to last node
      if (lastNode) {
        const newEdge: Edge = {
          id: `edge_${lastNode.id}_${newNode.id}`,
          source: lastNode.id,
          target: newNode.id,
          type: "smoothstep",
          animated: true,
          style: { stroke: "#525252", strokeWidth: 2 },
          markerEnd: { type: MarkerType.ArrowClosed, color: "#525252" },
        };
        const updatedEdges = [...edges, newEdge];
        setEdges(updatedEdges);
        scheduleSave(updatedNodes, updatedEdges);
      } else {
        scheduleSave(updatedNodes, edges);
      }
    },
    [nodes, edges, setNodes, setEdges, scheduleSave]
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
            style: { stroke: "#525252", strokeWidth: 2 },
          }}
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

        {/* Floating + button */}
        <button
          onClick={() => setShowAddPanel(!showAddPanel)}
          className="absolute bottom-6 right-6 z-40 w-12 h-12 rounded-full bg-orange-600 hover:bg-orange-500 text-white flex items-center justify-center shadow-lg shadow-orange-500/20 transition-all cursor-pointer hover:scale-105"
        >
          <Plus className="h-5 w-5" />
        </button>

        {/* Add node panel */}
        {showAddPanel && (
          <AddNodePanel
            onAdd={handleAddNode}
            onClose={() => setShowAddPanel(false)}
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
