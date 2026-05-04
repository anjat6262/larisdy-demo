import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "@playwright/test";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const createImagePath = path.resolve(__dirname, "../../public/images/logo.jpeg");
const updateImagePath = path.resolve(__dirname, "../../public/images/abontuna.jpeg");
const API_BASE_URL = "http://127.0.0.1:8001/api";

function isApiResponse(response, pathFragment, method, status) {
  return (
    response.url().includes(pathFragment) &&
    response.request().method() === method &&
    response.status() === status
  );
}

async function login(page, credentials) {
  await page.goto("/login");
  await page.locator("#loginEmail").fill(credentials.email);
  await page.locator("#loginPassword").fill(credentials.password);
  await page.locator(".auth-form").getByRole("button", { name: "Masuk" }).click();
  await expect(page.getByRole("button", { name: /Buka menu akun customer|Keluar/ }).first()).toBeVisible();
}

async function logout(page) {
  const customerAccountButton = page.getByRole("button", { name: "Buka menu akun customer" });

  if (await customerAccountButton.count()) {
    await customerAccountButton.click();
    await page.getByRole("menuitem", { name: "Logout" }).click();
  } else {
    await page.getByRole("button", { name: "Keluar" }).click();
  }

  await expect(page.getByRole("banner").getByRole("button", { name: "Masuk" })).toBeVisible();
}

async function loginByApi(request, credentials) {
  const response = await request.post(`${API_BASE_URL}/login`, {
    data: credentials,
    headers: {
      Accept: "application/json",
    },
  });

  expect(response.status()).toBe(200);
  return response.json();
}

async function authenticatePageWithApiSession(page, session) {
  await page.addInitScript((payload) => {
    window.localStorage.setItem("larisdy_access_token", payload.token);
    window.localStorage.setItem("larisdy_user", JSON.stringify(payload.user));
  }, session);
}

