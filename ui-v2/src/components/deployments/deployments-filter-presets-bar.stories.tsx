import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "storybook/test";
import { DeploymentsFilterPresetsBar } from "./deployments-filter-presets-bar";

const meta = {
	title: "Components/Deployments/DeploymentsFilterPresetsBar",
	component: DeploymentsFilterPresetsBar,
	parameters: {
		layout: "padded",
	},
	args: {
		columnFilters: [],
		sort: "NAME_ASC",
		onColumnFiltersChange: fn(),
		onSortChange: fn(),
		onClearFilters: fn(),
	},
} satisfies Meta<typeof DeploymentsFilterPresetsBar>;

export default meta;
type Story = StoryObj<typeof DeploymentsFilterPresetsBar>;

export const Default: Story = {
	args: {
		columnFilters: [],
	},
};

export const WithActiveFilters: Story = {
	args: {
		columnFilters: [
			{ id: "flowOrDeploymentName", value: "service-alpha" },
			{ id: "tags", value: ["tag-alpha"] },
		],
	},
};
