<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BusinessProfile;
use Illuminate\Http\JsonResponse;

class BusinessProfileController extends Controller
{
    public function show(): JsonResponse
    {
        return response()->json([
            'data' => BusinessProfile::query()->latest()->first(),
        ]);
    }
}
