// @ts-nocheck
"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  User,
  DollarSign,
  Calendar,
} from "lucide-react";
import useUser from "@/utils/useUser";
import useUserPermissions from "@/hooks/useUserPermissions";

export default function PaymentsAdmin() {
  const { data: user } = useUser();
  const { isAdmin } = useUserPermissions();
  const queryClient = useQueryClient();

  const resolvedRole = String(user?.user_role ?? user?.role ?? "")
    .trim()
    .toLowerCase();

  const hasAdminAccess = Boolean(isAdmin || resolvedRole === "admin");
  const authResolved = user !== undefined && user !== null;

  const [selectedUserId, setSelectedUserId] = useState("");
  const [subscriptionDays, setSubscriptionDays] = useState(30);
  const [selectedPlan, setSelectedPlan] = useState("premium");
  const [lookupEmail, setLookupEmail] = useState("");

  const {
    data: transactionsData,
    isLoading: transactionsLoading,
    refetch: refetchTransactions,
  } = useQuery({
    queryKey: ["paymentTransactions"],
    queryFn: async () => {
      const response = await fetch("/api/admin/transactions", {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch transactions");
      }

      return response.json();
    },
    enabled: Boolean(authResolved && hasAdminAccess),
  });

  const transactions = transactionsData?.transactions || [];

  const lookupUserMutation = useMutation({
    mutationFn: async (email) => {
      const response = await fetch(
        `/api/payment/verify?email=${encodeURIComponent(email)}`,
        {
          method: "GET",
        },
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || "Failed to find user");
      }

      return data;
    },
  });

  const upgradeUserMutation = useMutation({
    mutationFn: async ({ userId, days, plan }) => {
      const response = await fetch("/api/payment/verify", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: parseInt(userId, 10),
          subscriptionDays: Number(days) || 30,
          plan,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to upgrade user");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["paymentTransactions"] });
      setSelectedUserId("");
      setSubscriptionDays(30);
      setSelectedPlan("premium");
    },
  });

  const handleLookupUser = async (e) => {
    e.preventDefault();

    if (!lookupEmail.trim()) return;

    try {
      await lookupUserMutation.mutateAsync(lookupEmail.trim());
    } catch (error) {
      // handled by mutation state
    }
  };

  const handleManualUpgrade = (e) => {
    e.preventDefault();

    if (!selectedUserId) return;

    const prettyPlan = selectedPlan === "silver" ? "Silver" : "Premium";

    const ok = window.confirm(
      `Upgrade user ID ${selectedUserId} to ${prettyPlan} for ${subscriptionDays} days?`,
    );

    if (!ok) return;

    upgradeUserMutation.mutate({
      userId: selectedUserId,
      days: subscriptionDays,
      plan: selectedPlan,
    });
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "successful":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "processing_failed":
      case "user_not_found":
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Clock className="h-5 w-5 text-yellow-500" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "successful":
        return "bg-green-100 text-green-800";
      case "processing_failed":
      case "user_not_found":
        return "bg-red-100 text-red-800";
      default:
        return "bg-yellow-100 text-yellow-800";
    }
  };

  const formatAmount = (amount) => {
    const num = Number(amount);
    if (!Number.isFinite(num)) return "N/A";
    return `$${num.toFixed(2)}`;
  };

  if (!authResolved) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto text-gray-400 mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Loading...</h1>
          <p className="text-gray-600">Checking admin access</p>
        </div>
      </div>
    );
  }

  if (!hasAdminAccess) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Access Denied
          </h1>
          <p className="text-gray-600">Admin access required</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Payment Administration
          </h1>
          <p className="text-gray-600">
            Manage payment transactions and user upgrades
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <User className="h-5 w-5 mr-2" />
            Find User by Email
          </h2>

          <form
            onSubmit={handleLookupUser}
            className="flex flex-wrap items-end gap-4"
          >
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                User Email
              </label>
              <input
                type="email"
                value={lookupEmail}
                onChange={(e) => setLookupEmail(e.target.value)}
                className="w-72 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter user email"
                required
              />
            </div>

            <button
              type="submit"
              disabled={lookupUserMutation.isPending || !lookupEmail.trim()}
              className="px-6 py-2 bg-gray-900 text-white rounded-md hover:bg-black disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {lookupUserMutation.isPending ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <User className="h-4 w-4" />
              )}
              <span>Find User</span>
            </button>
          </form>

          {lookupUserMutation.error && (
            <div className="mt-4 p-3 bg-red-100 border border-red-200 text-red-700 rounded-md">
              {lookupUserMutation.error.message}
            </div>
          )}

          {lookupUserMutation.data?.user && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
              <div className="text-sm font-semibold text-gray-900 mb-2">
                User found
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-gray-700">
                <div>
                  <span className="font-medium">User ID:</span>{" "}
                  {lookupUserMutation.data.user.id}
                </div>
                <div>
                  <span className="font-medium">Email:</span>{" "}
                  {lookupUserMutation.data.user.email || "N/A"}
                </div>
                <div>
                  <span className="font-medium">Role:</span>{" "}
                  {lookupUserMutation.data.user.user_role || "N/A"}
                </div>
                <div>
                  <span className="font-medium">Subscription:</span>{" "}
                  {lookupUserMutation.data.user.subscription_status || "N/A"}
                </div>
                <div className="sm:col-span-2">
                  <span className="font-medium">Expires:</span>{" "}
                  {lookupUserMutation.data.user.subscription_expires_at
                    ? new Date(
                        lookupUserMutation.data.user.subscription_expires_at,
                      ).toLocaleString()
                    : "N/A"}
                </div>
              </div>

              <button
                type="button"
                onClick={() =>
                  setSelectedUserId(String(lookupUserMutation.data.user.id))
                }
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Use This ID
              </button>
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <User className="h-5 w-5 mr-2" />
            Manual User Upgrade
          </h2>

          <form
            onSubmit={handleManualUpgrade}
            className="flex flex-wrap items-end gap-4"
          >
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                User ID
              </label>
              <input
                type="number"
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="w-32 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter ID"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Subscription Days
              </label>
              <input
                type="number"
                value={subscriptionDays}
                onChange={(e) =>
                  setSubscriptionDays(Number(e.target.value) || 1)
                }
                className="w-32 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="1"
                max="365"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Plan
              </label>
              <select
                value={selectedPlan}
                onChange={(e) => setSelectedPlan(e.target.value)}
                className="w-40 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="silver">Silver</option>
                <option value="premium">Premium</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={upgradeUserMutation.isPending || !selectedUserId}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {upgradeUserMutation.isPending ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <DollarSign className="h-4 w-4" />
              )}
              <span>Upgrade User</span>
            </button>
          </form>

          {upgradeUserMutation.error && (
            <div className="mt-4 p-3 bg-red-100 border border-red-200 text-red-700 rounded-md">
              {upgradeUserMutation.error.message}
            </div>
          )}

          {upgradeUserMutation.isSuccess && (
            <div className="mt-4 p-3 bg-green-100 border border-green-200 text-green-700 rounded-md">
              <div>
                {upgradeUserMutation.data?.message ||
                  "User upgraded successfully!"}
              </div>
              {upgradeUserMutation.data?.expiresAt ? (
                <div className="text-xs mt-1">
                  Expires:{" "}
                  {new Date(
                    upgradeUserMutation.data.expiresAt,
                  ).toLocaleString()}
                </div>
              ) : null}
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center">
              <Calendar className="h-5 w-5 mr-2" />
              Recent Transactions
            </h2>

            <button
              type="button"
              onClick={() => refetchTransactions()}
              className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 flex items-center space-x-2"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Refresh</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            {transactionsLoading ? (
              <div className="p-8 text-center">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto text-gray-400 mb-4" />
                <p className="text-gray-600">Loading transactions...</p>
              </div>
            ) : transactions.length > 0 ? (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Transaction ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                  </tr>
                </thead>

                <tbody className="bg-white divide-y divide-gray-200">
                  {transactions.map((transaction) => (
                    <tr key={transaction.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(transaction.status)}
                          <span
                            className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(
                              transaction.status,
                            )}`}
                          >
                            {transaction.status}
                          </span>
                        </div>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                        {transaction.transaction_id || "N/A"}
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ID: {transaction.user_id || "N/A"}
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {transaction.customer_email || "N/A"}
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatAmount(transaction.amount)}
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {transaction.created_at
                          ? new Date(transaction.created_at).toLocaleString()
                          : "N/A"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-8 text-center">
                <p className="text-gray-600">No transactions found</p>
              </div>
            )}
          </div>
        </div>

        <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-yellow-800 mb-4">
            Environment Setup
          </h3>

          <div className="text-sm text-yellow-700">
            <p className="mb-2">Required environment variable:</p>

            <code className="bg-yellow-100 px-2 py-1 rounded font-mono text-xs">
              PAYSTACK_SECRET_KEY=********
            </code>

            <p className="mt-4 text-xs">
              Configure Paystack webhook URL:{" "}
              <code className="bg-yellow-100 px-1 rounded">
                [your-domain]/api/payment/paystack-webhook
              </code>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
