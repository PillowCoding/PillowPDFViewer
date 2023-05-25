export type PickPartial<T, K extends keyof T> = Partial<Pick<T, K>>
export type PickRequired<T, K extends keyof T> = Required<Pick<T, K>>