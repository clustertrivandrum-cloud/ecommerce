-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.app_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  store_name text DEFAULT 'Cluster ERP'::text,
  store_email text,
  store_phone text,
  store_address text,
  store_currency text DEFAULT 'INR'::text,
  tax_rate numeric DEFAULT 18.00,
  gstin text,
  free_shipping_threshold numeric DEFAULT 799,
  kerala_shipping_charge numeric DEFAULT 49,
  other_states_shipping_charge numeric DEFAULT 59,
  logo_url text,
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT app_settings_pkey PRIMARY KEY (id)
);
CREATE TABLE public.cart_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  customer_id uuid,
  variant_id uuid,
  quantity integer,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT cart_items_pkey PRIMARY KEY (id),
  CONSTRAINT cart_items_variant_id_fkey FOREIGN KEY (variant_id) REFERENCES public.product_variants(id)
);
CREATE TABLE public.categories (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  image_url text,
  parent_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT categories_pkey PRIMARY KEY (id),
  CONSTRAINT categories_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.categories(id)
);
CREATE TABLE public.coupon_usages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  coupon_id uuid,
  order_id uuid,
  user_id uuid,
  used_at timestamp with time zone DEFAULT now(),
  CONSTRAINT coupon_usages_pkey PRIMARY KEY (id),
  CONSTRAINT coupon_usages_coupon_id_fkey FOREIGN KEY (coupon_id) REFERENCES public.coupons(id),
  CONSTRAINT coupon_usages_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id)
);
CREATE TABLE public.coupons (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  discount_type text CHECK (discount_type = ANY (ARRAY['percentage'::text, 'fixed'::text])),
  discount_value numeric NOT NULL,
  min_order_value numeric DEFAULT 0,
  max_discount numeric,
  usage_limit integer,
  used_count integer DEFAULT 0,
  is_active boolean DEFAULT true,
  starts_at timestamp with time zone,
  expires_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT coupons_pkey PRIMARY KEY (id)
);
CREATE TABLE public.customer_addresses (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  customer_id uuid,
  full_name text,
  phone text,
  address_line text,
  city text,
  state text,
  pincode text,
  is_default boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT customer_addresses_pkey PRIMARY KEY (id),
  CONSTRAINT customer_addresses_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id)
);
CREATE TABLE public.customers (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  first_name text,
  last_name text,
  email text UNIQUE,
  phone text,
  addresses jsonb DEFAULT '[]'::jsonb,
  preferences jsonb DEFAULT '{}'::jsonb,
  total_spent numeric DEFAULT 0,
  orders_count integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT customers_pkey PRIMARY KEY (id)
);
CREATE TABLE public.expenses (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title text NOT NULL,
  amount numeric NOT NULL,
  category text,
  description text,
  expense_date date NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT expenses_pkey PRIMARY KEY (id)
);
CREATE TABLE public.inventory_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  variant_id uuid,
  location_id uuid,
  available_quantity integer DEFAULT 0,
  reserved_quantity integer DEFAULT 0,
  updated_at timestamp with time zone DEFAULT now(),
  reorder_point integer DEFAULT 10,
  bin_location text,
  batch_number text,
  expiry_date date,
  CONSTRAINT inventory_items_pkey PRIMARY KEY (id),
  CONSTRAINT inventory_items_variant_id_fkey FOREIGN KEY (variant_id) REFERENCES public.product_variants(id),
  CONSTRAINT inventory_items_location_id_fkey FOREIGN KEY (location_id) REFERENCES public.locations(id)
);
CREATE TABLE public.inventory_movements (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  variant_id uuid,
  location_id uuid,
  quantity integer NOT NULL,
  movement_type text CHECK (movement_type = ANY (ARRAY['sale'::text, 'purchase'::text, 'return'::text, 'adjustment'::text, 'transfer'::text, 'reservation'::text, 'release'::text])),
  reference_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT inventory_movements_pkey PRIMARY KEY (id),
  CONSTRAINT inventory_movements_variant_id_fkey FOREIGN KEY (variant_id) REFERENCES public.product_variants(id),
  CONSTRAINT inventory_movements_location_id_fkey FOREIGN KEY (location_id) REFERENCES public.locations(id)
);
CREATE TABLE public.locations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT locations_pkey PRIMARY KEY (id)
);
CREATE TABLE public.order_addresses (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  order_id uuid,
  full_name text,
  phone text,
  address_line text,
  city text,
  state text,
  pincode text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT order_addresses_pkey PRIMARY KEY (id),
  CONSTRAINT order_addresses_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id)
);
CREATE TABLE public.order_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  order_id uuid,
  variant_id uuid,
  title text,
  sku text,
  quantity integer NOT NULL,
  unit_price numeric NOT NULL,
  total_price numeric NOT NULL,
  CONSTRAINT order_items_pkey PRIMARY KEY (id),
  CONSTRAINT order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id),
  CONSTRAINT order_items_variant_id_fkey FOREIGN KEY (variant_id) REFERENCES public.product_variants(id)
);
CREATE TABLE public.orders (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  order_number bigint NOT NULL DEFAULT nextval('orders_order_number_seq'::regclass),
  sales_channel text DEFAULT 'online'::text,
  user_id uuid,
  guest_email text,
  financial_status text,
  fulfillment_status text,
  subtotal numeric,
  discount_total numeric,
  tax_total numeric,
  shipping_total numeric,
  grand_total numeric,
  currency text DEFAULT 'INR'::text,
  created_at timestamp with time zone DEFAULT now(),
  discount_amount numeric DEFAULT 0,
  tax_amount numeric DEFAULT 0,
  payment_method text DEFAULT 'Card'::text,
  order_type text DEFAULT 'online'::text,
  notes text,
  guest_name text,
  guest_phone text,
  shipping_charge numeric DEFAULT 0,
  payment_request_token text UNIQUE,
  payment_request_created_at timestamp with time zone,
  delivery_status text,
  tracking_id text,
  CONSTRAINT orders_pkey PRIMARY KEY (id)
);
CREATE TABLE public.payments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  order_id uuid,
  provider text,
  provider_reference text,
  amount numeric,
  status text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT payments_pkey PRIMARY KEY (id),
  CONSTRAINT payments_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id)
);
CREATE TABLE public.payment_request_deliveries (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL,
  channel text NOT NULL CHECK (channel = ANY (ARRAY['email'::text, 'sms'::text])),
  provider text NOT NULL,
  recipient text NOT NULL DEFAULT ''::text,
  payment_url text NOT NULL,
  status text NOT NULL CHECK (status = ANY (ARRAY['processing'::text, 'sent'::text, 'failed'::text])),
  provider_reference text,
  error_message text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT payment_request_deliveries_pkey PRIMARY KEY (id),
  CONSTRAINT payment_request_deliveries_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id)
);
CREATE TABLE public.webhook_events (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  delivery_id text NOT NULL,
  event_type text NOT NULL,
  status text NOT NULL CHECK (status = ANY (ARRAY['processing'::text, 'processed'::text, 'ignored'::text, 'failed'::text])),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_error text,
  first_seen_at timestamp with time zone NOT NULL DEFAULT now(),
  processed_at timestamp with time zone,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT webhook_events_pkey PRIMARY KEY (id),
  CONSTRAINT webhook_events_provider_delivery_id_key UNIQUE (provider, delivery_id)
);
CREATE TABLE public.permissions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  description text,
  CONSTRAINT permissions_pkey PRIMARY KEY (id)
);
CREATE TABLE public.preorders (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  customer_id uuid,
  variant_id uuid,
  order_id uuid,
  quantity integer,
  status text DEFAULT 'pending'::text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT preorders_pkey PRIMARY KEY (id),
  CONSTRAINT preorders_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id),
  CONSTRAINT preorders_variant_id_fkey FOREIGN KEY (variant_id) REFERENCES public.product_variants(id)
);
CREATE TABLE public.product_features (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  product_id uuid,
  feature_text text,
  CONSTRAINT product_features_pkey PRIMARY KEY (id),
  CONSTRAINT product_features_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id)
);
CREATE TABLE public.product_media (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  product_id uuid,
  media_url text NOT NULL,
  media_type text DEFAULT 'image'::text CHECK (media_type = ANY (ARRAY['image'::text, 'video'::text])),
  position integer DEFAULT 1,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT product_media_pkey PRIMARY KEY (id),
  CONSTRAINT product_media_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id)
);
CREATE TABLE public.product_option_values (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  option_id uuid,
  value text NOT NULL,
  position integer DEFAULT 1,
  CONSTRAINT product_option_values_pkey PRIMARY KEY (id),
  CONSTRAINT product_option_values_option_id_fkey FOREIGN KEY (option_id) REFERENCES public.product_options(id)
);
CREATE TABLE public.product_options (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  product_id uuid,
  name text NOT NULL,
  position integer DEFAULT 1,
  CONSTRAINT product_options_pkey PRIMARY KEY (id),
  CONSTRAINT product_options_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id)
);
CREATE TABLE public.product_tags (
  product_id uuid NOT NULL,
  tag_id uuid NOT NULL,
  CONSTRAINT product_tags_pkey PRIMARY KEY (product_id, tag_id),
  CONSTRAINT product_tags_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id),
  CONSTRAINT product_tags_tag_id_fkey FOREIGN KEY (tag_id) REFERENCES public.tags(id)
);
CREATE TABLE public.product_variants (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  product_id uuid,
  sku text NOT NULL DEFAULT generate_sku() UNIQUE,
  barcode text UNIQUE,
  price numeric NOT NULL,
  compare_at_price numeric,
  cost_price numeric,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  weight_value numeric,
  weight_unit text DEFAULT 'kg'::text,
  dimension_length numeric,
  dimension_width numeric,
  dimension_height numeric,
  dimension_unit text DEFAULT 'cm'::text,
  allow_preorder boolean DEFAULT false,
  CONSTRAINT product_variants_pkey PRIMARY KEY (id),
  CONSTRAINT product_variants_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id)
);
CREATE TABLE public.products (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  product_type text,
  vendor text,
  status text DEFAULT 'draft'::text CHECK (status = ANY (ARRAY['draft'::text, 'active'::text, 'archived'::text])),
  seo_title text,
  seo_description text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  category_id uuid,
  tags ARRAY,
  brand text,
  hs_code text,
  origin_country text,
  material text,
  care_instructions text,
  features ARRAY,
  is_featured boolean DEFAULT false,
  rating numeric DEFAULT 0,
  review_count integer DEFAULT 0,
  gender text CHECK (gender = ANY (ARRAY['Men'::text, 'Women'::text, 'Kids'::text, 'Unisex'::text])),
  collection text,
  is_customizable boolean DEFAULT false,
  customization_template jsonb DEFAULT '{}'::jsonb,
  warranty_period text,
  shipping_class text DEFAULT 'standard'::text,
  return_policy text,
  is_free_delivery boolean DEFAULT false,
  CONSTRAINT products_pkey PRIMARY KEY (id),
  CONSTRAINT products_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id)
);
CREATE TABLE public.purchase_order_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  purchase_order_id uuid,
  variant_id uuid,
  quantity integer NOT NULL,
  unit_cost numeric NOT NULL,
  total_cost numeric NOT NULL,
  received_quantity integer DEFAULT 0,
  CONSTRAINT purchase_order_items_pkey PRIMARY KEY (id),
  CONSTRAINT purchase_order_items_purchase_order_id_fkey FOREIGN KEY (purchase_order_id) REFERENCES public.purchase_orders(id),
  CONSTRAINT purchase_order_items_variant_id_fkey FOREIGN KEY (variant_id) REFERENCES public.product_variants(id)
);
CREATE TABLE public.purchase_orders (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  order_number bigint NOT NULL DEFAULT nextval('purchase_orders_order_number_seq'::regclass),
  supplier_id uuid,
  status text DEFAULT 'draft'::text CHECK (status = ANY (ARRAY['draft'::text, 'ordered'::text, 'received'::text, 'cancelled'::text])),
  total_amount numeric DEFAULT 0,
  expected_date date,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT purchase_orders_pkey PRIMARY KEY (id),
  CONSTRAINT purchase_orders_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id)
);
CREATE TABLE public.reviews (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  product_id uuid,
  customer_id uuid,
  rating numeric CHECK (rating >= 1::numeric AND rating <= 5::numeric),
  comment text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT reviews_pkey PRIMARY KEY (id),
  CONSTRAINT reviews_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id)
);
CREATE TABLE public.role_permissions (
  role_id uuid NOT NULL,
  permission_id uuid NOT NULL,
  CONSTRAINT role_permissions_pkey PRIMARY KEY (role_id, permission_id),
  CONSTRAINT role_permissions_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id),
  CONSTRAINT role_permissions_permission_id_fkey FOREIGN KEY (permission_id) REFERENCES public.permissions(id)
);
CREATE TABLE public.roles (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT roles_pkey PRIMARY KEY (id)
);
CREATE TABLE public.shipping_rules (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text,
  min_order_value numeric DEFAULT 0,
  max_order_value numeric,
  shipping_charge numeric NOT NULL,
  is_active boolean DEFAULT true,
  CONSTRAINT shipping_rules_pkey PRIMARY KEY (id)
);
CREATE TABLE public.shipping_zone_rates (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  zone_id uuid,
  min_order_value numeric,
  shipping_charge numeric,
  CONSTRAINT shipping_zone_rates_pkey PRIMARY KEY (id),
  CONSTRAINT shipping_zone_rates_zone_id_fkey FOREIGN KEY (zone_id) REFERENCES public.shipping_zones(id)
);
CREATE TABLE public.shipping_zones (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text,
  states ARRAY,
  CONSTRAINT shipping_zones_pkey PRIMARY KEY (id)
);
CREATE TABLE public.suppliers (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  contact_person text,
  email text,
  phone text,
  address text,
  tax_id text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT suppliers_pkey PRIMARY KEY (id)
);
CREATE TABLE public.tags (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text UNIQUE,
  CONSTRAINT tags_pkey PRIMARY KEY (id)
);
CREATE TABLE public.user_profiles (
  id uuid NOT NULL,
  phone text UNIQUE,
  full_name text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_profiles_pkey PRIMARY KEY (id),
  CONSTRAINT user_profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);
