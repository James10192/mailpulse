export async function processBoundedCallbackBatch<T, TResult>(
  deliveries: readonly T[],
  input: {
    deadline: number;
    concurrency: number;
    run: (delivery: T) => Promise<TResult>;
    now?: () => number;
  },
) {
  const now = input.now ?? Date.now;
  const results: TResult[] = [];
  let nextIndex = 0;
  const worker = async () => {
    while (now() < input.deadline) {
      const index = nextIndex++;
      if (index >= deliveries.length) return;
      results.push(await input.run(deliveries[index]!));
    }
  };

  await Promise.all(Array.from({ length: Math.min(Math.max(input.concurrency, 1), deliveries.length) }, worker));
  return results;
}