async function createCompletedOrderForCustomer(request) {
  const customerSession = await loginByApi(request, {
    email: "user@gmail.com",
    password: "password",
  });

  const checkoutResponse = await request.post(`${API_BASE_URL}/checkout`, {
    data: {
      customer_name: customerSession.user.name,
      customer_email: customerSession.user.email,
      customer_phone: customerSession.user.phone,
      shipping_address: customerSession.user.address,
      notes: "Order untuk validasi testimonial completed",
      payment_method: "qris_manual",
      items: [
        {
          product_id: 1,
          quantity: 1,
        },
      ],
    },
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${customerSession.token}`,
    },
  });

  expect(checkoutResponse.status()).toBe(201);
  const orderPayload = await checkoutResponse.json();
  const orderId = orderPayload.data.id;

  const adminSession = await loginByApi(request, {
    email: "admin@larisdy.com",
    password: "password",
  });

  const proofUploadResponse = await request.post(`${API_BASE_URL}/orders/${orderId}/payment-proof`, {
    multipart: {
      proof: {
        name: "bukti-qris-test.jpeg",
        mimeType: "image/jpeg",
        buffer: fs.readFileSync(createImagePath),
      },
      note: "Bukti QRIS untuk order completed test",
    },
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${customerSession.token}`,
    },
  });

  expect(proofUploadResponse.status()).toBe(201);

  const verifyProofResponse = await request.post(`${API_BASE_URL}/admin/orders/${orderId}/payment-proof/verify`, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${adminSession.token}`,
    },
  });

  expect(verifyProofResponse.status()).toBe(200);

  for (const payload of [
    { status: "diproses" },
    { status: "dikirim", tracking_number: "JNE-TESTIMONI-001" },
  ]) {
    const updateResponse = await request.put(`${API_BASE_URL}/admin/orders/${orderId}`, {
      data: payload,
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${adminSession.token}`,
      },
    });

    expect(updateResponse.status()).toBe(200);
  }

  const completeResponse = await request.post(`${API_BASE_URL}/orders/${orderId}/complete`, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${customerSession.token}`,
    },
  });

  expect(completeResponse.status()).toBe(200);

  return orderPayload.data;
}

test("customer checkout, payment status, admin proses order, dan customer melihat status akhir", async ({ page, request }) => {
  const customerLoginResponsePromise = page.waitForResponse((response) =>
    isApiResponse(response, "/api/login", "POST", 200),
  );

  await login(page, {
    email: "user@gmail.com",
    password: "password",
  });

  const customerLoginResponse = await customerLoginResponsePromise;
  const customerLoginPayload = await customerLoginResponse.json();

  expect(customerLoginPayload.token).toBeTruthy();
  expect(customerLoginPayload.user.role).toBe("customer");
  await expect(page).toHaveURL("/");

  await page.goto("/admin");
  await expect(page.getByRole("heading", { name: "Akses Ditolak" })).toBeVisible();

  const productsResponsePromise = page.waitForResponse((response) =>
    isApiResponse(response, "/api/products", "GET", 200),
  );

  await page.goto("/products");

  const productsResponse = await productsResponsePromise;
  const productsPayload = await productsResponse.json();
  const firstProduct = productsPayload.data[0];
  const quickBuyCard = page
    .locator(".product-card")
    .filter({ hasText: firstProduct.name })
    .first();

  await expect(quickBuyCard).toBeVisible();
  await quickBuyCard.getByRole("button", { name: "Beli" }).click();
  await expect(page).toHaveURL(/\/cart$/);

  const checkoutResponsePromise = page.waitForResponse((response) =>
    isApiResponse(response, "/api/checkout", "POST", 201),
  );

  await page.getByRole("button", { name: "Checkout" }).click();
  await expect(page).toHaveURL(/\/checkout$/);
  await page.context().grantPermissions(["geolocation"]);
  await page.context().setGeolocation({ latitude: -6.917464, longitude: 107.619123 });
  await page.getByRole("button", { name: "Gunakan Lokasi Saya" }).click();
  await expect(page.getByText("Koordinat")).toBeVisible();
  await expect(page.getByRole("link", { name: "Buka Maps" })).toBeVisible();
  await page.locator("#checkoutNotes").fill("Customer order untuk flow pembayaran digital");
  await page.getByRole("button", { name: "Lanjut ke QRIS" }).click();

  const checkoutResponse = await checkoutResponsePromise;
  const checkoutPayload = await checkoutResponse.json();
  const orderId = checkoutPayload.data.id;
  const orderCode = checkoutPayload.data.code;
  expect(checkoutPayload.data.shipping_latitude).toBeCloseTo(-6.917464, 5);
  expect(checkoutPayload.data.shipping_longitude).toBeCloseTo(107.619123, 5);

  await expect(page).toHaveURL(/\/payment-status\?/);
  await expect(page.getByText("Instruksi QRIS")).toBeVisible();
  await expect(page.getByText("Batas Bayar").first()).toBeVisible();
  await expect(page.getByText("Sisa Waktu").first()).toBeVisible();
  await expect(page.locator(".qris-payment-image")).toBeVisible();
  await expect(page.locator(".order-status.pending").first()).toBeVisible();

  const qrisProofResponsePromise = page.waitForResponse((response) =>
    response.url().includes(`/api/orders/${orderId}/payment-proof`) &&
    response.request().method() === "POST" &&
    response.status() === 201,
  );
  await page.getByRole("button", { name: "Saya Sudah Bayar" }).click();
  await page.getByLabel("Upload Gambar").setInputFiles(createImagePath);
  await page.getByLabel("Catatan").fill("Bukti QRIS dari smoke test.");
  await page.getByRole("button", { name: "Kirim Bukti" }).click();
  await qrisProofResponsePromise;
  await expect(page.getByRole("button", { name: "Bukti Pembayaran Terkirim" })).toBeVisible();

  await logout(page);

  const adminLoginResponsePromise = page.waitForResponse((response) =>
    isApiResponse(response, "/api/login", "POST", 200),
  );

  await login(page, {
    email: "admin@larisdy.com",
    password: "password",
  });

  const adminLoginResponse = await adminLoginResponsePromise;
  const adminLoginPayload = await adminLoginResponse.json();

  expect(adminLoginPayload.user.role).toBe("admin");

  await page.goto("/admin/orders");
  const adminOrderCard = page.locator(".order-card").filter({ hasText: orderCode }).first();
  await expect(adminOrderCard).toBeVisible();
  await expect(adminOrderCard).toContainText("Customer Larisdy");

  const verifyResponsePromise = page.waitForResponse((response) =>
    isApiResponse(response, `/api/admin/orders/${orderId}/payment-proof/verify`, "POST", 200),
  );
  await adminOrderCard.getByRole("button", { name: "Verifikasi Bukti" }).click();
  await verifyResponsePromise;
  await expect(adminOrderCard.getByText("Sudah Dibayar")).toBeVisible();

  const processResponsePromise = page.waitForResponse((response) =>
    isApiResponse(response, `/api/admin/orders/${orderId}`, "PUT", 200),
  );
  await adminOrderCard.getByRole("button", { name: "Proses Pesanan" }).click();
  await processResponsePromise;
  await expect(adminOrderCard.getByText("Diproses")).toBeVisible();

  await adminOrderCard.locator(`#tracking-${orderId}`).fill("JNE-PLAYWRIGHT-001");
  const shipResponsePromise = page.waitForResponse((response) =>
    isApiResponse(response, `/api/admin/orders/${orderId}`, "PUT", 200),
  );
  await adminOrderCard.getByRole("button", { name: "Kirim" }).click();
  await shipResponsePromise;
  await expect(adminOrderCard.getByText("Dikirim")).toBeVisible();
  await expect(adminOrderCard.getByRole("button", { name: "Selesaikan" })).toHaveCount(0);

  await logout(page);

  const reloginResponsePromise = page.waitForResponse((response) =>
    isApiResponse(response, "/api/login", "POST", 200),
  );

  await login(page, {
    email: "user@gmail.com",
    password: "password",
  });

  await reloginResponsePromise;
  await page.goto("/orders");
  const finalCustomerOrderCard = page.locator(".order-card").filter({ hasText: orderCode }).first();
  await expect(finalCustomerOrderCard).toContainText("JNE-PLAYWRIGHT-001");

  page.once("dialog", (dialog) => dialog.accept());
  const completeResponsePromise = page.waitForResponse((response) =>
    isApiResponse(response, `/api/orders/${orderId}/complete`, "POST", 200),
  );
  await finalCustomerOrderCard.getByRole("button", { name: "Selesaikan Pesanan" }).click();
  await completeResponsePromise;
  await expect(finalCustomerOrderCard.getByText("Selesai")).toBeVisible();
  await expect(finalCustomerOrderCard.getByRole("button", { name: "Review Produk" })).toBeVisible();
  await page.getByRole("button", { name: "Review Produk" }).first().click();
  await expect(finalCustomerOrderCard).toBeVisible();

  const orderDetailResponsePromise = page.waitForResponse((response) =>
    isApiResponse(response, `/api/orders/${orderId}`, "GET", 200),
  );
  await finalCustomerOrderCard.locator(".order-item").first().click();
  await orderDetailResponsePromise;
  await expect(page).toHaveURL(new RegExp(`/orders/${orderId}$`));
  await expect(page.getByRole("heading", { name: `No. Pesanan ${orderCode}` })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Detail Produk" })).toBeVisible();
  await expect(page.getByText("Tanggal Pembelian").first()).toBeVisible();
  await expect(page.getByText("Nomor Pesanan").first()).toBeVisible();
  await expect(page.getByText(orderCode).first()).toBeVisible();
  await expect(page.getByText("Resi JNE-PLAYWRIGHT-001").first()).toBeVisible();
  await expect(page.getByText("Pesanan Selesai").first()).toBeVisible();
});

