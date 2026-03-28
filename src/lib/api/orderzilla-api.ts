import {
  type RequestOptionsFor,
  orderzillaRequest,
} from "@/lib/api/orderzilla-client";
import type { paths } from "@/types/orderzilla-openapi";
import { axiosInstance } from "@/utils/axios";

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

export type DashboardSettingsAddress = {
  street?: string;
  zip?: string;
  city?: string;
  country?: string;
};

export type DashboardSettings = {
  company_name?: string;
  logo_url?: string | null;
  primary_brand_color?: string;
  receipt_footer_text?: string;
  address?: DashboardSettingsAddress;
  default_vat_rate?: number;
  currency?: string;
  prices_include_vat?: boolean;
  enable_cash?: boolean;
  enable_card?: boolean;
  enable_mobile_pay?: boolean;
  enable_gift_cards?: boolean;
  default_payment_method?: string;
  enable_loyalty_program?: boolean;
  /** Rounding step label, e.g. "0.05", "0.10", "0.01" */
  price_rounding_step?: string;
  /** Display: "comma" | "dot" */
  decimal_separator?: string;
  print_receipt_automatically?: boolean;
  email_receipt_enabled?: boolean;
  /** Terminal or printer id for kitchen routing */
  kitchen_printer_terminal_id?: string;
  idle_screen_timeout_seconds?: number;
  auto_refresh_menu_enabled?: boolean;
  maintenance_mode?: boolean;
  terminal_auto_close_seconds?: number;
  order_timeout_seconds?: number;
  allow_price_override?: boolean;
  enable_debug_logs?: boolean;
};

export type DashboardSettingsInput = {
  company_name?: string;
  logo_url?: string | null;
  primary_brand_color?: string;
  receipt_footer_text?: string;
  address?: DashboardSettingsAddress;
  default_vat_rate?: number;
  currency?: string;
  prices_include_vat?: boolean;
  enable_cash?: boolean;
  enable_card?: boolean;
  enable_mobile_pay?: boolean;
  enable_gift_cards?: boolean;
  default_payment_method?: string;
  enable_loyalty_program?: boolean;
  price_rounding_step?: string;
  decimal_separator?: string;
  print_receipt_automatically?: boolean;
  email_receipt_enabled?: boolean;
  kitchen_printer_terminal_id?: string;
  idle_screen_timeout_seconds?: number;
  auto_refresh_menu_enabled?: boolean;
  maintenance_mode?: boolean;
  terminal_auto_close_seconds?: number;
  order_timeout_seconds?: number;
  allow_price_override?: boolean;
  enable_debug_logs?: boolean;
};

export type ExportLogsInput = {
  format?: "CSV" | "JSON";
  date_from?: string;
  date_to?: string;
  filters?: { level?: string };
};

export type BackupInput = {
  backup_format?: "SQL" | "JSON";
  destination?: "LOCAL" | "CLOUD";
};

export type UserCreateInput = {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  role: "ADMIN" | "MANAGER" | "VIEWER";
  phone?: string;
  location_ids?: string[];
  can_manage_products?: boolean;
  can_manage_loyalty?: boolean;
  is_active?: boolean;
  avatar_url?: string;
  require_password_reset?: boolean;
};

export type UserUpdateInput = {
  first_name?: string;
  last_name?: string;
  phone?: string;
  location_ids?: string[];
  can_manage_products?: boolean;
  can_manage_loyalty?: boolean;
  is_active?: boolean;
  role?: "ADMIN" | "MANAGER" | "VIEWER";
  avatar_url?: string;
  require_password_reset?: boolean;
};

export type UserRecord = {
  id?: string;
  name?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  role?: string;
  is_active?: boolean;
  require_password_reset?: boolean;
  created_at?: string;
  location_ids?: string[];
  location_names?: string[];
  can_manage_products?: boolean;
  can_manage_loyalty?: boolean;
  avatar_url?: string | null;
};

export type UserListResponse = {
  users?: UserRecord[];
  pagination?: {
    current_page?: number;
    total_pages?: number;
    total_items?: number;
    items_per_page?: number;
  };
};

