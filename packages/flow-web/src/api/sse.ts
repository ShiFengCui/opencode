import { EventStreamContentType, fetchEventSource } from '@microsoft/fetch-event-source'

export interface GraphEvent {
  type: string
  properties: any
}

export interface GraphEventCallbacks {
  onNodeStarted?: (data: any) => void
  onNodeCompleted?: (data: any) => void
  onStateUpdated?: (data: any) => void
  onExecutionCompleted?: (data: any) => void
  onError?: (error: Error) => void
  onClose?: () => void
}

/**
 * SSE 事件流订阅
 */
export function subscribeGraphEvents(
  sessionID: string,
  callbacks: GraphEventCallbacks,
  baseUrl?: string,
): () => void {
  const url = `${baseUrl || ''}/graph/${sessionID}/stream`
  
  let closed = false

  const connect = async () => {
    try {
      await fetchEventSource(url, {
        method: 'GET',
        headers: {
          'Accept': EventStreamContentType,
        },
        openWhenHidden: true,
        async onopen(response) {
          if (response.ok) {
            console.log('[SSE] Connection opened')
            return
          } else if (response.status >= 400 && response.status < 500) {
            console.error('[SSE] Client error:', response.status)
            throw new Error(`Client error: ${response.status}`)
          } else {
            console.error('[SSE] Server error:', response.status)
            throw new Error(`Server error: ${response.status}`)
          }
        },
        onmessage(event) {
          try {
            const data: GraphEvent = JSON.parse(event.data)
            console.log('[SSE] Event received:', data.type)

            switch (data.type) {
              case 'graph.node.started':
                callbacks.onNodeStarted?.(data.properties)
                break
              case 'graph.node.completed':
                callbacks.onNodeCompleted?.(data.properties)
                break
              case 'graph.state.updated':
                callbacks.onStateUpdated?.(data.properties)
                break
              case 'graph.execution.completed':
                callbacks.onExecutionCompleted?.(data.properties)
                break
            }
          } catch (error) {
            console.error('[SSE] Error parsing event:', error)
          }
        },
        onerror(error) {
          console.error('[SSE] Error:', error)
          if (closed) {
            return
          }
          callbacks.onError?.(error as Error)
          throw error
        },
        onclose() {
          console.log('[SSE] Connection closed')
          callbacks.onClose?.()
        },
      })
    } catch (error) {
      if (!closed) {
        console.error('[SSE] Connection failed:', error)
        callbacks.onError?.(error as Error)
      }
    }
  }

  connect()

  return () => {
    closed = true
  }
}

/**
 * 使用 EventSource 的简单订阅（备选方案）
 */
export function subscribeWithEventSource(
  sessionID: string,
  callbacks: GraphEventCallbacks,
  baseUrl?: string,
): () => {
  const url = `${baseUrl || ''}/graph/${sessionID}/stream`
  const eventSource = new EventSource(url)

  eventSource.addEventListener('graph.node.started', (event) => {
    callbacks.onNodeStarted?.(JSON.parse(event.data))
  })

  eventSource.addEventListener('graph.node.completed', (event) => {
    callbacks.onNodeCompleted?.(JSON.parse(event.data))
  })

  eventSource.addEventListener('graph.state.updated', (event) => {
    callbacks.onStateUpdated?.(JSON.parse(event.data))
  })

  eventSource.addEventListener('graph.execution.completed', (event) => {
    callbacks.onExecutionCompleted?.(JSON.parse(event.data))
  })

  eventSource.onerror = (error) => {
    console.error('[EventSource] Error:', error)
    callbacks.onError?.(error as Error)
  }

  return () => {
    eventSource.close()
  }
}
