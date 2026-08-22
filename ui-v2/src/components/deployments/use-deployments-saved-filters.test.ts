/* eslint-disable @typescript-eslint/unbound-method */
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	areDeploymentFiltersEqual,
	DEPLOYMENTS_SAVED_FILTERS_STORAGE_KEY,
	type DeploymentSavedFilterValues,
	type SavedDeploymentFilter,
	useDeploymentsSavedFilters,
} from "./use-deployments-saved-filters";

describe("areDeploymentFiltersEqual", () => {
	it("returns true for empty filter objects", () => {
		const a: DeploymentSavedFilterValues = {};
		const b: DeploymentSavedFilterValues = {};
		expect(areDeploymentFiltersEqual(a, b)).toBe(true);
	});

	it("returns true for matching name and tags regardless of tag order", () => {
		const a: DeploymentSavedFilterValues = {
			flowOrDeploymentName: "alpha",
			tags: ["tag-1", "tag-2"],
			sort: "NAME_ASC",
		};
		const b: DeploymentSavedFilterValues = {
			flowOrDeploymentName: "alpha",
			tags: ["tag-2", "tag-1"],
			sort: "NAME_ASC",
		};
		expect(areDeploymentFiltersEqual(a, b)).toBe(true);
	});

	it("returns false for different names or tags", () => {
		const a: DeploymentSavedFilterValues = { flowOrDeploymentName: "alpha" };
		const b: DeploymentSavedFilterValues = { flowOrDeploymentName: "beta" };
		expect(areDeploymentFiltersEqual(a, b)).toBe(false);

		const c: DeploymentSavedFilterValues = { tags: ["tag-1"] };
		const d: DeploymentSavedFilterValues = { tags: ["tag-2"] };
		expect(areDeploymentFiltersEqual(c, d)).toBe(false);
	});

	it("returns false for different sort orders", () => {
		const a: DeploymentSavedFilterValues = { sort: "CREATED_DESC" };
		const b: DeploymentSavedFilterValues = { sort: "NAME_ASC" };
		expect(areDeploymentFiltersEqual(a, b)).toBe(false);
	});
});

describe("useDeploymentsSavedFilters", () => {
	beforeEach(() => {
		localStorage.clear();
		vi.clearAllMocks();
	});

	it("initializes with empty saved filters", () => {
		const { result } = renderHook(() => useDeploymentsSavedFilters());
		expect(result.current.savedFilters).toEqual([]);
	});

	it("saves a new filter and persists to localStorage", () => {
		const { result } = renderHook(() => useDeploymentsSavedFilters());

		let created: SavedDeploymentFilter | undefined;
		act(() => {
			created = result.current.saveFilter({
				name: "Alpha Deployments",
				filters: {
					flowOrDeploymentName: "alpha",
					tags: ["tag-alpha"],
				},
			});
		});

		expect(result.current.savedFilters).toHaveLength(1);
		expect(result.current.savedFilters[0].name).toBe("Alpha Deployments");
		expect(result.current.savedFilters[0].filters.flowOrDeploymentName).toBe(
			"alpha",
		);
		expect(created).toBeDefined();

		expect(localStorage.setItem).toHaveBeenCalledWith(
			DEPLOYMENTS_SAVED_FILTERS_STORAGE_KEY,
			expect.stringContaining("Alpha Deployments"),
		);
	});

	it("deletes a saved filter", () => {
		const { result } = renderHook(() => useDeploymentsSavedFilters());

		let filterA: SavedDeploymentFilter | undefined;
		act(() => {
			filterA = result.current.saveFilter({
				name: "Filter A",
				filters: { tags: ["tag-a"] },
			});
			result.current.saveFilter({
				name: "Filter B",
				filters: { tags: ["tag-b"] },
			});
		});

		expect(result.current.savedFilters).toHaveLength(2);

		act(() => {
			if (filterA) {
				result.current.deleteFilter(filterA.id);
			}
		});

		expect(result.current.savedFilters).toHaveLength(1);
		expect(result.current.savedFilters[0].name).toBe("Filter B");
	});

	it("finds matching filter", () => {
		const { result } = renderHook(() => useDeploymentsSavedFilters());

		act(() => {
			result.current.saveFilter({
				name: "Alpha Group",
				filters: { tags: ["tag-alpha"] },
			});
		});

		const match = result.current.findMatchingFilter({ tags: ["tag-alpha"] });
		expect(match).toBeDefined();
		expect(match?.name).toBe("Alpha Group");

		const noMatch = result.current.findMatchingFilter({ tags: ["tag-beta"] });
		expect(noMatch).toBeUndefined();
	});
});
