export type Broadcastable =
  | string
  | number
  | boolean
  | null
  | Broadcastable[]
  | { [key: string]: Broadcastable }
