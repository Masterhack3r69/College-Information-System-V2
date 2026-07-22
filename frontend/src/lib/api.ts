import type { ApiResponse, AuthResponse } from "@/lib/types"

const baseUrl = import.meta.env.VITE_API_BASE_URL ?? "/api/v1"
let accessToken: string | null = null
let refreshPromise: Promise<string | null> | null = null

export class ApiError extends Error {
  status: number
  code?: string
  retryAfter?: number
  errors: { field: string; message: string }[]
  constructor(
    message: string,
    status: number,
    errors: { field: string; message: string }[] = [],
    code?: string,
    retryAfter?: number
  ) {
    super(message)
    this.status = status
    this.errors = errors
    this.code = code
    this.retryAfter = retryAfter
  }
}

export function setAccessToken(token: string | null) {
  accessToken = token
}

async function refreshAccessToken() {
  const refreshToken = sessionStorage.getItem("sis.refreshToken")
  if (!refreshToken) return null
  if (!refreshPromise)
    refreshPromise = fetch(`${baseUrl}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    })
      .then(async (r) => {
        if (!r.ok) return null
        const body = (await r.json()) as ApiResponse<AuthResponse>
        accessToken = body.data.accessToken
        sessionStorage.setItem("sis.refreshToken", body.data.refreshToken)
        return accessToken
      })
      .finally(() => {
        refreshPromise = null
      })
  return refreshPromise
}

export async function api<T>(
  path: string,
  init: RequestInit = {},
  retry = true
): Promise<T> {
  const headers = new Headers(init.headers)
  if (!(init.body instanceof FormData))
    headers.set("Content-Type", "application/json")
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`)
  const response = await fetch(`${baseUrl}${path}`, { ...init, headers })
  if (response.status === 401 && retry && (await refreshAccessToken()))
    return api<T>(path, init, false)
  const body = (await response
    .json()
    .catch(() => null)) as ApiResponse<T> | null
  if (!response.ok || !body?.success)
    throw new ApiError(
      body?.message ?? "Request failed",
      response.status,
      body?.errors,
      body?.code,
      Number(response.headers.get("Retry-After")) || undefined
    )
  return body.data
}

/** For endpoints that don't sit under /api/v1 (e.g. /api/address). Returns raw JSON. */
export async function rawApi<T>(
  absolutePath: string,
  init: RequestInit = {},
  retry = true
): Promise<T> {
  const headers = new Headers(init.headers)
  headers.set("Content-Type", "application/json")
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`)
  const response = await fetch(absolutePath, { ...init, headers })
  if (response.status === 401 && retry && (await refreshAccessToken()))
    return rawApi<T>(absolutePath, init, false)
  if (!response.ok) throw new ApiError("Request failed", response.status)
  return response.json()
}

export async function openPdf(path: string) {
  const headers = new Headers()
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`)
  let response = await fetch(`${baseUrl}${path}`, { headers })
  if (response.status === 401 && (await refreshAccessToken())) {
    headers.set("Authorization", `Bearer ${accessToken}`)
    response = await fetch(`${baseUrl}${path}`, { headers })
  }
  if (!response.ok) throw new ApiError("Unable to open PDF", response.status)
  window.open(
    URL.createObjectURL(await response.blob()),
    "_blank",
    "noopener,noreferrer"
  )
}

export async function downloadFile(path: string) {
  const headers = new Headers()
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`)
  let response = await fetch(`${baseUrl}${path}`, { headers })
  if (response.status === 401 && (await refreshAccessToken())) {
    headers.set("Authorization", `Bearer ${accessToken}`)
    response = await fetch(`${baseUrl}${path}`, { headers })
  }
  if (!response.ok)
    throw new ApiError("Unable to download file", response.status)
  const disposition = response.headers.get("Content-Disposition") ?? ""
  const match = disposition.match(/filename="?([^";]+)"?/i)
  const url = URL.createObjectURL(await response.blob())
  const a = document.createElement("a")
  a.href = url
  a.download = match?.[1] ?? "download"
  a.click()
  URL.revokeObjectURL(url)
}
