import type { Meta, StoryObj } from "@storybook/react";
import { buildApiUrl } from "@tests/utils/handlers";
import { HttpResponse, http } from "msw";
import { createFakeDeploymentWithFlow } from "@/mocks";
import { createFakeFlowRun } from "@/mocks/create-fake-flow-run";
import { reactQueryDecorator, routerDecorator } from "@/storybook/utils";
import { DeploymentsIndexGrid } from "./deployments-index-grid";

const deployments = Array.from({ length: 12 }, createFakeDeploymentWithFlow);

export default {
	title: "Components/Deployments/IndexGrid",
	component: DeploymentsIndexGrid,
	decorators: [routerDecorator, reactQueryDecorator],
	parameters: {
		msw: {
			handlers: [
				http.post(buildApiUrl("/flow_runs/filter"), async ({ request }) => {
					const { limit } = (await request.json()) as { limit: number };
					return HttpResponse.json(
						Array.from({ length: Math.min(limit ?? 5, 5) }, () =>
							createFakeFlowRun({
								state_type: "COMPLETED",
								state_name: "Completed",
							}),
						),
					);
				}),
			],
		},
	},
} satisfies Meta<typeof DeploymentsIndexGrid>;

export const Default: StoryObj<typeof DeploymentsIndexGrid> = {
	args: {
		deployments,
		size: 5,
	},
};
