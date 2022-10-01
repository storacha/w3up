export async function collect<T> (collectable: AsyncIterable<T>|Iterable<T>): Promise<T[]> {
  const chunks: T[] = []
  for await (const chunk of collectable) chunks.push(chunk)
  return chunks
}
