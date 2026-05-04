<?php

namespace App\Providers;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\ServiceProvider;
use Throwable;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     *
     * @return void
     */
    public function register()
    {
        //
    }

    /**
     * Bootstrap any application services.
     *
     * @return void
     */
    public function boot()
    {
        if ($this->app->environment('production')) {
            URL::forceScheme('https');
        }

        if (config('database.default') === 'sqlite') {
            try {
                $pdo = DB::connection()->getPdo();
                $pdo->exec('PRAGMA journal_mode = WAL;');
                $pdo->exec('PRAGMA synchronous = NORMAL;');
                $pdo->exec('PRAGMA busy_timeout = 5000;');
            } catch (Throwable $exception) {
                report($exception);
            }
        }
    }
}
