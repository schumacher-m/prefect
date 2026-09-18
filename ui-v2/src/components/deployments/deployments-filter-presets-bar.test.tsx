import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	DeploymentsFilterPresetsBar,
	type DeploymentsFilterPresetsBarProps,
} from "./deployments-filter-presets-bar";
import {
	DEPLOYMENTS_SAVED_FILTERS_STORAGE_KEY,
	type SavedDeploymentFilter,
} from "./use-deployments-saved-filters";

describe("DeploymentsFilterPresetsBar", () => {
	const defaultProps: DeploymentsFilterPresetsBarProps = {
		columnFilters: [],
		sort: "NAME_ASC",
		onColumnFiltersChange: vi.fn(),
		onSortChange: vi.fn(),
		onClearFilters: vi.fn(),
	};

	const installLocalStorageBacking = () => {
		const store = new Map<string, string>();
		vi.spyOn(localStorage, "getItem").mockImplementation(
			(key) => store.get(key) ?? null,
		);
		vi.spyOn(localStorage, "setItem").mockImplementation((key, value) => {
			store.set(key, value);
		});
		vi.spyOn(localStorage, "removeItem").mockImplementation((key) => {
			store.delete(key);
		});
		return store;
	};

	beforeEach(() => {
		localStorage.clear();
		vi.clearAllMocks();
	});

	it("renders nothing when there are no presets and no active filters", () => {
		const { container } = render(
			<DeploymentsFilterPresetsBar {...defaultProps} />,
		);
		expect(container).toBeEmptyDOMElement();
		expect(screen.queryByText("Presets:")).not.toBeInTheDocument();
	});

	it("shows only Save filter when filters are active and no presets exist", () => {
		render(
			<DeploymentsFilterPresetsBar
				{...defaultProps}
				columnFilters={[{ id: "tags", value: ["new-tag"] }]}
			/>,
		);
		expect(screen.queryByText("Presets:")).not.toBeInTheDocument();
		expect(
			screen.queryByRole("button", { name: "All" }),
		).not.toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: /Save filter/i }),
		).toBeInTheDocument();
	});

	it("renders 'All' as active when presets exist and no filters are set", () => {
		installLocalStorageBacking();
		localStorage.setItem(
			DEPLOYMENTS_SAVED_FILTERS_STORAGE_KEY,
			JSON.stringify([
				{
					id: "preset-1",
					name: "Alpha Services",
					filters: { tags: ["tag-alpha"] },
				},
			] satisfies SavedDeploymentFilter[]),
		);

		render(<DeploymentsFilterPresetsBar {...defaultProps} />);
		expect(screen.getByText("Presets:")).toBeInTheDocument();
		const allBtn = screen.getByRole("button", { name: "All" });
		expect(allBtn).toBeInTheDocument();
		expect(allBtn).toHaveClass("bg-secondary");
	});

	it("clicking 'All' calls onClearFilters when filters were set", async () => {
		installLocalStorageBacking();
		const user = userEvent.setup();
		const onClearFilters = vi.fn();
		localStorage.setItem(
			DEPLOYMENTS_SAVED_FILTERS_STORAGE_KEY,
			JSON.stringify([
				{
					id: "preset-1",
					name: "Alpha Services",
					filters: { tags: ["tag-alpha"] },
				},
			] satisfies SavedDeploymentFilter[]),
		);

		render(
			<DeploymentsFilterPresetsBar
				{...defaultProps}
				columnFilters={[{ id: "flowOrDeploymentName", value: "test" }]}
				onClearFilters={onClearFilters}
			/>,
		);

		await user.click(screen.getByRole("button", { name: "All" }));
		expect(onClearFilters).toHaveBeenCalled();
	});

	it("renders saved presets from localStorage and handles selecting a preset", async () => {
		installLocalStorageBacking();
		const user = userEvent.setup();
		const savedFilters: SavedDeploymentFilter[] = [
			{
				id: "preset-1",
				name: "Alpha Services",
				filters: {
					flowOrDeploymentName: "alpha",
					tags: ["tag-alpha"],
					sort: "NAME_ASC",
				},
			},
		];
		localStorage.setItem(
			DEPLOYMENTS_SAVED_FILTERS_STORAGE_KEY,
			JSON.stringify(savedFilters),
		);

		const onColumnFiltersChange = vi.fn();
		const onSortChange = vi.fn();

		render(
			<DeploymentsFilterPresetsBar
				{...defaultProps}
				onColumnFiltersChange={onColumnFiltersChange}
				onSortChange={onSortChange}
			/>,
		);

		expect(screen.getByText("Alpha Services")).toBeInTheDocument();

		await user.click(screen.getByText("Alpha Services"));

		expect(onColumnFiltersChange).toHaveBeenCalledWith([
			{ id: "flowOrDeploymentName", value: "alpha" },
			{ id: "tags", value: ["tag-alpha"] },
		]);
		expect(onSortChange).toHaveBeenCalledWith("NAME_ASC");
	});

	it("shows 'Save filter' button when filters are active and not matched, and allows saving", async () => {
		const user = userEvent.setup();
		render(
			<DeploymentsFilterPresetsBar
				{...defaultProps}
				columnFilters={[{ id: "tags", value: ["new-tag"] }]}
			/>,
		);

		const saveBtn = screen.getByRole("button", { name: /Save filter/i });
		expect(saveBtn).toBeInTheDocument();

		await user.click(saveBtn);

		const nameInput = screen.getByPlaceholderText(
			/e.g., Failed runs this week/i,
		);
		await user.type(nameInput, "New Preset");

		const submitBtn = screen.getByRole("button", { name: "Save" });
		await user.click(submitBtn);

		await waitFor(() => {
			expect(screen.getByText("New Preset")).toBeInTheDocument();
		});
	});

	it("allows deleting a saved preset with confirmation", async () => {
		installLocalStorageBacking();
		const user = userEvent.setup();
		const savedFilters: SavedDeploymentFilter[] = [
			{
				id: "preset-delete-me",
				name: "To Delete",
				filters: { tags: ["del"] },
			},
		];
		localStorage.setItem(
			DEPLOYMENTS_SAVED_FILTERS_STORAGE_KEY,
			JSON.stringify(savedFilters),
		);

		render(<DeploymentsFilterPresetsBar {...defaultProps} />);

		expect(screen.getByText("To Delete")).toBeInTheDocument();

		const deleteBtn = screen.getByRole("button", {
			name: "Delete preset To Delete",
		});
		await user.click(deleteBtn);

		expect(
			screen.getByText('Are you sure you want to delete "To Delete"?'),
		).toBeInTheDocument();

		const confirmDeleteBtn = screen.getByRole("button", { name: "Delete" });
		await user.click(confirmDeleteBtn);

		await waitFor(() => {
			expect(screen.queryByText("To Delete")).not.toBeInTheDocument();
		});
	});

	it("keeps a modified preset selected and overwrites it on Update", async () => {
		installLocalStorageBacking();
		const user = userEvent.setup();
		const savedFilters: SavedDeploymentFilter[] = [
			{
				id: "preset-1",
				name: "Alpha Services",
				filters: {
					flowOrDeploymentName: "alpha",
					tags: ["tag-alpha"],
					sort: "NAME_ASC",
				},
			},
		];
		localStorage.setItem(
			DEPLOYMENTS_SAVED_FILTERS_STORAGE_KEY,
			JSON.stringify(savedFilters),
		);

		const { rerender } = render(
			<DeploymentsFilterPresetsBar
				{...defaultProps}
				columnFilters={[
					{ id: "flowOrDeploymentName", value: "alpha" },
					{ id: "tags", value: ["tag-alpha"] },
				]}
			/>,
		);

		expect(
			screen.queryByRole("button", { name: "Update" }),
		).not.toBeInTheDocument();

		rerender(
			<DeploymentsFilterPresetsBar
				{...defaultProps}
				columnFilters={[
					{ id: "flowOrDeploymentName", value: "alpha" },
					{ id: "tags", value: ["tag-alpha", "tag-beta"] },
				]}
			/>,
		);

		const dirtyPill = screen.getByRole("button", {
			name: "Alpha Services •",
		});
		expect(dirtyPill).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Update" })).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: /Save filter/i }),
		).toBeInTheDocument();

		await user.click(screen.getByRole("button", { name: "Update" }));

		await waitFor(() => {
			expect(
				screen.queryByRole("button", { name: "Update" }),
			).not.toBeInTheDocument();
			expect(screen.getByText("Alpha Services")).toBeInTheDocument();
		});

		const stored = JSON.parse(
			localStorage.getItem(DEPLOYMENTS_SAVED_FILTERS_STORAGE_KEY) ?? "[]",
		) as SavedDeploymentFilter[];
		expect(stored).toHaveLength(1);
		expect(stored[0].id).toBe("preset-1");
		expect(stored[0].name).toBe("Alpha Services");
		expect(stored[0].filters.tags).toEqual(["tag-alpha", "tag-beta"]);
	});

	it("reapplies the saved preset when a dirty pill is clicked", async () => {
		installLocalStorageBacking();
		const user = userEvent.setup();
		const savedFilters: SavedDeploymentFilter[] = [
			{
				id: "preset-1",
				name: "Alpha Services",
				filters: {
					flowOrDeploymentName: "alpha",
					tags: ["tag-alpha"],
					sort: "NAME_ASC",
				},
			},
		];
		localStorage.setItem(
			DEPLOYMENTS_SAVED_FILTERS_STORAGE_KEY,
			JSON.stringify(savedFilters),
		);

		const onColumnFiltersChange = vi.fn();
		const onSortChange = vi.fn();

		const { rerender } = render(
			<DeploymentsFilterPresetsBar
				{...defaultProps}
				columnFilters={[
					{ id: "flowOrDeploymentName", value: "alpha" },
					{ id: "tags", value: ["tag-alpha"] },
				]}
				onColumnFiltersChange={onColumnFiltersChange}
				onSortChange={onSortChange}
			/>,
		);

		rerender(
			<DeploymentsFilterPresetsBar
				{...defaultProps}
				columnFilters={[
					{ id: "flowOrDeploymentName", value: "alpha" },
					{ id: "tags", value: ["tag-alpha", "tag-beta"] },
				]}
				onColumnFiltersChange={onColumnFiltersChange}
				onSortChange={onSortChange}
			/>,
		);

		await user.click(screen.getByRole("button", { name: "Alpha Services •" }));

		expect(onColumnFiltersChange).toHaveBeenCalledWith([
			{ id: "flowOrDeploymentName", value: "alpha" },
			{ id: "tags", value: ["tag-alpha"] },
		]);
		expect(onSortChange).toHaveBeenCalledWith("NAME_ASC");
	});

	const seedPreset = (
		store: Map<string, string>,
		preset: SavedDeploymentFilter = {
			id: "preset-1",
			name: "Alpha Services",
			filters: {
				flowOrDeploymentName: "alpha",
				tags: ["tag-alpha"],
				sort: "NAME_ASC",
			},
		},
	) => {
		store.set(DEPLOYMENTS_SAVED_FILTERS_STORAGE_KEY, JSON.stringify([preset]));
	};

	it("renames a preset inline without applying its filters", async () => {
		const store = installLocalStorageBacking();
		const user = userEvent.setup();
		const onColumnFiltersChange = vi.fn();
		const onSortChange = vi.fn();
		seedPreset(store);

		render(
			<DeploymentsFilterPresetsBar
				{...defaultProps}
				onColumnFiltersChange={onColumnFiltersChange}
				onSortChange={onSortChange}
			/>,
		);

		await user.click(
			screen.getByRole("button", { name: "Rename preset Alpha Services" }),
		);

		expect(onColumnFiltersChange).not.toHaveBeenCalled();
		expect(onSortChange).not.toHaveBeenCalled();

		const nameInput = screen.getByRole("textbox", {
			name: "Rename preset Alpha Services",
		});
		expect(nameInput).toHaveValue("Alpha Services");

		await user.clear(nameInput);
		await user.type(nameInput, "Prod failures");
		await user.keyboard("{Enter}");

		await waitFor(() => {
			expect(screen.getByText("Prod failures")).toBeInTheDocument();
		});
		expect(
			screen.queryByRole("textbox", { name: /Rename preset/ }),
		).not.toBeInTheDocument();
		expect(onColumnFiltersChange).not.toHaveBeenCalled();

		const stored = JSON.parse(
			store.get(DEPLOYMENTS_SAVED_FILTERS_STORAGE_KEY) ?? "[]",
		) as SavedDeploymentFilter[];
		expect(stored[0]?.name).toBe("Prod failures");
		expect(stored[0]?.filters.tags).toEqual(["tag-alpha"]);
	});

	it("cancels rename on Escape and rejects an empty name", async () => {
		const store = installLocalStorageBacking();
		const user = userEvent.setup();
		seedPreset(store);

		render(<DeploymentsFilterPresetsBar {...defaultProps} />);

		await user.click(
			screen.getByRole("button", { name: "Rename preset Alpha Services" }),
		);
		const nameInput = screen.getByRole("textbox", {
			name: "Rename preset Alpha Services",
		});

		await user.clear(nameInput);
		await user.type(nameInput, "Temporary");
		await user.keyboard("{Escape}");

		expect(screen.getByText("Alpha Services")).toBeInTheDocument();
		expect(
			screen.queryByRole("textbox", { name: /Rename preset/ }),
		).not.toBeInTheDocument();

		await user.click(
			screen.getByRole("button", { name: "Rename preset Alpha Services" }),
		);
		const emptyInput = screen.getByRole("textbox", {
			name: "Rename preset Alpha Services",
		});
		await user.clear(emptyInput);
		await user.keyboard("{Enter}");

		expect(screen.getByText("Alpha Services")).toBeInTheDocument();
		const stored = JSON.parse(
			store.get(DEPLOYMENTS_SAVED_FILTERS_STORAGE_KEY) ?? "[]",
		) as SavedDeploymentFilter[];
		expect(stored[0]?.name).toBe("Alpha Services");
	});

	it("commits rename on blur", async () => {
		const store = installLocalStorageBacking();
		const user = userEvent.setup();
		seedPreset(store);

		render(<DeploymentsFilterPresetsBar {...defaultProps} />);

		await user.click(
			screen.getByRole("button", { name: "Rename preset Alpha Services" }),
		);
		const nameInput = screen.getByRole("textbox", {
			name: "Rename preset Alpha Services",
		});
		await user.clear(nameInput);
		await user.type(nameInput, "Nightly");
		await user.tab();

		await waitFor(() => {
			expect(screen.getByText("Nightly")).toBeInTheDocument();
		});
		const stored = JSON.parse(
			store.get(DEPLOYMENTS_SAVED_FILTERS_STORAGE_KEY) ?? "[]",
		) as SavedDeploymentFilter[];
		expect(stored[0]?.name).toBe("Nightly");
	});
});
