import {
  type RequestOptionsFor,
  orderzillaRequest,
} from "@/lib/api/orderzilla-client";
import type { paths } from "@/types/orderzilla-openapi";

type HttpMethod = "get" | "post" | "put" | "patch" | "delete";
type WithoutPathParams<P extends keyof paths & string, M extends Extract<keyof paths[P], HttpMethod>> = Omit<
  RequestOptionsFor<P, M>,
  "pathParams"
>;

export type OAuthAuthorizeRequest = {
  email: string;
  password: string;
  client_id: string;
  code_challenge: string;
  code_challenge_method: "S256";
  scope?: string;
  redirect_uri?: string;
  state?: string;
};

export type OAuthAuthorizeResponse = {
  code?: string;
  redirect?: string;
};

export type OAuthTokenRequest = {
  grant_type: "authorization_code" | "refresh_token";
  client_id: string;
  code?: string;
  code_verifier?: string;
  refresh_token?: string;
  redirect_uri?: string;
};

export type OAuthTokenResponse = {
  access_token?: string;
  token_type?: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
};

export const orderzillaApi = {
  oauth: {
    authorize: async (options: { body: OAuthAuthorizeRequest }) => {
      const response = await orderzillaRequest({
        path: "/oauth/authorize",
        method: "post",
        body: options.body as never,
      });
      return response as OAuthAuthorizeResponse;
    },
    token: async (options: { body: OAuthTokenRequest }) => {
      const response = await orderzillaRequest({
        path: "/oauth/token",
        method: "post",
        body: options.body as never,
      });
      return response as OAuthTokenResponse;
    },
    me: (options: RequestOptionsFor<"/oauth/me", "get"> = {}) =>
      orderzillaRequest({ path: "/oauth/me", method: "get", ...options }),
  },
  dashboard: {
    kpi: {
      overview: (options: RequestOptionsFor<"/v1/dashboard/kpi/overview", "get"> = {}) =>
        orderzillaRequest({ path: "/v1/dashboard/kpi/overview", method: "get", ...options }),
      byTerminal: (options: RequestOptionsFor<"/v1/dashboard/kpi/by-terminal", "get"> = {}) =>
        orderzillaRequest({ path: "/v1/dashboard/kpi/by-terminal", method: "get", ...options }),
      byDay: (options: RequestOptionsFor<"/v1/dashboard/kpi/by-day", "get"> = {}) =>
        orderzillaRequest({ path: "/v1/dashboard/kpi/by-day", method: "get", ...options }),
      topProducts: (options: RequestOptionsFor<"/v1/dashboard/kpi/top-products", "get"> = {}) =>
        orderzillaRequest({ path: "/v1/dashboard/kpi/top-products", method: "get", ...options }),
      hourly: (options: RequestOptionsFor<"/v1/dashboard/kpi/hourly", "get"> = {}) =>
        orderzillaRequest({ path: "/v1/dashboard/kpi/hourly", method: "get", ...options }),
    },
    orders: {
      list: (options: RequestOptionsFor<"/v1/dashboard/orders", "get"> = {}) =>
        orderzillaRequest({ path: "/v1/dashboard/orders", method: "get", ...options }),
      byId: (
        id: string,
        options: WithoutPathParams<"/v1/dashboard/orders/{id}", "get"> = {},
      ) =>
        orderzillaRequest({
          path: "/v1/dashboard/orders/{id}",
          method: "get",
          pathParams: { id },
          ...options,
        }),
      updateStatus: (
        id: string,
        options: WithoutPathParams<"/v1/dashboard/orders/{id}/status", "put">,
      ) =>
        orderzillaRequest({
          path: "/v1/dashboard/orders/{id}/status",
          method: "put",
          pathParams: { id },
          ...options,
        }),
    },
    categories: {
      list: (options: RequestOptionsFor<"/v1/dashboard/categories", "get"> = {}) =>
        orderzillaRequest({ path: "/v1/dashboard/categories", method: "get", ...options }),
      create: (options: RequestOptionsFor<"/v1/dashboard/categories", "post">) =>
        orderzillaRequest({ path: "/v1/dashboard/categories", method: "post", ...options }),
      byId: (
        id: string,
        options: WithoutPathParams<"/v1/dashboard/categories/{id}", "get"> = {},
      ) =>
        orderzillaRequest({
          path: "/v1/dashboard/categories/{id}",
          method: "get",
          pathParams: { id },
          ...options,
        }),
      update: (
        id: string,
        options: WithoutPathParams<"/v1/dashboard/categories/{id}", "put">,
      ) =>
        orderzillaRequest({
          path: "/v1/dashboard/categories/{id}",
          method: "put",
          pathParams: { id },
          ...options,
        }),
      remove: (
        id: string,
        options: WithoutPathParams<"/v1/dashboard/categories/{id}", "delete"> = {},
      ) =>
        orderzillaRequest({
          path: "/v1/dashboard/categories/{id}",
          method: "delete",
          pathParams: { id },
          ...options,
        }),
      uploadImage: (
        id: string,
        options: WithoutPathParams<"/v1/dashboard/categories/{id}/image", "post">,
      ) =>
        orderzillaRequest({
          path: "/v1/dashboard/categories/{id}/image",
          method: "post",
          pathParams: { id },
          ...options,
        }),
    },
    products: {
      list: (options: RequestOptionsFor<"/v1/dashboard/products", "get"> = {}) =>
        orderzillaRequest({ path: "/v1/dashboard/products", method: "get", ...options }),
      create: (options: RequestOptionsFor<"/v1/dashboard/products", "post">) =>
        orderzillaRequest({ path: "/v1/dashboard/products", method: "post", ...options }),
      byId: (
        id: string,
        options: WithoutPathParams<"/v1/dashboard/products/{id}", "get"> = {},
      ) =>
        orderzillaRequest({
          path: "/v1/dashboard/products/{id}",
          method: "get",
          pathParams: { id },
          ...options,
        }),
      update: (
        id: string,
        options: WithoutPathParams<"/v1/dashboard/products/{id}", "put">,
      ) =>
        orderzillaRequest({
          path: "/v1/dashboard/products/{id}",
          method: "put",
          pathParams: { id },
          ...options,
        }),
      remove: (
        id: string,
        options: WithoutPathParams<"/v1/dashboard/products/{id}", "delete"> = {},
      ) =>
        orderzillaRequest({
          path: "/v1/dashboard/products/{id}",
          method: "delete",
          pathParams: { id },
          ...options,
        }),
      uploadImage: (
        id: string,
        options: WithoutPathParams<"/v1/dashboard/products/{id}/image", "post">,
      ) =>
        orderzillaRequest({
          path: "/v1/dashboard/products/{id}/image",
          method: "post",
          pathParams: { id },
          ...options,
        }),
      prices: {
        list: (
          id: string,
          options: WithoutPathParams<"/v1/dashboard/products/{id}/prices", "get"> = {},
        ) =>
          orderzillaRequest({
            path: "/v1/dashboard/products/{id}/prices",
            method: "get",
            pathParams: { id },
            ...options,
          }),
        upsert: (
          id: string,
          options: WithoutPathParams<"/v1/dashboard/products/{id}/prices", "put">,
        ) =>
          orderzillaRequest({
            path: "/v1/dashboard/products/{id}/prices",
            method: "put",
            pathParams: { id },
            ...options,
          }),
        remove: (
          id: string,
          priceId: string,
          options: WithoutPathParams<"/v1/dashboard/products/{id}/prices/{priceId}", "delete"> = {},
        ) =>
          orderzillaRequest({
            path: "/v1/dashboard/products/{id}/prices/{priceId}",
            method: "delete",
            pathParams: { id, priceId },
            ...options,
          }),
      },
      extras: {
        list: (
          id: string,
          options: WithoutPathParams<"/v1/dashboard/products/{id}/extras", "get"> = {},
        ) =>
          orderzillaRequest({
            path: "/v1/dashboard/products/{id}/extras",
            method: "get",
            pathParams: { id },
            ...options,
          }),
        attach: (
          id: string,
          options: WithoutPathParams<"/v1/dashboard/products/{id}/extras", "post">,
        ) =>
          orderzillaRequest({
            path: "/v1/dashboard/products/{id}/extras",
            method: "post",
            pathParams: { id },
            ...options,
          }),
        detach: (
          id: string,
          groupId: string,
          options: WithoutPathParams<"/v1/dashboard/products/{id}/extras/{groupId}", "delete"> = {},
        ) =>
          orderzillaRequest({
            path: "/v1/dashboard/products/{id}/extras/{groupId}",
            method: "delete",
            pathParams: { id, groupId },
            ...options,
          }),
      },
    },
    extras: {
      list: (options: RequestOptionsFor<"/v1/dashboard/extras", "get"> = {}) =>
        orderzillaRequest({ path: "/v1/dashboard/extras", method: "get", ...options }),
      create: (options: RequestOptionsFor<"/v1/dashboard/extras", "post">) =>
        orderzillaRequest({ path: "/v1/dashboard/extras", method: "post", ...options }),
      byId: (
        id: string,
        options: WithoutPathParams<"/v1/dashboard/extras/{id}", "get"> = {},
      ) =>
        orderzillaRequest({
          path: "/v1/dashboard/extras/{id}",
          method: "get",
          pathParams: { id },
          ...options,
        }),
      update: (
        id: string,
        options: WithoutPathParams<"/v1/dashboard/extras/{id}", "put">,
      ) =>
        orderzillaRequest({
          path: "/v1/dashboard/extras/{id}",
          method: "put",
          pathParams: { id },
          ...options,
        }),
      remove: (
        id: string,
        options: WithoutPathParams<"/v1/dashboard/extras/{id}", "delete"> = {},
      ) =>
        orderzillaRequest({
          path: "/v1/dashboard/extras/{id}",
          method: "delete",
          pathParams: { id },
          ...options,
        }),
      options: {
        list: (
          id: string,
          options: WithoutPathParams<"/v1/dashboard/extras/{id}/options", "get"> = {},
        ) =>
          orderzillaRequest({
            path: "/v1/dashboard/extras/{id}/options",
            method: "get",
            pathParams: { id },
            ...options,
          }),
        create: (
          id: string,
          options: WithoutPathParams<"/v1/dashboard/extras/{id}/options", "post">,
        ) =>
          orderzillaRequest({
            path: "/v1/dashboard/extras/{id}/options",
            method: "post",
            pathParams: { id },
            ...options,
          }),
        update: (
          id: string,
          optId: string,
          options: WithoutPathParams<"/v1/dashboard/extras/{id}/options/{optId}", "put">,
        ) =>
          orderzillaRequest({
            path: "/v1/dashboard/extras/{id}/options/{optId}",
            method: "put",
            pathParams: { id, optId },
            ...options,
          }),
        remove: (
          id: string,
          optId: string,
          options: WithoutPathParams<"/v1/dashboard/extras/{id}/options/{optId}", "delete"> = {},
        ) =>
          orderzillaRequest({
            path: "/v1/dashboard/extras/{id}/options/{optId}",
            method: "delete",
            pathParams: { id, optId },
            ...options,
          }),
      },
    },
    locations: {
      list: (options: RequestOptionsFor<"/v1/dashboard/locations", "get"> = {}) =>
        orderzillaRequest({ path: "/v1/dashboard/locations", method: "get", ...options }),
      create: (options: RequestOptionsFor<"/v1/dashboard/locations", "post">) =>
        orderzillaRequest({ path: "/v1/dashboard/locations", method: "post", ...options }),
      byId: (
        id: string,
        options: WithoutPathParams<"/v1/dashboard/locations/{id}", "get"> = {},
      ) =>
        orderzillaRequest({
          path: "/v1/dashboard/locations/{id}",
          method: "get",
          pathParams: { id },
          ...options,
        }),
      update: (
        id: string,
        options: WithoutPathParams<"/v1/dashboard/locations/{id}", "put">,
      ) =>
        orderzillaRequest({
          path: "/v1/dashboard/locations/{id}",
          method: "put",
          pathParams: { id },
          ...options,
        }),
      remove: (
        id: string,
        options: WithoutPathParams<"/v1/dashboard/locations/{id}", "delete"> = {},
      ) =>
        orderzillaRequest({
          path: "/v1/dashboard/locations/{id}",
          method: "delete",
          pathParams: { id },
          ...options,
        }),
    },
    terminals: {
      list: (options: RequestOptionsFor<"/v1/dashboard/terminals", "get"> = {}) =>
        orderzillaRequest({ path: "/v1/dashboard/terminals", method: "get", ...options }),
      create: (options: RequestOptionsFor<"/v1/dashboard/terminals", "post">) =>
        orderzillaRequest({ path: "/v1/dashboard/terminals", method: "post", ...options }),
      byId: (
        id: string,
        options: WithoutPathParams<"/v1/dashboard/terminals/{id}", "get"> = {},
      ) =>
        orderzillaRequest({
          path: "/v1/dashboard/terminals/{id}",
          method: "get",
          pathParams: { id },
          ...options,
        }),
      update: (
        id: string,
        options: WithoutPathParams<"/v1/dashboard/terminals/{id}", "put">,
      ) =>
        orderzillaRequest({
          path: "/v1/dashboard/terminals/{id}",
          method: "put",
          pathParams: { id },
          ...options,
        }),
      remove: (
        id: string,
        options: WithoutPathParams<"/v1/dashboard/terminals/{id}", "delete"> = {},
      ) =>
        orderzillaRequest({
          path: "/v1/dashboard/terminals/{id}",
          method: "delete",
          pathParams: { id },
          ...options,
        }),
      products: {
        list: (
          id: string,
          options: WithoutPathParams<"/v1/dashboard/terminals/{id}/products", "get"> = {},
        ) =>
          orderzillaRequest({
            path: "/v1/dashboard/terminals/{id}/products",
            method: "get",
            pathParams: { id },
            ...options,
          }),
        assign: (
          id: string,
          options: WithoutPathParams<"/v1/dashboard/terminals/{id}/products", "put">,
        ) =>
          orderzillaRequest({
            path: "/v1/dashboard/terminals/{id}/products",
            method: "put",
            pathParams: { id },
            ...options,
          }),
      },
      commands: {
        create: (
          id: string,
          options: WithoutPathParams<"/v1/dashboard/terminals/{id}/commands", "post">,
        ) =>
          orderzillaRequest({
            path: "/v1/dashboard/terminals/{id}/commands",
            method: "post",
            pathParams: { id },
            ...options,
          }),
      },
    },
    loyalty: {
      program: {
        get: (options: RequestOptionsFor<"/v1/dashboard/loyalty/program", "get"> = {}) =>
          orderzillaRequest({ path: "/v1/dashboard/loyalty/program", method: "get", ...options }),
        update: (options: RequestOptionsFor<"/v1/dashboard/loyalty/program", "put">) =>
          orderzillaRequest({ path: "/v1/dashboard/loyalty/program", method: "put", ...options }),
      },
      customers: {
        list: (options: RequestOptionsFor<"/v1/dashboard/loyalty/customers", "get"> = {}) =>
          orderzillaRequest({
            path: "/v1/dashboard/loyalty/customers",
            method: "get",
            ...options,
          }),
        create: (options: RequestOptionsFor<"/v1/dashboard/loyalty/customers", "post">) =>
          orderzillaRequest({
            path: "/v1/dashboard/loyalty/customers",
            method: "post",
            ...options,
          }),
        byId: (
          id: string,
          options: WithoutPathParams<"/v1/dashboard/loyalty/customers/{id}", "get"> = {},
        ) =>
          orderzillaRequest({
            path: "/v1/dashboard/loyalty/customers/{id}",
            method: "get",
            pathParams: { id },
            ...options,
          }),
        update: (
          id: string,
          options: WithoutPathParams<"/v1/dashboard/loyalty/customers/{id}", "put">,
        ) =>
          orderzillaRequest({
            path: "/v1/dashboard/loyalty/customers/{id}",
            method: "put",
            pathParams: { id },
            ...options,
          }),
        transactions: (
          id: string,
          options: WithoutPathParams<"/v1/dashboard/loyalty/customers/{id}/transactions", "get"> = {},
        ) =>
          orderzillaRequest({
            path: "/v1/dashboard/loyalty/customers/{id}/transactions",
            method: "get",
            pathParams: { id },
            ...options,
          }),
        adjust: (
          id: string,
          options: WithoutPathParams<"/v1/dashboard/loyalty/customers/{id}/adjust", "post">,
        ) =>
          orderzillaRequest({
            path: "/v1/dashboard/loyalty/customers/{id}/adjust",
            method: "post",
            pathParams: { id },
            ...options,
          }),
      },
    },
    users: {
      list: (options: RequestOptionsFor<"/v1/dashboard/users", "get"> = {}) =>
        orderzillaRequest({ path: "/v1/dashboard/users", method: "get", ...options }),
      create: (options: RequestOptionsFor<"/v1/dashboard/users", "post">) =>
        orderzillaRequest({ path: "/v1/dashboard/users", method: "post", ...options }),
      byId: (
        id: string,
        options: WithoutPathParams<"/v1/dashboard/users/{id}", "get"> = {},
      ) =>
        orderzillaRequest({
          path: "/v1/dashboard/users/{id}",
          method: "get",
          pathParams: { id },
          ...options,
        }),
      update: (id: string, options: WithoutPathParams<"/v1/dashboard/users/{id}", "put">) =>
        orderzillaRequest({
          path: "/v1/dashboard/users/{id}",
          method: "put",
          pathParams: { id },
          ...options,
        }),
      remove: (
        id: string,
        options: WithoutPathParams<"/v1/dashboard/users/{id}", "delete"> = {},
      ) =>
        orderzillaRequest({
          path: "/v1/dashboard/users/{id}",
          method: "delete",
          pathParams: { id },
          ...options,
        }),
      resetPassword: (
        id: string,
        options: WithoutPathParams<"/v1/dashboard/users/{id}/reset-password", "post">,
      ) =>
        orderzillaRequest({
          path: "/v1/dashboard/users/{id}/reset-password",
          method: "post",
          pathParams: { id },
          ...options,
        }),
    },
  },
};

