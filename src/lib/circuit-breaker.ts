// Circuit breaker — fail fast when Postgres is unavailable instead of letting
// every request hang on a ~5s connection timeout. Adapted from the hogwarts
// pattern. Used by tenant-context's workspace lookup.
//
//   CLOSED    → normal; requests pass through
//   OPEN      → DB down; fail immediately
//   HALF_OPEN → cooldown elapsed; allow one probe
type CircuitState = "closed" | "open" | "half-open"

interface CircuitBreakerConfig {
  failureThreshold: number
  cooldownMs: number
  name: string
}

export class CircuitBreakerError extends Error {
  constructor(
    message: string,
    public readonly remainingCooldownMs: number,
  ) {
    super(message)
    this.name = "CircuitBreakerError"
  }
}

class CircuitBreaker {
  private failures = 0
  private lastFailureTime = 0
  private state: CircuitState = "closed"
  private readonly config: CircuitBreakerConfig

  constructor(config: CircuitBreakerConfig) {
    this.config = config
  }

  private remainingCooldownMs(): number {
    return Math.max(
      0,
      this.config.cooldownMs - (Date.now() - this.lastFailureTime),
    )
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === "open") {
      if (Date.now() - this.lastFailureTime >= this.config.cooldownMs) {
        this.state = "half-open"
      } else {
        throw new CircuitBreakerError(
          `[${this.config.name}] circuit open — database unavailable`,
          this.remainingCooldownMs(),
        )
      }
    }

    try {
      const result = await fn()
      this.failures = 0
      this.state = "closed"
      return result
    } catch (error) {
      this.failures++
      this.lastFailureTime = Date.now()
      if (this.state === "half-open") {
        this.state = "open"
      } else if (this.failures >= this.config.failureThreshold) {
        this.state = "open"
        console.error(
          `[${this.config.name}] circuit opened after ${this.failures} failures`,
        )
      }
      throw error
    }
  }
}

export const dbCircuitBreaker = new CircuitBreaker({
  failureThreshold: 5,
  cooldownMs: 30_000,
  name: "db",
})
