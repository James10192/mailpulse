import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { WorkflowEditor } from "@/components/automations/workflow-editor";
import { Breadcrumb } from "@/components/dashboard/breadcrumb";
import type { Node, Edge, MarkerType } from "@xyflow/react";

export default async function EditAutomationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const automation = await prisma.automation.findUnique({
    where: { id },
    include: {
      steps: { orderBy: { position: "asc" } },
    },
  });

  if (!automation) notFound();

  // Convert stored steps back to React Flow nodes + edges
  let initialNodes: Node[] = [];
  let initialEdges: Edge[] = [];

  if (automation.steps.length > 0) {
    initialNodes = automation.steps.map((step) => {
      const config = step.config as Record<string, unknown>;
      return {
        id: (config._nodeId as string) ?? `node_${step.id}`,
        type: "workflowNode",
        position: {
          x: (config._x as number) ?? 300,
          y: (config._y as number) ?? step.position * 150,
        },
        data: {
          type: step.type,
          label: (config._label as string) ?? step.type,
          config: Object.fromEntries(
            Object.entries(config).filter(([k]) => !k.startsWith("_"))
          ),
        },
      };
    });

    // Restore edges from the first step's config
    const firstConfig = automation.steps[0].config as Record<string, unknown>;
    if (firstConfig._edges) {
      initialEdges = (firstConfig._edges as Edge[]).map((e) => ({
        ...e,
        type: "workflow",
        animated: true,
        style: { stroke: "#71717a", strokeWidth: 2 },
        markerEnd: { type: "arrowclosed" as MarkerType, color: "#71717a" },
      }));
    }
  } else {
    // Default: create a trigger node from the automation's trigger
    const triggerLabels: Record<string, string> = {
      SUBSCRIBER_ADDED: "Nouvel abonne",
      TAG_ADDED: "Tag ajoute",
      CAMPAIGN_OPENED: "Campagne ouverte",
      LINK_CLICKED: "Lien clique",
      DATE_BASED: "Base sur la date",
      CUSTOM_EVENT: "Evenement personnalise",
    };

    initialNodes = [
      {
        id: "trigger_1",
        type: "workflowNode",
        position: { x: 300, y: 100 },
        data: {
          type: "trigger",
          label: "Declencheur",
          config: { triggerType: automation.trigger },
        },
      },
    ];
  }

  return (
    <>
      <Breadcrumb
        items={[
          { label: "", href: "/dashboard" },
          { label: "Automations", href: "/dashboard/automations" },
          { label: automation.name },
        ]}
      />
      <WorkflowEditor
        automationId={automation.id}
        automationName={automation.name}
        automationStatus={automation.status}
        automationTrigger={automation.trigger}
        initialNodes={initialNodes}
        initialEdges={initialEdges}
      />
    </>
  );
}
