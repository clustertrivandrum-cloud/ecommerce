# Cluster Fascination - Frontend Development Plan

## 🎯 Goal
Build a mobile-first, high-conversion e-commerce frontend using backend schema (Supabase).

Focus:
- Speed
- Conversion
- Clean UX
- Minimal UI

---

## 🧱 Tech Stack

- Framework: Next.js (App Router)
- Styling: Tailwind CSS
- State: Zustand / React Query
- Backend: Supabase
- Auth: Supabase OTP (phone)
- Storage: Supabase Storage

---

## 🎨 Design System

### Colors
- bg-primary: #0B0B0B
- bg-card: #141414
- text-primary: #EDEDED
- text-secondary: #A1A1A1
- accent-gold: #2F5A37
- accent-mint: #A8D5C2
- border: #262626

### Typography
- Heading: Playfair Display
- Body: Inter

### Spacing
Use 8px system

---

## 📁 Folder Structure

/app
  /home
  /category
  /product/[slug]
  /cart
  /checkout
  /orders
  /wishlist
  /profile
  /search

/components
  /ui
  /product
  /cart
  /checkout
  /modals

/lib
  /api
  /hooks
  /utils

/store
  cartStore.ts
  userStore.ts

---

## 📱 Core Screens

### 1. Home Page
- Hero banner
- Categories (scroll)
- Bestsellers
- Offers
- UGC section

API:
- getFeaturedProducts
- getCategories

---

### 2. Product Listing Page
- Grid layout
- Filters (modal)
- Sorting

API:
- getProducts(category, filters)

---

### 3. Product Page

Components:
- Image slider
- Variant selector
- Price + discount
- Stock indicator
- Preorder support
- Reviews

Sticky Bottom:
- Buy Now
- Add to Cart

API:
- getProductBySlug
- getVariants
- getReviews

---

### 4. Cart

Features:
- Update quantity
- Remove item
- Apply coupon
- Show shipping

API:
- cart (local + sync optional)

---

### 5. Checkout

Steps:
1. Address
2. Shipping
3. Payment

Supports:
- Guest checkout
- Logged-in

API:
- createOrder
- applyCoupon
- calculateShipping

---

### 6. Orders

- Order list
- Status
- Tracking

API:
- getOrders

---

### 7. Wishlist

- Add/remove
- Move to cart

API:
- getWishlist

---

### 8. Profile

- User info
- Addresses

---

### 9. Auth

- Phone input
- OTP verification

---

### 10. Search

- Live search
- Suggestions

---

## 🧩 Modals / Bottom Sheets

- Variant selector
- Filter modal
- Sort modal
- Coupon modal
- Address selector
- Add address form
- Preorder modal
- Cart drawer

---

## 🛒 Cart Logic

- Store locally (Zustand)
- Sync on login
- Calculate total dynamically

---

## 🎟️ Coupon Logic

- Validate:
  - active
  - expiry
  - min order value
- Apply discount

---

## 🚚 Shipping Logic

Priority:

1. If product.is_free_delivery → FREE
2. Else apply shipping_rules

---

## ⏳ Preorder Logic

IF:
- stock = 0
- allow_preorder = true

THEN:
- Show "Preorder"
- Allow checkout

---

## 💡 UX Rules

- Sticky CTA on mobile
- Max 2 taps to checkout
- No long forms
- Fast interactions

---

## ⚡ Performance

- Lazy load images
- Use next/image
- Cache product lists
- Debounce search

---

## 🔥 Conversion Elements

- "Only X left"
- "5000+ customers"
- "Bestseller"
- Reviews

---

## ❌ Avoid

- Over design
- Too many animations
- Heavy components

---

## 🚀 Build Order

1. Setup project + design tokens
2. Home page
3. Product listing
4. Product page
5. Cart
6. Checkout
7. Auth
8. Wishlist
9. Orders
