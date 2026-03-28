"use client";

import { useCallback, useState, useRef, useEffect, createContext } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  useReactFlow,
  reconnectEdge,
  type Connection,
  type Node,
  type Edge,
  BackgroundVariant,
  MarkerType,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Plus, Power, PowerOff, Maximize, Undo2, Redo2 } from "lucide-react";
import { WorkflowNode } from "./workflow-node";
import { WorkflowEdge } from "./workflow-edge";
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
const MAX_HISTORY = 20;

const nodeTypes = {
  workflowNode: WorkflowNode,
};

const edgeTypes = {
  workflow: WorkflowEdge,
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
    type: "workflow",
    animated: true,
    style: { stroke: EDGE_COLOR, strokeWidth: 2 },
    markerEnd: { type: MarkerType.ArrowClosed, color: EDGE_COLOR },
  };
}

interface HistoryEntry {
  nodes: Node[];
  edges: Edge[];
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
  const reactFlowInstance = useReactFlow();

  // --- UNDO/REDO ---
  const historyRef = useRef<HistoryEntry[]>([{ nodes: initialNodes, edges: initialEdges }]);
  const historyIndexRef = useRef(0);
  const isUndoRedoRef = useRef(false);

  const pushHistory = useCallback((newNodes: Node[], newEdges: Edge[]) => {
    if (isUndoRedoRef.current) return;
    const idx = historyIndexRef.current;
    // Trim forward history
    historyRef.current = historyRef.current.slice(0, idx + 1);
    historyRef.current.push({ nodes: newNodes, edges: newEdges });
    // Limit size
    if (historyRef.current.length > MAX_HISTORY) {
      historyRef.current = historyRef.current.slice(historyRef.current.length - MAX_HISTORY);
    }
    historyIndexRef.current = historyRef.current.length - 1;
  }, []);

  const undo = useCallback(() => {
    if (historyIndexRef.current <= 0) return;
    isUndoRedoRef.current = true;
    historyIndexRef.current -= 1;
    const entry = historyRef.current[historyIndexRef.current];
    setNodes(entry.nodes);
    setEdges(entry.edges);
    requestAnimationFrame(() => {
      isUndoRedoRef.current = false;
    });
  }, [setNodes, setEdges]);

  const redo = useCallback(() => {
    if (historyIndexRef.current >= historyRef.current.length - 1) return;
    isUndoRedoRef.current = true;
    historyIndexRef.current += 1;
    const entry = historyRef.current[historyIndexRef.current];
    setNodes(entry.nodes);
    setEdges(entry.edges);
    requestAnimationFrame(() => {
      isUndoRedoRef.current = false;
    });
  }, [setNodes, setEdges]);

