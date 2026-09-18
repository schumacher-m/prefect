import { QueryClient } from "@tanstack/react-query";
import {
	createMemoryHistory,
	createRootRoute,
	createRouter,
	RouterProvider,
} from "@tanstack/react-router";
import { render, screen, waitFor } from "@testing-library/react";
import { buildApiUrl, createWrapper, server } from "@tests/utils";
import { HttpResponse, http } from "msw";
import { describe, expect, it } from "vitest";
import type { DeploymentWithFlow } from "@/api/deployments";
import { createFakeFlowRun } from "@/mocks/create-fake-flow-run";
import { DeploymentsIndexGrid } from "./deployments-index-grid";

const mockDeployment: DeploymentWithFlow = {
	id: "deployment-1",
	created: new Date().toISOString(),
	updated: new Date().toISOString(),
	name: "Nightly ETL",
	flow_id: "flow-id",
	paused: false,
	status: "READY",
	enforce_parameter_schema: true,
	tags: [],
	flow: {
		id: "flow-id",
		created: new Date().toISOString(),
		updated: new Date().toISOString(),
		name: "etl",
	},
};

const renderGrid = (props: { size?: number } = {}) => {
	const rootRoute = createRootRoute({
		component: () => (
			<DeploymentsIndexGrid deployments={[mockDeployment]} size={props.size} />
		),
	});
	const router = createRouter({
		routeTree: rootRoute,
		history: createMemoryHistory({ initialEntries: ["/"] }),
		context: { queryClient: new QueryClient() },
	});
	return render(<RouterProvider router={router} />, {
		wrapper: createWrapper(),
	});
};

describe("DeploymentsIndexGrid", () => {
	it("renders the deployment name", async () => {
		server.use(
			http.post(buildApiUrl("/flow_runs/filter"), () => HttpResponse.json([])),
		);

		renderGrid();

		expect(await screen.findByText("Nightly ETL")).toBeInTheDocument();
	});

	it("renders a 5x5 slot grid by default", async () => {
		server.use(
			http.post(buildApiUrl("/flow_runs/filter"), () => HttpResponse.json([])),
		);

		renderGrid();

		await waitFor(() => {
			expect(screen.getAllByTestId("flow-run-slot")).toHaveLength(25);
		});
	});

	it("renders size squared slots", async () => {
		server.use(
			http.post(buildApiUrl("/flow_runs/filter"), () => HttpResponse.json([])),
		);

		renderGrid({ size: 3 });

		await waitFor(() => {
			expect(screen.getAllByTestId("flow-run-slot")).toHaveLength(9);
		});
	});

	it("does not render scheduled runs as filled slots", async () => {
		server.use(
			http.post(buildApiUrl("/flow_runs/filter"), () =>
				HttpResponse.json([
					createFakeFlowRun({
						id: "run-completed",
						state_type: "COMPLETED",
						state_name: "Completed",
					}),
					createFakeFlowRun({
						id: "run-scheduled",
						state_type: "SCHEDULED",
						state_name: "Scheduled",
					}),
				]),
			),
		);

		renderGrid();

		await waitFor(() => {
			expect(
				document.querySelector('[data-run-id="run-completed"]'),
			).toBeInTheDocument();
		});
		expect(
			document.querySelector('[data-run-id="run-scheduled"]'),
		).not.toBeInTheDocument();
	});
});
