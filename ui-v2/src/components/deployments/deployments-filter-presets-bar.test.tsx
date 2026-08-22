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

	it("renders 'All' preset by default as active", () => {
		render(<DeploymentsFilterPresetsBar {...defaultProps} />);
		expect(screen.getByText("Presets:")).toBeInTheDocument();
		const allBtn = screen.getByRole("button", { name: "All" });
		expect(allBtn).toBeInTheDocument();
		expect(allBtn).toHaveClass("bg-secondary");
	});

	it("clicking 'All' calls onClearFilters when filters were set", async () => {
		const user = userEvent.setup();
		const onClearFilters = vi.fn();
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
});
