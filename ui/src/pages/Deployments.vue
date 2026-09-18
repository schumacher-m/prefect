<template>
  <p-layout-default class="deployments">
    <template #header>
      <PageHeadingDeployments />
    </template>

    <template v-if="loaded">
      <template v-if="empty">
        <DeploymentsPageEmptyState />
      </template>

      <template v-else>
        <div class="deployments__toolbar">
          <p-button-group v-model="view" small :options="viewOptions" />
        </div>

        <DeploymentsIndexGrid v-if="view === 'grid'" />
        <DeploymentList v-else @delete="deploymentsCountSubscription.refresh" />
      </template>
    </template>
  </p-layout-default>
</template>

<script lang="ts" setup>
  import { ButtonGroupOption } from '@prefecthq/prefect-design'
  import { DeploymentList, PageHeadingDeployments, DeploymentsPageEmptyState, useWorkspaceApi } from '@prefecthq/prefect-ui-library'
  import { useLocalStorage, useSubscription } from '@prefecthq/vue-compositions'
  import { computed } from 'vue'
  import DeploymentsIndexGrid from '@/components/DeploymentsIndexGrid.vue'
  import { usePageTitle } from '@/compositions/usePageTitle'

  const api = useWorkspaceApi()
  const { value: view } = useLocalStorage<'grid' | 'rows'>('prefect-ui-deployments-view', 'rows')
  const viewOptions: ButtonGroupOption[] = [
    { value: 'rows', icon: 'Bars4Icon' },
    { value: 'grid', icon: 'Squares2X2Icon' },
  ]
  const subscriptionOptions = {
    interval: 30000,
  }

  const deploymentsCountSubscription = useSubscription(api.deployments.getDeploymentsCount, [{}], subscriptionOptions)
  const deploymentsCount = computed(() => deploymentsCountSubscription.response ?? 0)
  const empty = computed(() => deploymentsCountSubscription.executed && deploymentsCount.value === 0)
  const loaded = computed(() => deploymentsCountSubscription.executed)

  usePageTitle('Deployments')
</script>

<style>
.deployments__toolbar { @apply
  flex
  justify-end
  mb-3
}
</style>