
export interface TransportOptions {
  file: string
  limit?: string
  json?: boolean
  formatter?: function
}

export type TimeDiffUnit = 's' | 'second' | 'm' | 'minute' | 'h' | 'hour' | 'd' | 'day' | 'w' | 'week' | 'M' | 'month' | 'Q' | 'quarter' | 'y' | 'year'