export type OrderCreateItemInput = {
  product_id: string;
  quantity: number;
  extras?: Array<{ extra_id?: string; option_id?: string }>;
};

export type OrderCreateInput = {
  terminal_id: string;
  location_id: string;
  mode?: "INDOOR" | "TAKEAWAY";
  table_number?: string;
  payment_method?: string;
  staff_override?: string;
  items: OrderCreateItemInput[];
};

export type OrderListQuery = {
  search?: string;
  page?: number;
  limit?: number;
  status?: string;
  mode?: string;
  location_id?: string;
  terminal_id?: string;
  date_from?: string;
  date_to?: string;
};

/** Optional aggregate counts returned by GET /v1/dashboard/orders (see Postman). Keys may be upper or lower case. */
export type OrderListStatusCounts = Partial<
  Record<
    | "PENDING"
    | "CONFIRMED"
    | "PREPARING"
    | "READY"
    | "COMPLETED"
    | "CANCELLED"
    | "pending"
    | "confirmed"
    | "preparing"
    | "ready"
    | "completed"
    | "cancelled"
    | "all"
    | "total",
    number
  >
>;

export type OrderListResponse = {
  orders?: unknown[];
  pagination?: {
    current_page?: number;
    total_pages?: number;
    total_items?: number;
    items_per_page?: number;
  };
  status_counts?: OrderListStatusCounts;
};

export type TerminalDisplayContent = {
  idle_screen?: {
    image_url?: string | null;
    animation_enabled?: boolean;
    timeout_seconds?: number;
  };
  show_featured_products?: boolean;
  featured_categories?: string[];
  featured_products?: string[];
  content_items?: unknown[];
  multi_language_enabled?: boolean;
  language?: string;
  available_languages?: string[];
  theme?: string;
  accent_color?: string;
};

export type TerminalFunctions = {
  order?: {
    enable_dine_in?: boolean;
    enable_takeaway?: boolean;
    enable_delivery?: boolean;
    allow_order_modification?: boolean;
    order_timeout_seconds?: number;
  };
  payment?: {
    enable_cash?: boolean;
    enable_card?: boolean;
    enable_mobile_pay?: boolean;
    enable_gift_cards?: boolean;
    default_payment_method?: string;
    auto_close_order_after_payment?: boolean;
  };
  loyalty?: {
    enable_loyalty_login?: boolean;
    allow_qr_code_scan?: boolean;
    require_customer_email?: boolean;
    allow_guest_checkout?: boolean;
  };
  discounts?: {
    allow_manual_discount?: boolean;
    allow_staff_override?: boolean;
    max_discount_percent?: number;
    require_manager_pin?: boolean;
  };
  maintenance?: {
    enable_maintenance_mode_access?: boolean;
    show_debug_info?: boolean;
    age_verification?: boolean;
    auto_logout_seconds?: number;
  };
};

export type TerminalLogEntry = {
  id?: string;
  timestamp?: string;
  level?: string;
  event_type?: string;
  message?: string;
  source?: string;
  detailed_message?: string;
  response_json?: string;
  stack_trace?: string;
  device_metadata?: { os?: string; app?: string; network?: string };
};

export type TerminalLogsListResponse = {
  logs?: TerminalLogEntry[];
  pagination?: { current_page?: number; total_pages?: number; total_items?: number; items_per_page?: number };
};

export type LoyaltyTierInput = {
  name: string;
  points_threshold: number;
  discount_percent?: number;
  badge_color?: string;
};

export type LoyaltyNotificationsInput = {
  points_added?: boolean;
  points_redeemed?: boolean;
  tier_upgrade?: boolean;
};

export type LoyaltyProgramUpdateInput = {
  name?: string;
  points_per_chf?: number;
  chf_per_point?: number;
  min_redeem_points?: number;
  max_redeem_percent?: number;
  expiry_days?: number;
  is_active?: boolean;
  tiers?: LoyaltyTierInput[];
  notifications?: LoyaltyNotificationsInput;
};

