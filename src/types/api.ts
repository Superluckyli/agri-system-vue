export type R<T> = {
    code: number
    msg: string
    data: T
}

export type MpPage<T> = {
    current: number
    size: number
    total: number
    records: T[]
    pages?: number
}
