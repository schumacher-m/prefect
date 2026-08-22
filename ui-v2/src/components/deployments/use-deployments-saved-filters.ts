import { useCallback } from "react";
import type { components } from "@/api/prefect";
import { useLocalStorage } from "@/hooks/use-local-storage";

export const DEPLOYMENTS_SAVED_FILTERS_STORAGE_KEY =
	"prefect-ui-v2-deployments-saved-filters";

export type DeploymentSavedFilterValues = {
	flowOrDeploymentName?: string;
	tags?: string[];
	sort?: components["schemas"]["DeploymentSort"];
};

export type SavedDeploymentFilter = {
	id: string;
	name: string;
	filters: DeploymentSavedFilterValues;
};

export type SavedDeploymentFilterCreate = {
	name: string;
	filters: DeploymentSavedFilterValues;
};

function generateFilterId(): string {
	return `dep-filter-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

export function areDeploymentFiltersEqual(
	filterA: DeploymentSavedFilterValues,
	filterB: DeploymentSavedFilterValues,
): boolean {
	const nameA = filterA.flowOrDeploymentName?.trim() ?? "";
	const nameB = filterB.flowOrDeploymentName?.trim() ?? "";
	if (nameA !== nameB) {
		return false;
	}

	const tagsA = [...(filterA.tags ?? [])].sort();
	const tagsB = [...(filterB.tags ?? [])].sort();
	if (tagsA.length !== tagsB.length) {
		return false;
	}
	if (!tagsA.every((tag, idx) => tag === tagsB[idx])) {
		return false;
	}

	const sortA = filterA.sort ?? "NAME_ASC";
	const sortB = filterB.sort ?? "NAME_ASC";
	return sortA === sortB;
}

export type UseDeploymentsSavedFiltersReturn = {
	savedFilters: SavedDeploymentFilter[];
	saveFilter: (
		filterCreate: SavedDeploymentFilterCreate,
	) => SavedDeploymentFilter;
	deleteFilter: (filterId: string) => void;
	findMatchingFilter: (
		filters: DeploymentSavedFilterValues,
	) => SavedDeploymentFilter | undefined;
};

export function useDeploymentsSavedFilters(): UseDeploymentsSavedFiltersReturn {
	const [savedFilters, setSavedFilters] = useLocalStorage<
		SavedDeploymentFilter[]
	>(DEPLOYMENTS_SAVED_FILTERS_STORAGE_KEY, []);

	const saveFilter = useCallback(
		(filterCreate: SavedDeploymentFilterCreate): SavedDeploymentFilter => {
			const newFilter: SavedDeploymentFilter = {
				id: generateFilterId(),
				name: filterCreate.name.trim(),
				filters: {
					flowOrDeploymentName:
						filterCreate.filters.flowOrDeploymentName?.trim() || undefined,
					tags: filterCreate.filters.tags?.length
						? filterCreate.filters.tags
						: undefined,
					sort: filterCreate.filters.sort,
				},
			};
			setSavedFilters((prev) => [...prev, newFilter]);
			return newFilter;
		},
		[setSavedFilters],
	);

	const deleteFilter = useCallback(
		(filterId: string): void => {
			setSavedFilters((prev) => prev.filter((f) => f.id !== filterId));
		},
		[setSavedFilters],
	);

	const findMatchingFilter = useCallback(
		(
			filters: DeploymentSavedFilterValues,
		): SavedDeploymentFilter | undefined => {
			return savedFilters.find((f) =>
				areDeploymentFiltersEqual(f.filters, filters),
			);
		},
		[savedFilters],
	);

	return {
		savedFilters,
		saveFilter,
		deleteFilter,
		findMatchingFilter,
	};
}
