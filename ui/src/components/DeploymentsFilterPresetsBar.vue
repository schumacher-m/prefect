<template>
  <div v-if="hasPresets || showSave" class="deployments-filter-presets-bar">
    <template v-if="hasPresets">
      <span class="deployments-filter-presets-bar__label">
        Presets:
      </span>

      <p-button
        small
        class="deployments-filter-presets-bar__pill"
        :class="{ 'deployments-filter-presets-bar__pill--active': isAllActive }"
        @click="selectAll"
      >
        All
      </p-button>

      <div
        v-for="preset in savedFilters"
        :key="preset.id"
        class="deployments-filter-presets-bar__preset"
        :class="{ 'deployments-filter-presets-bar__preset--active': selectedPreset?.id === preset.id }"
      >
        <input
          v-if="renamingId === preset.id"
          :aria-label="`Rename preset ${preset.name}`"
          class="deployments-filter-presets-bar__preset-input"
          maxlength="100"
          :size="Math.max(draftName.length, 8)"
          :value="draftName"
          @blur="commitRename(preset)"
          @click.stop
          @input="onDraftInput"
          @keydown.enter.prevent="commitRename(preset)"
          @keydown.escape.prevent="cancelRename"
        >
        <template v-else>
          <button type="button" class="deployments-filter-presets-bar__preset-name" @click="selectPreset(preset)">
            {{ selectedPreset?.id === preset.id && isDirty ? `${preset.name} •` : preset.name }}
          </button>
          <button
            type="button"
            class="deployments-filter-presets-bar__preset-rename"
            :aria-label="`Rename preset ${preset.name}`"
            @click.stop="startRename(preset)"
          >
            ✎
          </button>
          <button
            type="button"
            class="deployments-filter-presets-bar__preset-delete"
            :aria-label="`Delete preset ${preset.name}`"
            @click.stop="filterToDelete = preset"
          >
            ×
          </button>
        </template>
      </div>
    </template>

    <p-button v-if="isDirty" small class="deployments-filter-presets-bar__pill" @click="updateSelected">
      Update
    </p-button>

    <p-button v-if="showSave" small class="deployments-filter-presets-bar__save" @click="showSaveModal = true">
      Save filter
    </p-button>
  </div>

  <p-modal v-model:show-modal="showSaveModal" title="Save filter preset">
    <p-label label="Name">
      <p-text-input v-model="newFilterName" placeholder="e.g. Alpha Services" />
    </p-label>

    <template #actions>
      <p-button primary :disabled="!newFilterName.trim()" @click="saveCurrent">
        Save
      </p-button>
    </template>
  </p-modal>

  <p-modal v-model:show-modal="showDeleteModal" title="Delete filter preset">
    <p>
      Are you sure you want to delete "{{ filterToDelete?.name }}"?
    </p>

    <template #actions>
      <p-button danger @click="confirmDelete">
        Delete
      </p-button>
    </template>
  </p-modal>
</template>

