export function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

export function createUntilTriggeredOnce<F extends (...args: any[]) => any, P extends any[] = Parameters<F>, R = ReturnType<F>>(fn: F): {
  onceTriggered: Promise<Awaited<R>>
  wrapper: (...args: P) => Promise<Awaited<R>>
} {
  let resolve!: (r: Awaited<R>) => void
  const promise = new Promise<Awaited<R>>((res) => {
    resolve = res
  })

  const handler = async (...args: P[]): Promise<Awaited<R>> => {
    const res = await fn(...args)
    resolve(res)
    return res
  }

  return {
    onceTriggered: promise,
    wrapper: handler,
  }
}

export function createUntilTriggered<P, R>(fn: (...args: P[]) => R): {
  promise: Promise<void>
  handler: () => void
} {
  let resolve!: () => void
  const promise = new Promise<void>((res) => {
    resolve = res
  })

  const handler = (...args: P[]): R => {
    resolve()
    return fn(...args)
  }

  return { promise, handler }
}

export function createUntil<T>(options?: { intervalHandler?: () => Promise<boolean>, interval?: number }): {
  promise: Promise<T>
  handler: (value: T) => void
} {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((res) => {
    resolve = res
  })

  if (options?.intervalHandler) {
    setInterval(() => {
      options?.intervalHandler?.().then((shouldResolve) => {
        if (shouldResolve) {
          resolve(undefined as unknown as T)
        }
      })
    }, options.interval ?? 50)
  }

  return { promise, handler: resolve }
}
