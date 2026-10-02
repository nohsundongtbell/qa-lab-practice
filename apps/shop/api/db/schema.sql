-- QA 숍 스키마
-- 테이블명 members / orders / order_items / coupons 는 QA-Lab m61 레슨 스키마를 따른다.
-- TODO: verify — 컬럼 정의를 m61 레슨(sql-for-verification, data-integrity-queries)의 DDL과 대조할 것.

CREATE TABLE members (
  id            SERIAL PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name          TEXT NOT NULL,
  zipcode       CHAR(5) NOT NULL,
  address       TEXT NOT NULL DEFAULT '',
  role          TEXT NOT NULL DEFAULT 'CUSTOMER' CHECK (role IN ('CUSTOMER', 'ADMIN')),
  total_spent   BIGINT NOT NULL DEFAULT 0 CHECK (total_spent >= 0),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE auth_tokens (
  token      TEXT PRIMARY KEY,
  member_id  INTEGER NOT NULL REFERENCES members(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE products (
  id         SERIAL PRIMARY KEY,
  name       TEXT NOT NULL,
  price      INTEGER NOT NULL CHECK (price > 0),
  stock      INTEGER NOT NULL CHECK (stock >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE coupons (
  id               SERIAL PRIMARY KEY,
  code             TEXT NOT NULL UNIQUE,
  type             TEXT NOT NULL CHECK (type IN ('FIXED', 'PERCENT')),
  amount           INTEGER,
  rate             INTEGER,
  max_discount     INTEGER,
  min_order_amount INTEGER NOT NULL DEFAULT 0,
  valid_from       DATE NOT NULL,
  valid_until      DATE NOT NULL
);

CREATE TABLE member_coupons (
  id            SERIAL PRIMARY KEY,
  member_id     INTEGER NOT NULL REFERENCES members(id),
  coupon_id     INTEGER NOT NULL REFERENCES coupons(id),
  used_at       TIMESTAMPTZ,
  used_order_id INTEGER,
  UNIQUE (member_id, coupon_id)
);

CREATE TABLE cart_items (
  member_id  INTEGER NOT NULL REFERENCES members(id),
  product_id INTEGER NOT NULL REFERENCES products(id),
  qty        INTEGER NOT NULL,
  PRIMARY KEY (member_id, product_id)
);

CREATE TABLE orders (
  id                 SERIAL PRIMARY KEY,
  member_id          INTEGER NOT NULL REFERENCES members(id),
  status             TEXT NOT NULL CHECK (status IN ('PENDING','PAID','SHIPPED','DELIVERED','CANCELLED','REFUNDED')),
  grade              TEXT NOT NULL,
  subtotal           INTEGER NOT NULL,
  grade_discount     INTEGER NOT NULL,
  coupon_discount    INTEGER NOT NULL,
  member_coupon_id   INTEGER REFERENCES member_coupons(id),
  shipping_fee       INTEGER NOT NULL,
  total_amount       INTEGER NOT NULL,
  zipcode            CHAR(5) NOT NULL,
  address            TEXT NOT NULL DEFAULT '',
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  paid_at            TIMESTAMPTZ,
  ship_date          DATE,
  estimated_delivery DATE,
  shipped_at         TIMESTAMPTZ,
  delivered_at       TIMESTAMPTZ,
  cancelled_at       TIMESTAMPTZ,
  refunded_at        TIMESTAMPTZ
);

CREATE TABLE order_items (
  id           SERIAL PRIMARY KEY,
  order_id     INTEGER NOT NULL REFERENCES orders(id),
  product_id   INTEGER NOT NULL REFERENCES products(id),
  product_name TEXT NOT NULL,
  unit_price   INTEGER NOT NULL,
  qty          INTEGER NOT NULL,
  line_total   INTEGER NOT NULL
);

CREATE TABLE order_status_history (
  id          SERIAL PRIMARY KEY,
  order_id    INTEGER NOT NULL REFERENCES orders(id),
  from_status TEXT,
  to_status   TEXT NOT NULL,
  at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