export type ProductCreateInput = {
  name: string;
  internal_name?: string;
  description?: string;
  category_id?: string;
  sku?: string;
  tax_rate?: number;
  sort_order?: number;
  visible_in_pos?: boolean;
  featured?: boolean;
  color_tag?: string;
  product_type?: "standard" | "variant" | "combo";
  prices?: Array<{
    mode?: "INDOOR" | "TAKEAWAY" | "BOTH";
    price: number | string;
    currency?: string;
    location_id?: string | null;
    terminal_id?: string | null;
    valid_from?: string | null;
    valid_until?: string | null;
  }>;
};

export type ProductUpdateInput = {
  name?: string;
  internal_name?: string;
  description?: string;
  category_id?: string;
  sku?: string;
  tax_rate?: number;
  sort_order?: number;
  visible_in_pos?: boolean;
  featured?: boolean;
  color_tag?: string;
  product_type?: "standard" | "variant" | "combo";
  is_active?: boolean;
  translations?: Record<string, { name?: string; description?: string }>;
};

export type ProductVariantCreateInput = {
  name: string;
  sku?: string;
  price: number | string;
  is_default?: boolean;
  sort_order?: number;
};

export type ProductAvailabilityInput = {
  availability?: "always" | "scheduled";
  availability_days?: number[];
  availability_start?: string;
  availability_end?: string;
  location_ids?: string[];
};

export type ProductAdvancedInput = {
  barcode?: string | null;
  allergens?: string[];
  nutritional?: { calories?: number; protein?: number; fat?: number; carbs?: number };
  tax_overrides?: unknown[];
};

export type TerminalLogsExportInput = {
  format?: "CSV" | "JSON";
  date_range?: { from?: string; to?: string };
  filters?: { log_level?: string };
};

export type CategoryCreateInput = {
  name: string;
  slug?: string;
  sort_order?: number;
  translations?: Record<string, { name?: string; description?: string }>;
  show_in_pos?: boolean;
  show_in_kiosk?: boolean;
  highlighted?: boolean;
  availability?: "always" | "scheduled";
  availability_days?: number[];
  availability_start?: string;
  availability_end?: string;
  location_ids?: string[];
  meta_title?: string;
  meta_description?: string;
};

export type LocationCreateInput = {
  name: string;
  address?: string;
  zip?: string;
  city?: string;
  country?: string;
  timezone?: string;
};

export type LocationUpdateInput = {
  name?: string;
  address?: string;
  zip?: string;
  city?: string;
  country?: string;
  timezone?: string;
  is_active?: boolean;
};

export type LocationListQuery = {
  page?: number;
  limit?: number;
};

