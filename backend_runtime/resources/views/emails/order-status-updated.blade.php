<p>Halo {{ $order->customer_name }},</p>
<p>Status pesanan <strong>{{ $order->code }}</strong> telah berubah dari <strong>{{ $previousStatus }}</strong> menjadi <strong>{{ $order->status }}</strong>.</p>
@if($order->tracking_number)
<p>Nomor resi: <strong>{{ $order->tracking_number }}</strong></p>
@endif
<p>Anda dapat melihat detail pesanan terbaru melalui akun Larisdy Anda.</p>
