import { createClient } from '@supabase/supabase-js'
import { Readable } from 'stream'

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export const BUCKETS = { PROOFS: 'proofs', COMPANIES: 'companies', ADS: 'ads' } as const

export async function uploadFile({ bucket, path, buffer, mimetype }: { bucket: string; path: string; buffer: Buffer; mimetype: string }): Promise<string> {
  const { error } = await supabase.storage.from(bucket).upload(path, buffer, { contentType: mimetype, upsert: false })
  if (error) throw new Error(`Storage upload error: ${error.message}`)

  if (bucket !== BUCKETS.PROOFS) {
    const { data } = supabase.storage.from(bucket).getPublicUrl(path)
    return data.publicUrl
  }

  const { data, error: signError } = await supabase.storage.from(bucket).createSignedUrl(path, 60 * 60 * 24 * 365)
  if (signError || !data) throw new Error(`Signed URL error: ${signError?.message}`)
  return data.signedUrl
}

export async function deleteFile(bucket: string, path: string): Promise<void> {
  const { error } = await supabase.storage.from(bucket).remove([path])
  if (error) throw new Error(`Storage delete error: ${error.message}`)
}

export async function getSignedUrl(bucket: string, path: string, expiresInSeconds = 3600): Promise<string> {
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresInSeconds)
  if (error || !data) throw new Error(`Signed URL error: ${error?.message}`)
  return data.signedUrl
}

export async function streamToBuffer(stream: Readable): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    stream.on('data', chunk => chunks.push(Buffer.from(chunk)))
    stream.on('end', () => resolve(Buffer.concat(chunks)))
    stream.on('error', reject)
  })
}