<script lang="ts" setup>
  import { useDeploymentsPaginationFilterFromRoute } from '@prefecthq/prefect-ui-library'
  import { computed, nextTick, ref, watch } from 'vue'
  import {
    areDeploymentFiltersEqual,
    type DeploymentSavedFilterValues,
    type SavedDeploymentFilter,
    useDeploymentsSavedFilters
  } from '@/compositions/useDeploymentsSavedFilters'

  const { filter, clear } = useDeploymentsPaginationFilterFromRoute()
  const { savedFilters, saveFilter, updateFilter, deleteFilter, findMatchingFilter } = useDeploymentsSavedFilters()

  const selectedPresetId = ref<string | null>(null)
  const showSaveModal = ref(false)
  const newFilterName = ref('')
  const filterToDelete = ref<SavedDeploymentFilter | null>(null)
  const renamingId = ref<string | null>(null)
  const draftName = ref('')
  let ignoreRenameBlur = false

  const currentFilterValues = computed<DeploymentSavedFilterValues>(() => {
    const tags = filter.deployments.tags.name
    return {
      flowOrDeploymentName: filter.deployments.flowOrDeploymentNameLike === ''
        ? undefined
        : filter.deployments.flowOrDeploymentNameLike,
      tags: tags?.length ? [...tags] : undefined,
      sort: filter.sort,
    }
  })

  const matchingFilter = computed(() => findMatchingFilter(currentFilterValues.value))
  const hasActiveFilters = computed(() => {
    return Boolean(currentFilterValues.value.flowOrDeploymentName?.trim()) || Boolean(currentFilterValues.value.tags?.length)
  })
  const isAllActive = computed(() => !hasActiveFilters.value)
  const hasPresets = computed(() => savedFilters.value.length > 0)
  const showSave = computed(() => hasActiveFilters.value && !matchingFilter.value)

  watch(matchingFilter, (match) => {
    if (match) {
      selectedPresetId.value = match.id
    }
  }, { immediate: true })

  const selectedPreset = computed(() => {
    if (!hasActiveFilters.value) {
      return undefined
    }
    return savedFilters.value.find((preset) => preset.id === selectedPresetId.value)
  })

  const isDirty = computed(() => {
    return Boolean(
      selectedPreset.value &&
        !areDeploymentFiltersEqual(selectedPreset.value.filters, currentFilterValues.value),
    )
  })

  const showDeleteModal = computed({
    get() {
      return filterToDelete.value !== null
    },
    set(value: boolean) {
      if (!value) {
        filterToDelete.value = null
      }
    },
  })

  function applyFilters(values: DeploymentSavedFilterValues): void {
    filter.deployments.flowOrDeploymentNameLike = values.flowOrDeploymentName
    filter.deployments.tags.name = values.tags?.length ? [...values.tags] : undefined
    if (values.sort) {
      filter.sort = values.sort
    }
    filter.page = 1
  }

  function selectAll(): void {
    selectedPresetId.value = null
    clear()
  }

  function selectPreset(preset: SavedDeploymentFilter): void {
    selectedPresetId.value = preset.id
    applyFilters(preset.filters)
  }

  function updateSelected(): void {
    if (!selectedPreset.value) {
      return
    }
    updateFilter(selectedPreset.value.id, { filters: currentFilterValues.value })
  }

  function startRename(preset: SavedDeploymentFilter): void {
    ignoreRenameBlur = false
    renamingId.value = preset.id
    draftName.value = preset.name
    void nextTick(() => {
      const input = document.querySelector(
        ".deployments-filter-presets-bar__preset-input",
      ) as HTMLInputElement | null
      input?.focus()
      input?.select()
    })
  }

  function onDraftInput(event: Event): void {
    draftName.value = (event.target as HTMLInputElement).value
  }

  function cancelRename(): void {
    ignoreRenameBlur = true
    renamingId.value = null
    draftName.value = ''
  }

  function commitRename(preset: SavedDeploymentFilter): void {
    if (ignoreRenameBlur) {
      ignoreRenameBlur = false
      return
    }
    const name = draftName.value.trim()
    if (name && name !== preset.name) {
      updateFilter(preset.id, { name })
    }
    renamingId.value = null
    draftName.value = ''
  }

  function saveCurrent(): void {
    const name = newFilterName.value.trim()
    if (!name) {
      return
    }
    saveFilter({
      name,
      filters: currentFilterValues.value,
    })
    newFilterName.value = ''
    showSaveModal.value = false
  }

  function confirmDelete(): void {
    if (!filterToDelete.value) {
      return
    }
    deleteFilter(filterToDelete.value.id)
    filterToDelete.value = null
  }
</script>

<style>
.deployments-filter-presets-bar { @apply
  flex
  items-center
  gap-1.5
  overflow-x-auto
  py-1
  mb-3
}

.deployments-filter-presets-bar__label { @apply
  text-xs
  font-medium
  text-subdued
  shrink-0
  mr-1
}

.deployments-filter-presets-bar__pill { @apply
  shrink-0
}

.deployments-filter-presets-bar__pill--active { @apply
  font-semibold
}

.deployments-filter-presets-bar__preset { @apply
  inline-flex
  items-center
  rounded-full
  border
  text-xs
  shrink-0
}

.deployments-filter-presets-bar__preset--active { @apply
  font-semibold
}

.deployments-filter-presets-bar__preset-name { @apply
  px-3
  py-1
  text-xs
  cursor-pointer
}

.deployments-filter-presets-bar__preset-rename { @apply
  inline-flex
  items-center
  justify-center
  overflow-hidden
  w-0
  p-0
  text-subdued
  cursor-pointer
  opacity-0
}

.deployments-filter-presets-bar__preset:hover .deployments-filter-presets-bar__preset-rename,
.deployments-filter-presets-bar__preset-rename:focus-visible { @apply
  w-4
  opacity-100
}

@media (hover: none) {
  .deployments-filter-presets-bar__preset-rename { @apply
    w-4
    opacity-100
  }
}

.deployments-filter-presets-bar__preset-input { @apply
  h-7
  min-w-24
  rounded-full
  bg-transparent
  px-3
  text-xs
  outline-none
}

.deployments-filter-presets-bar__preset-delete { @apply
  pr-2
  pl-0.5
  py-1
  text-subdued
  cursor-pointer
}

.deployments-filter-presets-bar__save { @apply
  shrink-0
}
</style>
