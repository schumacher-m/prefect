<template>
  <div ref="grid" class="flow-runs-slot-grid" :style="gridStyle" @mouseleave="close">
    <p-pop-over
      v-for="(flowRun, index) in slots"
      :key="flowRun?.id ?? `empty-${index}`"
      class="flow-runs-slot-grid__cell"
      :to="grid"
      :placement="placement"
      :group="group"
      auto-close
    >
      <template #target="{ open }">
        <div
          class="flow-runs-slot-grid__slot"
          :class="{ 'flow-runs-slot-grid__slot--empty': !flowRun }"
          :style="getSlotStyle(flowRun)"
          @mouseover="flowRun && open()"
        />
      </template>

      <template v-if="flowRun">
        <div class="flow-runs-slot-grid__pop-over">
          <FlowRunPopOverContent :flow-run-id="flowRun.id" />
        </div>
      </template>
    </p-pop-over>
  </div>
</template>

<script lang="ts" setup>
  import { positions, usePopOverGroup } from '@prefecthq/prefect-design'
  import { FlowRun, FlowRunPopOverContent, useFlowRuns } from '@prefecthq/prefect-ui-library'
  import { computed, ref } from 'vue'

  const SLOT_STATES = [
    'completed',
    'running',
    'pending',
    'failed',
    'cancelled',
    'cancelling',
    'crashed',
    'paused',
  ]

  const props = withDefaults(defineProps<{
    deploymentId: string,
    size?: number,
  }>(), {
    size: 5,
  })

  const size = computed(() => {
    const value = Number(props.size)
    return Number.isFinite(value) && value > 0 ? value : 5
  })
  const slotCount = computed(() => size.value ** 2)
  const gridStyle = computed(() => ({
    gridTemplateColumns: `repeat(${size.value}, 1fr)`,
    gridTemplateRows: `repeat(${size.value}, 1fr)`,
  }))

  const grid = ref<HTMLDivElement>()
  const placement = [positions.bottom, positions.right, positions.left, positions.top]
  const group = 'flow-runs-slot-grid'
  const { close } = usePopOverGroup(group)

  const filter = computed(() => ({
    deployments: {
      id: [props.deploymentId],
    },
    flowRuns: {
      state: {
        type: [...SLOT_STATES],
      },
    },
    limit: slotCount.value,
    sort: 'START_TIME_DESC' as const,
  }))

  // ponytail: one request per tile; batch by deployment ids if this wall gets large
  const { flowRuns } = useFlowRuns(filter, { interval: 30000 })

  const slots = computed(() => {
    const recentOldestFirst = flowRuns.value
      .filter(flowRun => flowRun.stateType !== 'scheduled')
      .slice(0, slotCount.value)
      .reverse()
    const empty = slotCount.value - recentOldestFirst.length

    return [
      ...Array.from<FlowRun | null>({ length: Math.max(empty, 0) }).fill(null),
      ...recentOldestFirst,
    ]
  })

  function getSlotStyle(flowRun: FlowRun | null): { backgroundColor: string } | undefined {
    if (!flowRun?.stateType) {
      return undefined
    }

    return {
      backgroundColor: `var(--state-${flowRun.stateType}-500)`,
    }
  }
</script>

<style>
.flow-runs-slot-grid { @apply
  relative
  grid
  w-full
  aspect-square;
  gap: 2px;
}

.flow-runs-slot-grid__cell { @apply
  min-h-0
  min-w-0
}

.flow-runs-slot-grid__slot { @apply
  block
  h-full
  w-full
  rounded-[2px]
}

.flow-runs-slot-grid__slot--empty { @apply
  bg-sentiment-neutral
}

.flow-runs-slot-grid__pop-over { @apply
  p-2
}
</style>
