export function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
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
