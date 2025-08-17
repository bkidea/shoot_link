export function generateSlug(length: number = 6): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  
  return result
}

export function generateUniqueSlug(length: number = 6): string {
  // 현재 시간을 기반으로 한 고유한 slug 생성
  const timestamp = Date.now().toString(36)
  const random = generateSlug(length - timestamp.length)
  return timestamp + random
}
