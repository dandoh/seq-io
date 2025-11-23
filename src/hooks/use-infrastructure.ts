import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { orpcQuery } from '@/orpc/client'

export function useInfrastructure() {
  const queryClient = useQueryClient()

  const statusQuery = useQuery(
    orpcQuery.infrastructureStatus.queryOptions({
      refetchInterval: 3000, // Poll every 3 seconds
    }),
  )

  const startMutation = useMutation(
    orpcQuery.infrastructureStart.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: orpcQuery.infrastructureStatus.queryKey(),
        })
      },
    }),
  )

  const stopMutation = useMutation(
    orpcQuery.infrastructureStop.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: orpcQuery.infrastructureStatus.queryKey(),
        })
      },
    }),
  )

  const restartMutation = useMutation(
    orpcQuery.infrastructureRestart.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: orpcQuery.infrastructureStatus.queryKey(),
        })
      },
    }),
  )

  const isOperationPending =
    startMutation.isPending ||
    stopMutation.isPending ||
    restartMutation.isPending

  return {
    status: statusQuery,
    start: startMutation,
    stop: stopMutation,
    restart: restartMutation,
    isOperationPending,
  }
}

