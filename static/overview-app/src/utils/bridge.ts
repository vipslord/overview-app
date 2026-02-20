import { invoke } from '@forge/bridge';

type ResolverPayload = Record<string, unknown>;

export const invokeResolver = async <TResponse, TPayload extends ResolverPayload | undefined = ResolverPayload | undefined>(
  resolver: string,
  payload?: TPayload
): Promise<TResponse> => {
  return invoke(resolver, payload as ResolverPayload | undefined) as Promise<TResponse>;
};

export const invokeResolverSafe = async <TResponse, TPayload extends ResolverPayload | undefined = ResolverPayload | undefined>(
  resolver: string,
  payload: TPayload,
  fallback: TResponse,
  onError?: (error: unknown) => void
): Promise<TResponse> => {
  try {
    return await invokeResolver<TResponse, TPayload>(resolver, payload);
  } catch (error) {
    if (onError) {
      onError(error);
    }
    return fallback;
  }
};