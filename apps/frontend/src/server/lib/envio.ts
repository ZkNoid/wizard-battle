import { TRPCError } from '@trpc/server';
import { env } from '@/env';

export async function envioQuery<T>(
  query: string,
  variables?: Record<string, unknown>
): Promise<T> {
  const response = await fetch(env.ENVIO_GRAPHQL_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: `Envio GraphQL request failed: ${response.status} ${response.statusText}`,
    });
  }

  const json = (await response.json()) as {
    data?: T;
    errors?: { message: string }[];
  };

  if (json.errors?.length) {
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: `Envio GraphQL error: ${json.errors.map((e) => e.message).join(', ')}`,
    });
  }

  if (!json.data) {
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Envio returned no data',
    });
  }

  return json.data;
}