test("customer checkout dengan transfer BCA menampilkan rekening dan upload bukti", async ({ page }) => {
  await login(page, {
    email: "user@gmail.com",
    password: "password",
  });

  const productsResponsePromise = page.waitForResponse((response) =>
    isApiResponse(response, "/api/products", "GET", 200),
  );

  await page.goto("/products");
  const productsResponse = await productsResponsePromise;
  const productsPayload = await productsResponse.json();
  const firstProduct = productsPayload.data[0];
  const quickBuyCard = page
    .locator(".product-card")
    .filter({ hasText: firstProduct.name })
    .first();

  await quickBuyCard.getByRole("button", { name: "Beli" }).click();
  await expect(page).toHaveURL(/\/cart$/);
  await page.getByRole("button", { name: "Checkout" }).click();
  await expect(page).toHaveURL(/\/checkout$/);

  await page.locator('input[name="payment_method"][value="bank_transfer_bca"]').check({ force: true });
  await expect(page.getByText("Transfer Rekening BCA").first()).toBeVisible();

  const checkoutResponsePromise = page.waitForResponse((response) =>
    isApiResponse(response, "/api/checkout", "POST", 201),
  );

  await page.getByRole("button", { name: "Pilih Transfer BCA" }).click();

  const checkoutResponse = await checkoutResponsePromise;
  const checkoutPayload = await checkoutResponse.json();
  expect(checkoutPayload.data.payment_method).toBe("bank_transfer_bca");
  expect(checkoutPayload.data.payment_payload.bank_name).toBe("BCA");
  expect(checkoutPayload.data.payment_payload.account_number).toBeTruthy();

  await expect(page).toHaveURL(/\/payment-status\?/);
  await expect(page.getByText("Instruksi Transfer BCA")).toBeVisible();
  await expect(page.locator(".bca-account-number")).toHaveText(/\d{8,}/);
  await expect(page.getByText("Batas pembayaran 24 jam").first()).toBeVisible();

  const proofResponsePromise = page.waitForResponse((response) =>
    response.url().includes(`/api/orders/${checkoutPayload.data.id}/payment-proof`) &&
    response.request().method() === "POST" &&
    response.status() === 201,
  );
  await page.getByRole("button", { name: "Saya Sudah Bayar" }).click();
  await page.getByLabel("Upload Gambar").setInputFiles(createImagePath);
  await page.getByLabel("Catatan").fill("Bukti transfer BCA dari smoke test.");
  await page.getByRole("button", { name: "Kirim Bukti" }).click();
  await proofResponsePromise;
  await expect(page.getByText("Menunggu Verifikasi Admin").first()).toBeVisible();

  await logout(page);
});