export type CategoryUpdateInput = {
  name?: string;
  slug?: string;
  sort_order?: number;
  is_active?: boolean;
  translations?: Record<string, { name?: string; description?: string }>;
  show_in_pos?: boolean;
  show_in_kiosk?: boolean;
  highlighted?: boolean;
  availability?: "always" | "scheduled";
  availability_days?: number[];
  availability_start?: string;
  availability_end?: string;
  location_ids?: string[];
  meta_title?: string;
  meta_description?: string;
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
    settings: {
      get: async () => {
        const res = await axiosInstance.get<DashboardSettings>("/v1/dashboard/settings");
        return res.data;
      },
      update: async (body: DashboardSettingsInput) => {
        const res = await axiosInstance.put<DashboardSettings>("/v1/dashboard/settings", body);
        return res.data;
      },
      reset: async () => {
        const res = await axiosInstance.post<DashboardSettings>("/v1/dashboard/settings/reset");
        return res.data;
      },
      exportLogs: async (body: ExportLogsInput) => {
        const res = await axiosInstance.post<{ download_url?: string; message?: string }>(
          "/v1/dashboard/settings/export-logs",
          body,
          { responseType: "json" },
        );
        return res.data;
      },
      backup: async (body: BackupInput) => {
        const res = await axiosInstance.post<{ download_url?: string; message?: string }>(
          "/v1/dashboard/settings/backup",
          body,
          { responseType: "json" },
        );
        return res.data;
      },
    },
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
      list: (options?: { query?: OrderListQuery }) => {
        const query = options?.query ?? {};
        const params = new URLSearchParams();
        Object.entries(query).forEach(([key, value]) => {
          if (value !== undefined && value !== "" && value !== null) {
            params.set(key, String(value));
          }
        });
        const qs = params.toString();
        return axiosInstance
          .get<OrderListResponse>(`/v1/dashboard/orders${qs ? `?${qs}` : ""}`)
          .then((r) => r.data);
      },
      create: (options: { body: OrderCreateInput }) =>
        axiosInstance
          .post<{ id?: string; order_number?: string; status?: string }>(
            "/v1/dashboard/orders",
            options.body,
          )
          .then((r) => r.data),
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
      remove: (id: string) =>
        axiosInstance.delete<{ ok?: boolean }>(`/v1/dashboard/orders/${id}`).then((r) => r.data),
    },
    categories: {
      list: (options: RequestOptionsFor<"/v1/dashboard/categories", "get"> = {}) =>
        orderzillaRequest({ path: "/v1/dashboard/categories", method: "get", ...options }),
      create: (options: { body: CategoryCreateInput }) =>
        axiosInstance
          .post<{ id?: string; name?: string; slug?: string; sort_order?: number }>(
            "/v1/dashboard/categories",
            options.body,
          )
          .then((r) => r.data),
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
      update: (id: string, options: { body: CategoryUpdateInput }) =>
        axiosInstance
          .put<{ id?: string; name?: string; slug?: string; sort_order?: number }>(
            `/v1/dashboard/categories/${id}`,
            options.body,
          )
          .then((r) => r.data),
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
      create: (options: { body: ProductCreateInput }) =>
        axiosInstance
          .post<{ id?: string; name?: string }>("/v1/dashboard/products", options.body)
          .then((r) => r.data),
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
      update: (id: string, options: { body: ProductUpdateInput }) =>
        axiosInstance
          .put<{ id?: string; name?: string }>(`/v1/dashboard/products/${id}`, options.body)
          .then((r) => r.data),
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
      variants: {
        list: (id: string) =>
          axiosInstance
            .get<{ variants?: Array<{ id?: string; name?: string; sku?: string; price?: number | string; is_default?: boolean; sort_order?: number }> }>(
              `/v1/dashboard/products/${id}/variants`,
            )
            .then((r) => r.data),
        create: (id: string, options: { body: ProductVariantCreateInput }) =>
          axiosInstance
            .post<{ id?: string; name?: string }>(`/v1/dashboard/products/${id}/variants`, options.body)
            .then((r) => r.data),
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
      availability: {
        get: (id: string) =>
          axiosInstance
            .get<{
              availability?: string;
              availability_days?: (string | number)[];
              availability_start?: string | null;
              availability_end?: string | null;
              location_ids?: string[];
            }>(`/v1/dashboard/products/${id}/availability`)
            .then((r) => r.data),
        update: (id: string, body: ProductAvailabilityInput) =>
          axiosInstance
            .put(`/v1/dashboard/products/${id}/availability`, body)
            .then((r) => r.data),
      },
      advanced: {
        get: (id: string) =>
          axiosInstance
            .get<{
              barcode?: string | null;
              allergens?: string[];
              nutritional?: { calories?: number; protein?: number; fat?: number; carbs?: number };
              tax_overrides?: unknown[];
            }>(`/v1/dashboard/products/${id}/advanced`)
            .then((r) => r.data),
        update: (id: string, body: ProductAdvancedInput) =>
          axiosInstance
            .put(`/v1/dashboard/products/${id}/advanced`, body)
            .then((r) => r.data),
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
      list: (options?: { query?: LocationListQuery }) => {
        const query = options?.query ?? {};
        const params = new URLSearchParams();
        if (query.page != null) params.set("page", String(query.page));
        if (query.limit != null) params.set("limit", String(query.limit));
        const qs = params.toString();
        return axiosInstance
          .get<{ locations?: unknown[]; pagination?: { current_page?: number; total_pages?: number; total_items?: number; items_per_page?: number } }>(
            `/v1/dashboard/locations${qs ? `?${qs}` : ""}`,
          )
          .then((r) => r.data);
      },
      create: (options: { body: LocationCreateInput }) =>
        axiosInstance
          .post<{ id?: string; name?: string }>("/v1/dashboard/locations", options.body)
          .then((r) => r.data),
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
      update: (id: string, options: { body: LocationUpdateInput }) =>
        axiosInstance
          .put<{ id?: string; name?: string }>(`/v1/dashboard/locations/${id}`, options.body)
          .then((r) => r.data),
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
      displayContent: {
        get: (id: string) =>
          axiosInstance
            .get<TerminalDisplayContent>(`/v1/dashboard/terminals/${id}/display-content`)
            .then((r) => r.data),
        update: (id: string, options: { body: TerminalDisplayContent }) =>
          axiosInstance
            .put<TerminalDisplayContent>(`/v1/dashboard/terminals/${id}/display-content`, options.body)
            .then((r) => r.data),
      },
      functions: {
        get: (id: string) =>
          axiosInstance
            .get<TerminalFunctions>(`/v1/dashboard/terminals/${id}/functions`)
            .then((r) => r.data),
        update: (id: string, options: { body: TerminalFunctions }) =>
          axiosInstance
            .put<TerminalFunctions>(`/v1/dashboard/terminals/${id}/functions`, options.body)
            .then((r) => r.data),
      },
      logs: {
        list: (id: string, options?: { query?: { page?: number; limit?: number; log_level?: string; date_from?: string } }) => {
          const query = options?.query ?? {};
          const params = new URLSearchParams();
          Object.entries(query).forEach(([k, v]) => {
            if (v !== undefined && v !== "" && v !== null) params.set(k, String(v));
          });
          const qs = params.toString();
          return axiosInstance
            .get<TerminalLogsListResponse>(`/v1/dashboard/terminals/${id}/logs${qs ? `?${qs}` : ""}`)
            .then((r) => r.data);
        },
        export: (id: string, options?: { body?: TerminalLogsExportInput }) =>
          axiosInstance
            .post<Blob>(`/v1/dashboard/terminals/${id}/logs/export`, options?.body ?? {}, {
              responseType: "blob",
            })
            .then((r) => r.data),
        delete: (id: string) =>
          axiosInstance.delete(`/v1/dashboard/terminals/${id}/logs`).then((r) => r.data),
      },
    },
    loyalty: {
      program: {
        get: (options: RequestOptionsFor<"/v1/dashboard/loyalty/program", "get"> = {}) =>
          orderzillaRequest({ path: "/v1/dashboard/loyalty/program", method: "get", ...options }),
        update: (options: { body: LoyaltyProgramUpdateInput }) =>
          axiosInstance
            .put("/v1/dashboard/loyalty/program", options.body)
            .then((r) => r.data),
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
        remove: (id: string) =>
          axiosInstance.delete(`/v1/dashboard/loyalty/customers/${id}`).then((r) => r.data),
      },
    },
    users: {
      list: (options?: { query?: { page?: number; limit?: number } }) => {
        const query = options?.query ?? {};
        const params = new URLSearchParams();
        if (query.page != null) params.set("page", String(query.page));
        if (query.limit != null) params.set("limit", String(query.limit));
        const qs = params.toString();
        return axiosInstance
          .get<UserListResponse>(`/v1/dashboard/users${qs ? `?${qs}` : ""}`)
          .then((r) => r.data);
      },
      create: (options: { body: UserCreateInput }) =>
        axiosInstance
          .post<UserRecord>("/v1/dashboard/users", options.body)
          .then((r) => r.data),
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
      update: (id: string, options: { body: UserUpdateInput }) =>
        axiosInstance
          .put<UserRecord>(`/v1/dashboard/users/${id}`, options.body)
          .then((r) => r.data),
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
      sendPasswordReset: (id: string) =>
        axiosInstance.post<unknown>(`/v1/dashboard/users/${id}/send-password-reset`).then((r) => r.data),
    },
  },
};

