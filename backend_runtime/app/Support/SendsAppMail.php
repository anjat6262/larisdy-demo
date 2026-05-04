<?php

namespace App\Support;

use Illuminate\Mail\Mailable;
use Illuminate\Support\Facades\Mail;
use Throwable;

trait SendsAppMail
{
    protected function sendMailSilently(string $recipient, Mailable $mailable): void
    {
        try {
            $mailer = $this->shouldUseLocalLogMailerFallback()
                ? Mail::mailer('log')
                : Mail::mailer(config('mail.default'));

            $mailer->to($recipient)->send($mailable);
        } catch (Throwable $exception) {
            report($exception);
        }
    }

    private function shouldUseLocalLogMailerFallback(): bool
    {
        return app()->environment('local')
            && config('mail.default') === 'smtp'
            && config('mail.mailers.smtp.host') === 'mailpit';
    }
}
