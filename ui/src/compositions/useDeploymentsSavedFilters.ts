import type { DeploymentSortValues } from '@prefecthq/prefect-ui-library'
import { useLocalStorage } from '@prefecthq/vue-compositions'
import { computed, type ComputedRef } from 'vue'

export const DEPLOYMENTS_SAVED_FILTERS_STORAGE_KEY = 'prefect-ui-deployments-saved-filters'

export type DeploymentSavedFilterValues = {
  flowOrDeploymentName?: string,
  tags?: string[],
  sort?: DeploymentSortValues,
}

export type SavedDeploymentFilter = {
  id: string,
  name: string,
  filters: DeploymentSavedFilterValues,
}

export type SavedDeploymentFilterCreate = {
  name: string,
  filters: DeploymentSavedFilterValues,
}

type UseDeploymentsSavedFilters = {
  savedFilters: ComputedRef<SavedDeploymentFilter[]>,
  saveFilter: (filterCreate: SavedDeploymentFilterCreate) => SavedDeploymentFilter,
  updateFilter: (filterId: string, updates: Partial<SavedDeploymentFilterCreate>) => void,
  deleteFilter: (filterId: string) => void,
  findMatchingFilter: (current: DeploymentSavedFilterValues) => SavedDeploymentFilter | undefined,
}

function generateFilterId(): string {
  return `dep-filter-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}

export function areDeploymentFiltersEqual(
  filterA: DeploymentSavedFilterValues,
  filterB: DeploymentSavedFilterValues,
): boolean {
  const nameA = filterA.flowOrDeploymentName?.trim() ?? ''
  const nameB = filterB.flowOrDeploymentName?.trim() ?? ''
  if (nameA !== nameB) {
    return false
  }

  const tagsA = [...filterA.tags ?? []].sort()
  const tagsB = [...filterB.tags ?? []].sort()
  if (tagsA.length !== tagsB.length) {
    return false
  }
  if (!tagsA.every((tag, idx) => tag === tagsB[idx])) {
    return false
  }

  const sortA = filterA.sort ?? 'NAME_ASC'
  const sortB = filterB.sort ?? 'NAME_ASC'
  return sortA === sortB
}

function normalizeFilters(filters: DeploymentSavedFilterValues): DeploymentSavedFilterValues {
  return {
    flowOrDeploymentName: filters.flowOrDeploymentName?.trim() === ''
      ? undefined
      : filters.flowOrDeploymentName?.trim(),
    tags: filters.tags?.length ? filters.tags : undefined,
    sort: filters.sort,
  }
}

export function useDeploymentsSavedFilters(): UseDeploymentsSavedFilters {
  const { value: savedFilters, set: setSavedFilters } = useLocalStorage<SavedDeploymentFilter[]>(
    DEPLOYMENTS_SAVED_FILTERS_STORAGE_KEY,
    [],
  )

  const filters = computed(() => savedFilters.value)

  function saveFilter(filterCreate: SavedDeploymentFilterCreate): SavedDeploymentFilter {
    const created: SavedDeploymentFilter = {
      id: generateFilterId(),
      name: filterCreate.name.trim(),
      filters: normalizeFilters(filterCreate.filters),
    }
    setSavedFilters([...filters.value, created])
    return created
  }

  function updateFilter(filterId: string, updates: Partial<SavedDeploymentFilterCreate>): void {
    setSavedFilters(filters.value.map((saved) => {
      if (saved.id !== filterId) {
        return saved
      }

      return {
        ...saved,
        ...updates.name !== undefined && { name: updates.name.trim() },
        ...updates.filters !== undefined && { filters: normalizeFilters(updates.filters) },
      }
    }))
  }

  function deleteFilter(filterId: string): void {
    setSavedFilters(filters.value.filter((saved) => saved.id !== filterId))
  }

  function findMatchingFilter(current: DeploymentSavedFilterValues): SavedDeploymentFilter | undefined {
    return filters.value.find((saved) => areDeploymentFiltersEqual(saved.filters, current))
  }

  return {
    savedFilters: filters,
    saveFilter,
    updateFilter,
    deleteFilter,
    findMatchingFilter,
  }
}