test("admin login dan CRUD produk dari dashboard admin berjalan", async ({ page }) => {
  const loginResponsePromise = page.waitForResponse((response) =>
    isApiResponse(response, "/api/login", "POST", 200),
  );

  await login(page, {
    email: "admin@larisdy.com",
    password: "password",
  });

  const loginResponse = await loginResponsePromise;
  const loginPayload = await loginResponse.json();

  expect(loginPayload.user.role).toBe("admin");
  await expect(page).toHaveURL(/\/admin$/);

  await page.goto("/admin/products");
  await expect(page.getByRole("heading", { name: "Dashboard Produk Admin" })).toBeVisible();

  const createdProductName = `Produk Admin ${Date.now()}`;

  const createResponsePromise = page.waitForResponse((response) =>
    isApiResponse(response, "/api/products", "POST", 201),
  );

  await page.locator("#adminProductName").fill(createdProductName);
  await page.locator("#adminProductDescription").fill("Produk hasil smoke test admin.");
  await page.locator("#adminProductPrice").fill("66000");
  await page.locator("#adminProductImageFile").setInputFiles(createImagePath);
  await page.locator("#adminProductCategory").fill("Sambal Premium");
  await page.locator("#adminProductWeight").fill("250g");
  await page.locator("#adminProductSpicyLevel").fill("5");
  await page.locator("#adminProductStock").fill("25");
  await page.getByRole("button", { name: "Simpan Produk" }).click();

  const createResponse = await createResponsePromise;
  const createdProduct = await createResponse.json();

  expect(createdProduct.data.name).toBe(createdProductName);
  await expect(page.getByText(createdProductName)).toBeVisible();

  const productCard = page.locator(".admin-product-card").filter({ hasText: createdProductName }).first();
  await productCard.getByRole("button", { name: "Edit" }).click();

  const updateResponsePromise = page.waitForResponse((response) =>
    isApiResponse(response, `/api/products/${createdProduct.data.id}`, "POST", 200),
  );

  await page.locator("#adminProductName").fill(`${createdProductName} Update`);
  await page.locator("#adminProductImageFile").setInputFiles(updateImagePath);
  await page.getByRole("button", { name: "Update Produk" }).click();

  const updateResponse = await updateResponsePromise;
  const updatedProduct = await updateResponse.json();

  expect(updatedProduct.data.name).toBe(`${createdProductName} Update`);
  await expect(page.getByText(`${createdProductName} Update`)).toBeVisible();

  page.once("dialog", (dialog) => dialog.accept());
  const deleteResponsePromise = page.waitForResponse((response) =>
    isApiResponse(response, `/api/products/${createdProduct.data.id}`, "DELETE", 200),
  );

  await page
    .locator(".admin-product-card")
    .filter({ hasText: `${createdProductName} Update` })
    .first()
    .getByRole("button", { name: "Hapus" })
    .click();

  await deleteResponsePromise;
  await expect(page.getByText(`${createdProductName} Update`)).toHaveCount(0);
});

