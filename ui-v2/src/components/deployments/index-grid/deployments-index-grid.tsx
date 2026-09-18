import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useMemo } from "react";
import type { DeploymentWithFlow } from "@/api/deployments";
import { buildFilterFlowRunsQuery, type FlowRun } from "@/api/flow-runs";
import type { components } from "@/api/prefect";
import { StatusIcon } from "@/components/ui/status-badge";
import { cn } from "@/utils";

export const DEPLOYMENTS_VIEW_STORAGE_KEY = "prefect-ui-v2-deployments-view";
export const DEPLOYMENTS_SLOT_SIZE_STORAGE_KEY =
	"prefect-ui-v2-deployments-slot-size";
export const DEPLOYMENTS_GRID_PAGE_SIZE = 200;

const SLOT_STATES = [
	"COMPLETED",
	"RUNNING",
	"PENDING",
	"FAILED",
	"CANCELLED",
	"CANCELLING",
	"CRASHED",
	"PAUSED",
] as const satisfies readonly components["schemas"]["StateType"][];

const SLOT_COLORS = {
	COMPLETED: "bg-state-completed-500",
	FAILED: "bg-state-failed-500",
	RUNNING: "bg-state-running-500",
	CANCELLED: "bg-state-cancelled-500",
	CANCELLING: "bg-state-cancelling-500",
	CRASHED: "bg-state-crashed-500",
	PAUSED: "bg-state-paused-500",
	PENDING: "bg-state-pending-500",
	SCHEDULED: "bg-state-scheduled-500",
} as const satisfies Record<components["schemas"]["StateType"], string>;

type DeploymentsIndexGridProps = {
	deployments: DeploymentWithFlow[];
	size?: number;
};

export function DeploymentsIndexGrid({
	deployments,
	size = 5,
}: DeploymentsIndexGridProps) {
	return (
		<div
			className="grid gap-2 p-2 border border-border rounded-lg bg-card"
			style={{
				gridTemplateColumns: "repeat(auto-fill, minmax(8rem, 1fr))",
			}}
			data-testid="deployments-index-grid"
		>
			{deployments.map((deployment) => (
				<div
					key={deployment.id}
					className={cn(
						"flex flex-col gap-1",
						deployment.paused && "opacity-65",
					)}
				>
					<div className="flex items-center gap-1 min-w-0">
						{deployment.status ? (
							<StatusIcon status={deployment.status} />
						) : null}
						<Link
							to="/deployments/deployment/$id"
							params={{ id: deployment.id }}
							className="truncate font-semibold text-xs"
							title={deployment.name}
						>
							{deployment.name}
						</Link>
					</div>
					<FlowRunsSlotGrid deploymentId={deployment.id} size={size} />
				</div>
			))}
		</div>
	);
}

function FlowRunsSlotGrid({
	deploymentId,
	size,
}: {
	deploymentId: string;
	size: number;
}) {
	const slotCount = Math.max(1, size) ** 2;
	const { data: flowRuns = [] } = useQuery(
		buildFilterFlowRunsQuery({
			deployments: {
				operator: "and_",
				id: { any_: [deploymentId] },
			},
			flow_runs: {
				operator: "and_",
				state: {
					operator: "and_",
					type: { any_: [...SLOT_STATES] },
				},
			},
			sort: "START_TIME_DESC",
			limit: slotCount,
			offset: 0,
		}),
	);

	const slots = useMemo(() => {
		const recentOldestFirst = flowRuns
			.filter((flowRun) => flowRun.state_type !== "SCHEDULED")
			.slice(0, slotCount)
			.reverse();
		const emptyCount = Math.max(slotCount - recentOldestFirst.length, 0);
		return [
			...Array.from({ length: emptyCount }, (_, emptyIndex) => ({
				id: `empty-${emptyIndex}`,
				flowRun: null as FlowRun | null,
			})),
			...recentOldestFirst.map((flowRun) => ({ id: flowRun.id, flowRun })),
		];
	}, [flowRuns, slotCount]);

	return (
		<div
			className="relative grid w-full aspect-square gap-0.5"
			style={{
				gridTemplateColumns: `repeat(${size}, 1fr)`,
				gridTemplateRows: `repeat(${size}, 1fr)`,
			}}
		>
			{slots.map((slot) =>
				slot.flowRun ? (
					<Link
						key={slot.id}
						to="/runs/flow-run/$id"
						params={{ id: slot.flowRun.id }}
						data-testid="flow-run-slot"
						data-run-id={slot.flowRun.id}
						title={
							slot.flowRun.state_name ?? slot.flowRun.state_type ?? undefined
						}
						className={cn(
							"min-h-0 min-w-0 rounded-[2px]",
							slot.flowRun.state_type
								? SLOT_COLORS[slot.flowRun.state_type]
								: "bg-muted",
						)}
					/>
				) : (
					<div
						key={slot.id}
						data-testid="flow-run-slot"
						className="min-h-0 min-w-0 rounded-[2px] bg-muted"
					/>
				),
			)}
		</div>
	);
}
