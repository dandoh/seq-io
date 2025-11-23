import { useEffect, useState, useRef } from 'react'
import { orpcClient } from '@/orpc/client'
import type { CDCEvent } from '@/lib/kafka-cdc-consumer'

export interface UseStreamOptions {
  topicPrefix: string
}

export function useStream(options: UseStreamOptions) {
  const { topicPrefix } = options
  const [isConnected, setIsConnected] = useState(false)
  const [messages, setMessages] = useState<CDCEvent[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isStreaming, setIsStreaming] = useState(true)
  const abortControllerRef = useRef<AbortController | null>(null)
  // Track seen messages to prevent duplicates across stream restarts
  const seenMessageIds = useRef<Set<string>>(new Set())

  const stopStream = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      setIsStreaming(false)
      setIsConnected(false)
    }
  }

  const startStreamManually = () => {
    setIsStreaming(true)
  }


  useEffect(() => {
    if (!isStreaming) return

    const abortController = new AbortController()
    abortControllerRef.current = abortController
    let isActive = true

    const startStream = async () => {
      try {
        setIsConnected(true)
        setError(null)


        // Subscribe to the SSE stream using oRPC
        const iterator = await orpcClient.stream({
          topicPrefix,
        }, {
          signal: abortController.signal,
        })
        

        for await (const data of iterator) {
          if (!isActive) break

          // Create unique message ID from topic + offset
          const messageId = `${data.topic}-${data.offset}`
          
          // Skip if we've already seen this message
          if (seenMessageIds.current.has(messageId)) {
            continue
          }
          
          // Mark as seen
          seenMessageIds.current.add(messageId)

          setMessages((prev) => {
            const newMessages = [data, ...prev]
            // Keep only the last 50 messages
            // return newMessages.slice(0, 50)
            return newMessages
          })
        }
      } catch (err: any) {
        if (err.name === 'AbortError') {
        } else {
          setError(err.message || 'Stream error occurred')
          setIsConnected(false)
        }
      } finally {
        if (isActive) {
          setIsConnected(false)
        }
      }
    }

    startStream()

    return () => {
      isActive = false
      abortController.abort()
    }
  }, [isStreaming, topicPrefix])

  // Clear messages when topicPrefix changes
  useEffect(() => {
    clearMessages()
  }, [topicPrefix])

  const clearMessages = () => {
    setMessages([])
    seenMessageIds.current.clear()
  }

  return {
    isConnected,
    isStreaming,
    messages,
    error,
    stopStream,
    startStream: startStreamManually,
    clearMessages,
  }
}

