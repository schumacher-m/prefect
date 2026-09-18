<template>
  <div class="deployments-index-grid">
    <div class="deployments-index-grid__filters">
      <SearchInput v-model="nameLike" size="small" placeholder="Search deployments..." label="Search deployments" />
      <DeploymentTagsInput v-model:selected="filter.deployments.tags.name" small multiple />
      <p-select v-model="filter.sort" small :options="deploymentSortOptions" />
      <p-select v-model="size" small :options="sizeOptions" />
    </div>

    <p v-if="truncated" class="deployments-index-grid__truncated">
      Showing {{ deployments.length }} of {{ count }} deployments
    </p>

    <p-loading-icon v-if="!subscription.executed" />

    <div v-else class="deployments-index-grid__tiles p-background">
      <div
        v-for="deployment in deployments"
        :key="deployment.id"
        class="deployments-index-grid__tile"
        :class="{ 'deployments-index-grid__tile--paused': deployment.paused }"
      >
        <div class="deployments-index-grid__heading">
          <DeploymentStatusIcon v-if="deployment.status" :status="deployment.status" />
          <p-link class="deployments-index-grid__name" :to="routes.deployment(deployment.id)" :title="deployment.name">
            {{ deployment.name }}
          </p-link>
        </div>

        <FlowRunsSlotGrid :deployment-id="deployment.id" :size="size" />
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
  import {
    DeploymentStatusIcon,
    DeploymentTagsInput,
    SearchInput,
    deploymentSortOptions,
    useDeployments,
    useDeploymentsFilterFromRoute,
    useWorkspaceRoutes
  } from '@prefecthq/prefect-ui-library'
  import { useDebouncedRef, useLocalStorage } from '@prefecthq/vue-compositions'
  import { computed, ref, watch } from 'vue'
  import FlowRunsSlotGrid from '@/components/FlowRunsSlotGrid.vue'

  const PAGE_SIZE = 200
  const sizeOptions = [3, 4, 5, 6, 7, 8].map(value => ({ label: `${value}×${value}`, value }))
  const { value: size } = useLocalStorage('prefect-ui-deployments-slot-size', 5)

  const routes = useWorkspaceRoutes()
  const { filter } = useDeploymentsFilterFromRoute({
    limit: PAGE_SIZE,
    sort: 'NAME_ASC',
  })
  const nameLike = ref(filter.deployments.flowOrDeploymentNameLike)
  const nameLikeDebounced = useDebouncedRef(nameLike, 1200)

  watch(nameLikeDebounced, value => {
    filter.deployments.flowOrDeploymentNameLike = value
  })

  const { deployments, subscription, count } = useDeployments(() => ({
    deployments: filter.deployments,
    sort: filter.sort,
    limit: PAGE_SIZE,
    page: 1,
  }), { interval: 30000 })

  const truncated = computed(() => count.value > deployments.value.length)
</script>

<style>
.deployments-index-grid { @apply
  flex
  flex-col
  gap-3
}

.deployments-index-grid__filters { @apply
  flex
  flex-wrap
  items-center
  justify-end
  gap-2
}

.deployments-index-grid__truncated { @apply
  text-sm
  text-subdued
}

.deployments-index-grid__tiles { @apply
  grid
  gap-2
  p-2
  border
  border-divider
  rounded-default;
  grid-template-columns: repeat(auto-fill, minmax(8rem, 1fr));
}

.deployments-index-grid__tile { @apply
  flex
  flex-col
  gap-1
}

.deployments-index-grid__tile--paused { @apply
  opacity-65
}

.deployments-index-grid__heading { @apply
  flex
  items-center
  gap-1
  min-w-0
}

.deployments-index-grid__name { @apply
  truncate
  font-semibold
  text-xs
}
</style>
