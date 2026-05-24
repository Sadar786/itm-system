export const parseFilename = (contentDisposition, fallback) => {
  if (!contentDisposition) return fallback

  const utfName = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i)
  if (utfName?.[1]) {
    return decodeURIComponent(utfName[1])
  }

  const plainName = contentDisposition.match(/filename="?([^"]+)"?/i)
  return plainName?.[1] || fallback
}

export const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
