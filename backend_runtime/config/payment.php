<?php

return [
    'provider' => env('PAYMENT_PROVIDER', 'midtrans'),
    'frontend_url' => env('FRONTEND_URL', 'http://127.0.0.1:5173'),

    'midtrans' => [
        'server_key' => env('MIDTRANS_SERVER_KEY'),
        'client_key' => env('MIDTRANS_CLIENT_KEY'),
        'is_production' => (bool) env('MIDTRANS_IS_PRODUCTION', false),
        'expiry_duration' => (int) env('MIDTRANS_EXPIRY_HOURS', 24),
        'virtual_account_banks' => array_values(array_filter(array_map(
            static fn ($value): string => trim($value),
            explode(',', (string) env('MIDTRANS_VA_BANKS', 'bca_va,bni_va,bri_va,permata_va,mandiri_bill'))
        ))),
    ],

    'manual_bank_accounts' => [
        'bca' => [
            'bank_name' => env('BCA_BANK_NAME', 'BCA'),
            'account_number' => env('BCA_ACCOUNT_NUMBER', '1234567890'),
            'account_name' => env('BCA_ACCOUNT_NAME', 'Larisdy'),
        ],
    ],
];