  // Keyboard shortcuts: undo/redo + delete
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Undo: Ctrl+Z (without Shift)
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
        return;
      }
      // Redo: Ctrl+Shift+Z
      if ((e.ctrlKey || e.metaKey) && e.key === "Z" && e.shiftKey) {
        e.preventDefault();
        redo();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "y") {
        e.preventDefault();
        redo();
        return;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [undo, redo]);

  // Manual edge push — avoids addEdge() duplicate rejection
  const onConnect = useCallback(
    (connection: Connection) => {
      console.log("[RF] onConnect:", connection.source, "→", connection.target);
      if (!connection.source || !connection.target) return;
      setEdges((eds) => {
        const updated = [
          ...eds,
          {
            id: `e-${connection.source}-${connection.target}-${Date.now()}`,
            source: connection.source,
            target: connection.target,
            sourceHandle: connection.sourceHandle ?? null,
            targetHandle: connection.targetHandle ?? null,
            type: "workflow",
            animated: true,
            style: { stroke: EDGE_COLOR, strokeWidth: 2 },
            markerEnd: { type: MarkerType.ArrowClosed, color: EDGE_COLOR },
          },
        ];
        // Use requestAnimationFrame to push history after state settles
        requestAnimationFrame(() => {
          pushHistory(nodes, updated);
        });
        return updated;
      });
    },
    [setEdges, nodes, pushHistory]
  );

  // --- EDGE RECONNECTION ---
  const edgeReconnectSuccessful = useRef(true);

  const onReconnectStart = useCallback(() => {
    edgeReconnectSuccessful.current = false;
  }, []);

  const onReconnect = useCallback(
    (oldEdge: Edge, newConnection: Connection) => {
      edgeReconnectSuccessful.current = true;
      setEdges((eds) => {
        const updated = reconnectEdge(oldEdge, newConnection, eds);
        requestAnimationFrame(() => {
          pushHistory(nodes, updated);
        });
        return updated;
      });
    },
    [setEdges, nodes, pushHistory]
  );

  const onReconnectEnd = useCallback(
    (_: MouseEvent | TouchEvent, edge: Edge) => {
      if (!edgeReconnectSuccessful.current) {
        setEdges((eds) => {
          const updated = eds.filter((e) => e.id !== edge.id);
          requestAnimationFrame(() => {
            pushHistory(nodes, updated);
          });
          return updated;
        });
      }
    },
    [setEdges, nodes, pushHistory]
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
            pushHistory(updatedNodes, updated);
            scheduleSave(updatedNodes, updated);
            return updated;
          });
        });
      } else {
        pushHistory(updatedNodes, edges);
        scheduleSave(updatedNodes, edges);
      }

      // Reset connectFromNodeId
      setConnectFromNodeId(null);
    },
    [nodes, edges, setNodes, setEdges, scheduleSave, connectFromNodeId, pushHistory]
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
        pushHistory(updated, edges);
        scheduleSave(updated, edges);
        return updated;
      });
    },
    [setNodes, edges, scheduleSave, pushHistory]
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
          pushHistory(updated, updatedEdges);
          scheduleSave(updated, updatedEdges);
          return updatedEdges;
        });
        return updated;
      });
    },
    [setNodes, setEdges, scheduleSave, pushHistory]
  );

  // --- DELETE HANDLER (nodes via keyboard + edges via keyboard) ---
  // React Flow's onDelete fires when user selects elements and presses Delete/Backspace
  const onDelete = useCallback(
    ({ nodes: deletedNodes, edges: deletedEdges }: { nodes: Node[]; edges: Edge[] }) => {
      // If deleting nodes, also remove their connected edges
      const deletedNodeIds = new Set(deletedNodes.map((n) => n.id));
      // Close config panel if selected node is being deleted
      if (selectedNodeId && deletedNodeIds.has(selectedNodeId)) {
        setSelectedNodeId(null);
      }

      setNodes((nds) => {
        const updated = nds.filter((n) => !deletedNodeIds.has(n.id));
        setEdges((eds) => {
          const deletedEdgeIds = new Set(deletedEdges.map((e) => e.id));
          const updatedEdges = eds.filter(
            (e) =>
              !deletedEdgeIds.has(e.id) &&
              !deletedNodeIds.has(e.source) &&
              !deletedNodeIds.has(e.target)
          );
          pushHistory(updated, updatedEdges);
          scheduleSave(updated, updatedEdges);
          return updatedEdges;
        });
        return updated;
      });
    },
    [setNodes, setEdges, scheduleSave, pushHistory, selectedNodeId]
  );

  // --- CONFIRMATION BEFORE DELETE: flash connected edges red ---
  const onBeforeDelete = useCallback(
    async ({ nodes: toDeleteNodes, edges: toDeleteEdges }: { nodes: Node[]; edges: Edge[] }) => {
      if (toDeleteNodes.length > 0) {
        // Find connected edges for the nodes being deleted
        const nodeIds = new Set(toDeleteNodes.map((n) => n.id));
        const connectedEdgeIds = edges
          .filter((e) => nodeIds.has(e.source) || nodeIds.has(e.target))
          .map((e) => e.id);

        if (connectedEdgeIds.length > 0) {
          // Flash connected edges red briefly
          setEdges((eds) =>
            eds.map((e) =>
              connectedEdgeIds.includes(e.id)
                ? {
                    ...e,
                    style: { ...e.style, stroke: "#ef4444", strokeWidth: 3 },
                    animated: false,
                  }
                : e
            )
          );
          // Wait for flash to be visible
          await new Promise((resolve) => setTimeout(resolve, 300));
          // Restore (the delete will happen right after)
          setEdges((eds) =>
            eds.map((e) =>
              connectedEdgeIds.includes(e.id)
                ? {
                    ...e,
                    style: { ...e.style, stroke: EDGE_COLOR, strokeWidth: 2 },
                    animated: true,
                  }
                : e
            )
          );
        }
      }
      return true;
    },
    [edges, setEdges]
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

  // --- FIT VIEW ---
  const handleFitView = useCallback(() => {
    reactFlowInstance.fitView({ padding: 0.3, duration: 500 });
  }, [reactFlowInstance]);

  const selectedNode = selectedNodeId
    ? (nodes.find((n) => n.id === selectedNodeId) as (Node & { data: WorkflowNodeData }) | undefined) ?? null
    : null;

  const isActive = status === "ACTIVE";
  const isEmpty = nodes.length === 0;

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
            {/* Node count display */}
            <span className="text-[10px] text-zinc-600 font-mono">
              {nodes.length} noeud{nodes.length !== 1 ? "s" : ""} · {edges.length} connexion{edges.length !== 1 ? "s" : ""}
            </span>
            {saving && (
              <span className="text-[10px] text-zinc-500 font-mono">
                Sauvegarde...
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Undo */}
          <button
            onClick={undo}
            title="Annuler (Ctrl+Z)"
            className="p-2 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <Undo2 className="h-4 w-4" />
          </button>
          {/* Redo */}
          <button
            onClick={redo}
            title="Retablir (Ctrl+Shift+Z)"
            className="p-2 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <Redo2 className="h-4 w-4" />
          </button>
          {/* Fit View */}
          <button
            onClick={handleFitView}
            title="Ajuster la vue"
            className="p-2 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <Maximize className="h-4 w-4" />
          </button>
          {/* Toggle status */}
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
          onDelete={onDelete}
          onBeforeDelete={onBeforeDelete}
          onReconnectStart={onReconnectStart}
          onReconnect={onReconnect}
          onReconnectEnd={onReconnectEnd}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          snapToGrid
          snapGrid={[15, 15]}
          fitView
          fitViewOptions={{ padding: 0.3 }}
          deleteKeyCode={["Backspace", "Delete"]}
          defaultEdgeOptions={{
            type: "workflow",
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

          {/* Empty state */}
          {isEmpty && (
            <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
              <div className="flex flex-col items-center gap-4 pointer-events-auto">
                <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center">
                  <Plus className="h-8 w-8 text-zinc-600" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-zinc-400">
                    Commencez par ajouter un declencheur
                  </p>
                  <p className="text-xs text-zinc-600 mt-1">
                    Cliquez sur le bouton + pour demarrer
                  </p>
                </div>
                <button
                  onClick={() => {
                    setConnectFromNodeId(null);
                    setShowAddPanel(true);
                  }}
                  className="mt-2 px-6 py-3 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-sm font-medium shadow-lg shadow-orange-500/20 transition-all cursor-pointer hover:scale-105 inline-flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Ajouter un noeud
                </button>
              </div>
            </div>
          )}
        </ReactFlow>
        </WorkflowContext.Provider>

        {/* Floating + button */}
        {!isEmpty && (
          <button
            onClick={() => {
              setConnectFromNodeId(null);
              setShowAddPanel(!showAddPanel);
            }}
            className="absolute bottom-6 right-6 z-40 w-12 h-12 rounded-full bg-orange-600 hover:bg-orange-500 text-white flex items-center justify-center shadow-lg shadow-orange-500/20 transition-all cursor-pointer hover:scale-105"
          >
            <Plus className="h-5 w-5" />
          </button>
        )}

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
