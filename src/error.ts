export function toErrorObject(err: unknown, depth?: number, maxDepth: number = 5): {
  name: string
  message: string
  stack?: string
  cause?: Error
} {
  if (depth != null && depth >= maxDepth) {
    return {
      name: 'Error',
      message: `Error object too deep: ${JSON.stringify(err)}`,
    }
  }

  if (err instanceof Error) {
    const errorObject: {
      name: string
      message: string
      stack?: string
      cause?: Error
    } = {
      name: err?.name || 'Error',
      message: err?.message || `Unexpected Error: ${JSON.stringify(err)}`,
      stack: err.stack,
    }
    if (err.cause != null) {
      errorObject.cause = toErrorObject(err.cause, depth ? depth + 1 : 1)
    }
  }

  const e = err as {
    name?: string
    message?: string
    stack?: string
    cause?: unknown
  }
  const errorObject: {
    name: string
    message: string
    stack?: string
    cause?: Error
  } = {
    name: e?.name || 'Error',
    message: e?.message || `Unexpected Error: ${JSON.stringify(e)}`,
    stack: e.stack,
  }
  if (e.cause != null) {
    errorObject.cause = toErrorObject(e.cause, depth ? depth + 1 : 1)
  }

  return errorObject
}

export function fromErrorObject(object?: {
  name: string
  message: string
  stack?: string
  cause?: unknown
}): Error | undefined {
  if (object == null) {
    return undefined
  }

  const error = new Error(object.message)
  error.name = object.name
  error.stack = object.stack

  if (object.cause != null) {
    if (typeof object.cause === 'object' && 'name' in object.cause && 'message' in object.cause) {
      error.cause = fromErrorObject(object.cause as { name: string, message: string, stack?: string, cause?: unknown })
    }
    else {
      error.cause = new Error(`Caused by: ${JSON.stringify(object.cause)}`)
    }
  }

  return error
}
