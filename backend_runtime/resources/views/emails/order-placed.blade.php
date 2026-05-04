<p>Halo {{ $order->customer_name }},</p>
<p>Pesanan Anda dengan kode <strong>{{ $order->code }}</strong> berhasil dibuat.</p>
<p>Total pembayaran: <strong>Rp {{ number_format($order->grand_total, 0, ',', '.') }}</strong>.</p>
<p>Status awal pesanan saat ini adalah <strong>{{ $order->status }}</strong>.</p>
<p>Silakan lanjutkan pembayaran melalui link yang tersedia di aplikasi Larisdy.</p>
