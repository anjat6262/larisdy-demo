<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('business_profiles', function (Blueprint $table): void {
            $table->id();
            $table->string('company_name');
            $table->text('history');
            $table->text('vision');
            $table->json('missions');
            $table->string('support_email');
            $table->string('support_phone', 50);
            $table->text('address');
            $table->string('hero_title');
            $table->text('hero_subtitle');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('business_profiles');
    }
};
