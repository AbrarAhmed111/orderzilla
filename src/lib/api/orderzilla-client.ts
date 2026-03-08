import type { AxiosRequestConfig, RawAxiosRequestHeaders } from "axios";
import { axiosInstance } from "@/utils/axios";
import type { paths } from "@/types/orderzilla-openapi";

type HttpMethod = "get" | "post" | "put" | "patch" | "delete";
type ApiPath = keyof paths & string;
type MethodForPath<P extends ApiPath> = Extract<keyof paths[P], HttpMethod>;
type Operation<P extends ApiPath, M extends MethodForPath<P>> = paths[P][M];

type PathParams<Op> = Op extends { parameters: { path?: infer P } } ? P : never;
type QueryParams<Op> = Op extends { parameters: { query?: infer Q } } ? Q : never;
type HeaderParams<Op> = Op extends { parameters: { header?: infer H } } ? H : never;
type BodyContent<Op> = Op extends { requestBody?: { content: infer C } }
  ? C extends { "application/json": infer J }
    ? J
    : C[keyof C]
  : never;

type ExtractResponseContent<Resp> = Resp extends { content: infer C }
  ? C extends { "application/json": infer J }
    ? J
    : C[keyof C]
  : unknown;

type SuccessResponse<Op> = Op extends { responses: infer R }
  ? 200 extends keyof R
    ? ExtractResponseContent<R[200]>
    : 201 extends keyof R
      ? ExtractResponseContent<R[201]>
      : 202 extends keyof R
        ? ExtractResponseContent<R[202]>
        : 204 extends keyof R
          ? ExtractResponseContent<R[204]>
          : unknown
  : unknown;

export type OrderzillaRequestOptions<P extends ApiPath, M extends MethodForPath<P>> = {
  path: P;
  method: M;
  pathParams?: PathParams<Operation<P, M>>;
  query?: QueryParams<Operation<P, M>>;
  body?: BodyContent<Operation<P, M>>;
  headers?: HeaderParams<Operation<P, M>> & RawAxiosRequestHeaders;
  config?: Omit<AxiosRequestConfig, "url" | "method" | "params" | "data" | "headers">;
};

export type RequestOptionsFor<P extends ApiPath, M extends MethodForPath<P>> = Omit<
  OrderzillaRequestOptions<P, M>,
  "path" | "method"
>;

function compilePath(path: string, pathParams?: Record<string, string | number | boolean>) {
  if (!pathParams) return path;

  return path.replace(/\{([^}]+)\}/g, (_, key: string) => {
    const rawValue = pathParams[key];
    if (rawValue === undefined || rawValue === null) {
      throw new Error(`Missing required path parameter: ${key}`);
    }
    return encodeURIComponent(String(rawValue));
  });
}

export async function orderzillaRequest<P extends ApiPath, M extends MethodForPath<P>>(
  options: OrderzillaRequestOptions<P, M>,
) {
  const { path, method, pathParams, query, body, headers, config } = options;
  const compiledPath = compilePath(path, pathParams as Record<string, string | number | boolean>);

  const response = await axiosInstance.request<SuccessResponse<Operation<P, M>>>({
    url: compiledPath,
    method,
    params: query,
    data: body,
    headers,
    ...config,
  });

  return response.data;
}

