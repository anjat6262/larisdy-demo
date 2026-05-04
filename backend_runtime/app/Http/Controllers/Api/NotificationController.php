<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Notification;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $limit = min(max((int) $request->input('limit', 20), 1), 50);
        $query = $this->visibleNotifications($request);

        return response()->json([
            'data' => (clone $query)->latest()->limit($limit)->get(),
            'meta' => [
                'unread_count' => (clone $query)->whereNull('read_at')->count(),
            ],
        ]);
    }

    public function unreadCount(Request $request): JsonResponse
    {
        return response()->json([
            'data' => [
                'unread_count' => $this->visibleNotifications($request)->whereNull('read_at')->count(),
            ],
        ]);
    }

    public function read(Request $request, int $notification): JsonResponse
    {
        $notificationModel = $this->visibleNotifications($request)->findOrFail($notification);

        if (! $notificationModel->read_at) {
            $notificationModel->update([
                'read_at' => now(),
            ]);
        }

        return response()->json([
            'message' => 'Notifikasi ditandai sudah dibaca.',
            'data' => $notificationModel->fresh(),
        ]);
    }

    public function readAll(Request $request): JsonResponse
    {
        $this->visibleNotifications($request)
            ->whereNull('read_at')
            ->update([
                'read_at' => now(),
                'updated_at' => now(),
            ]);

        return response()->json([
            'message' => 'Semua notifikasi ditandai sudah dibaca.',
            'data' => [
                'unread_count' => 0,
            ],
        ]);
    }

    private function visibleNotifications(Request $request): Builder
    {
        $user = $request->user();

        return Notification::query()
            ->where(function (Builder $query) use ($user): void {
                $query->where('user_id', $user->id);

                if ($user->isAdmin()) {
                    $query->orWhere(function (Builder $adminQuery): void {
                        $adminQuery
                            ->whereNull('user_id')
                            ->where('role_target', User::ROLE_ADMIN);
                    });
                }
            })
            ->where(function (Builder $query) use ($user): void {
                $query
                    ->whereNull('role_target')
                    ->orWhere('role_target', $user->role);
            });
    }
}