CREATE TABLE public.users (
  id uuid NOT NULL,
  full_name text,
  role_id uuid,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  email text,
  CONSTRAINT users_pkey PRIMARY KEY (id),
  CONSTRAINT users_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id),
  CONSTRAINT users_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id)
);
CREATE TABLE public.variant_media (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  variant_id uuid,
  media_url text NOT NULL,
  position integer DEFAULT 1,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT variant_media_pkey PRIMARY KEY (id),
  CONSTRAINT variant_media_variant_id_fkey FOREIGN KEY (variant_id) REFERENCES public.product_variants(id)
);
CREATE TABLE public.variant_option_values (
  variant_id uuid NOT NULL,
  option_value_id uuid NOT NULL,
  CONSTRAINT variant_option_values_pkey PRIMARY KEY (variant_id, option_value_id),
  CONSTRAINT variant_option_values_variant_id_fkey FOREIGN KEY (variant_id) REFERENCES public.product_variants(id),
  CONSTRAINT variant_option_values_option_value_id_fkey FOREIGN KEY (option_value_id) REFERENCES public.product_option_values(id)
);
CREATE TABLE public.wishlist_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  wishlist_id uuid,
  product_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT wishlist_items_pkey PRIMARY KEY (id),
  CONSTRAINT wishlist_items_wishlist_id_fkey FOREIGN KEY (wishlist_id) REFERENCES public.wishlists(id),
  CONSTRAINT wishlist_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id)
);
CREATE TABLE public.wishlists (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  customer_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT wishlists_pkey PRIMARY KEY (id),
  CONSTRAINT wishlists_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id)
);