test("homepage content API, review produk, dan contact form berjalan", async ({ page, request }) => {
  await createCompletedOrderForCustomer(request);

  await login(page, {
    email: "user@gmail.com",
    password: "password",
  });

  const productsResponsePromise = page.waitForResponse((response) =>
    isApiResponse(response, "/api/products", "GET", 200),
  );
  const profileResponsePromise = page.waitForResponse((response) =>
    isApiResponse(response, "/api/business-profile", "GET", 200),
  );

  await page.goto("/");

  await productsResponsePromise;
  await profileResponsePromise;

  await expect(page.getByRole("heading", { name: "Koleksi Terpilih" })).toBeVisible();

  const productDetailPromise = page.waitForResponse((response) =>
    isApiResponse(response, "/api/products/1", "GET", 200),
  );
  const reviewEligibilityPromise = page.waitForResponse((response) =>
    isApiResponse(response, "/api/testimonials/eligibility?product_id=1", "GET", 200),
  );
  await page.goto("/products/1");
  await productDetailPromise;
  await reviewEligibilityPromise;

  await expect(page.getByRole("heading", { name: "Ulasan Pembeli" })).toBeVisible();
  await expect(page.getByText("Belum ada rating").first()).toBeVisible();
  await expect(page.getByText("Anda bisa memberikan review karena sudah menyelesaikan pesanan produk ini.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Kirim Review" })).toBeEnabled();

  const testimonialCreatePromise = page.waitForResponse((response) =>
    isApiResponse(response, "/api/testimonials", "POST", 201),
  );

  const reviewForm = page.locator("form").filter({ hasText: "Review Produk Ini" });
  await expect(reviewForm.getByLabel("Nama")).toHaveValue("Customer Larisdy");
  await reviewForm.getByLabel("Kota").fill("Bogor");
  await reviewForm.getByLabel("Rating").selectOption("5");
  await reviewForm.getByLabel("Review", { exact: true }).fill("Produknya enak, status pesanan jelas, dan review tampil langsung di detail produk.");
  await reviewForm.getByLabel("Foto Review").setInputFiles(createImagePath);
  await expect(page.locator(".testimonial-preview-image")).toBeVisible();
  await reviewForm.getByRole("button", { name: "Kirim Review" }).click();

  const testimonialCreateResponse = await testimonialCreatePromise;
  const testimonialPayload = await testimonialCreateResponse.json();

  expect(testimonialPayload.data.product_id).toBe("1");
  expect(testimonialPayload.data.image).toContain("testimonials/");
  expect(testimonialPayload.data.image_url).toContain("/storage/testimonials/");
  await expect(page.getByText("5.0/5")).toBeVisible();
  await expect(page.getByText("(1 review)")).toBeVisible();
  await expect(page.getByRole("main").getByText("Customer Larisdy")).toBeVisible();
  await expect(page.getByText("Produknya enak, status pesanan jelas")).toBeVisible();

  const contactCreatePromise = page.waitForResponse((response) =>
    isApiResponse(response, "/api/contact", "POST", 201),
  );

  await page.goto("/contact");
  await page.locator("#contactName").fill("Kontak Playwright");
  await page.locator("#contactEmail").fill("contact-playwright@example.com");
  await page.locator("#contactPhone").fill("0812-1234-5678");
  await page.locator("#contactMessage").fill("Halo admin, saya ingin memastikan CS form sudah tersimpan di backend.");
  await page.getByRole("button", { name: "Kirim Pesan" }).click();

  await contactCreatePromise;
  await expect(page.locator("#contactName")).toHaveValue("");
});

test("customer tanpa order selesai melihat form review produk nonaktif", async ({ page, request }) => {
  const uniqueEmail = `new-user-${Date.now()}@example.com`;
  const registerResponse = await request.post(`${API_BASE_URL}/register`, {
    data: {
      name: "User Baru Testimoni",
      email: uniqueEmail,
      phone: "0812-0000-9999",
      address: "Jl. User Baru No. 1",
      password: "password",
      password_confirmation: "password",
    },
    headers: {
      Accept: "application/json",
    },
  });

  expect(registerResponse.status()).toBe(201);

  const session = await loginByApi(request, {
    email: uniqueEmail,
    password: "password",
  });

  await authenticatePageWithApiSession(page, session);
  await page.goto("/products/1");

  await expect(page.getByRole("button", { name: "Buka menu akun customer" })).toBeVisible();
  await expect(page.getByText("Anda harus menyelesaikan pesanan produk ini sebelum memberikan review.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Kirim Review" })).toBeDisabled();
});

test("token admin yang sudah tidak valid dibersihkan dan diarahkan ke login", async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("larisdy_access_token", "token-admin-invalid");
    window.localStorage.setItem(
      "larisdy_user",
      JSON.stringify({
        id: 999,
        name: "Admin Lama",
        email: "admin@larisdy.com",
        role: "admin",
      }),
    );
  });

  await page.goto("/admin/products");

  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("heading", { name: "Selamat Datang Kembali" })).toBeVisible();
});
