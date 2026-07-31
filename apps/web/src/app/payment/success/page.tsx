// @ts-nocheck
"use client";

import { useEffect, useState } from "react";
import { CheckCircle, Loader2, AlertCircle } from "lucide-react";
import useUser from "@/utils/useUser";
import useUserPermissions from "@/hooks/useUserPermissions";

export default function PaymentSuccess() {
  const { data: user, refetch: refetchUser } = useUser();
  const { isPremium, refetch: refetchPermissions } = useUserPermissions();
  const [verificationStatus, setVerificationStatus] = useState("verifying"); // verifying, success, error
  const [message, setMessage] = useState("Verifying your payment...");

  // Get transaction details from URL parameters using browser APIs
  const [urlParams, setUrlParams] = useState({});

  useEffect(() => {
    // Extract URL parameters on client side
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      setUrlParams({
        transactionId: params.get("transaction_id") || params.get("ref"),
        customerEmail: params.get("email"),
      });
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    const verifyPayment = async () => {
      try {
        // First, refetch user data to check if already upgraded
        await refetchUser();
        await refetchPermissions();

        // Small delay to ensure data is fresh
        setTimeout(async () => {
          if (!isMounted) return;

          // Check if user is now premium
          const updatedUser = await refetchUser();
          const updatedPermissions = await refetchPermissions();

          if (updatedPermissions?.isPremium) {
            setVerificationStatus("success");
            setMessage(
              "Payment successful! Your account has been upgraded to Premium.",
            );
            return;
          }

          // If not automatically upgraded and we have transaction details, verify manually
          if (
            urlParams.transactionId ||
            (urlParams.customerEmail && user?.email)
          ) {
            const verifyResponse = await fetch("/api/payment/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                transactionId: urlParams.transactionId,
                email: urlParams.customerEmail || user?.email,
              }),
            });

            if (verifyResponse.ok) {
              const verifyData = await verifyResponse.json();

              if (verifyData.verified) {
                setVerificationStatus("success");
                setMessage(
                  "Payment verified! Your account will be upgraded shortly. Please refresh the page in a moment.",
                );

                // Refresh user data after a few seconds
                setTimeout(() => {
                  refetchUser();
                  refetchPermissions();
                }, 3000);
              } else {
                setVerificationStatus("error");
                setMessage(
                  "Payment verification failed. Please contact support if you completed the payment.",
                );
              }
            } else {
              throw new Error("Verification request failed");
            }
          } else {
            // No transaction details available, just wait and check status
            setVerificationStatus("success");
            setMessage(
              "Payment received! Your account upgrade may take a few moments to process. Please check your account status.",
            );
          }
        }, 2000);
      } catch (error) {
        console.error("Payment verification error:", error);
        if (isMounted) {
          setVerificationStatus("error");
          setMessage(
            "Unable to verify payment at this time. If you completed the payment, your account will be upgraded automatically within a few minutes.",
          );
        }
      }
    };

    // Only verify if user is logged in and URL params are loaded
    if (user && Object.keys(urlParams).length > 0) {
      verifyPayment();
    } else if (user && Object.keys(urlParams).length === 0) {
      // Wait for URL params to be extracted
      setTimeout(() => {
        if (Object.keys(urlParams).length === 0) {
          verifyPayment(); // Proceed without URL params
        }
      }, 1000);
    } else if (!user) {
      setVerificationStatus("error");
      setMessage("Please sign in to complete your upgrade process.");
    }

    // Cleanup function
    return () => {
      isMounted = false;
    };
  }, [user, urlParams, refetchUser, refetchPermissions]);

  const getStatusIcon = () => {
    switch (verificationStatus) {
      case "verifying":
        return <Loader2 className="h-16 w-16 text-blue-500 animate-spin" />;
      case "success":
        return <CheckCircle className="h-16 w-16 text-green-500" />;
      case "error":
        return <AlertCircle className="h-16 w-16 text-red-500" />;
      default:
        return <Loader2 className="h-16 w-16 text-blue-500 animate-spin" />;
    }
  };

  const getStatusColor = () => {
    switch (verificationStatus) {
      case "verifying":
        return "text-blue-600";
      case "success":
        return "text-green-600";
      case "error":
        return "text-red-600";
      default:
        return "text-blue-600";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="mb-6 flex justify-center">{getStatusIcon()}</div>

        <h1 className={`text-2xl font-bold mb-4 ${getStatusColor()}`}>
          {verificationStatus === "verifying"
            ? "Processing Payment"
            : verificationStatus === "success"
              ? "Payment Successful!"
              : "Payment Status"}
        </h1>

        <p className="text-gray-600 mb-8 leading-relaxed">{message}</p>

        {/* Transaction Details */}
        {(urlParams.transactionId || urlParams.customerEmail) && (
          <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left text-sm">
            <h3 className="font-semibold text-gray-800 mb-2">
              Transaction Details:
            </h3>
            {urlParams.transactionId && (
              <p className="text-gray-600">
                <span className="font-medium">ID:</span>{" "}
                {urlParams.transactionId}
              </p>
            )}
            {urlParams.customerEmail && (
              <p className="text-gray-600">
                <span className="font-medium">Email:</span>{" "}
                {urlParams.customerEmail}
              </p>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            onClick={() => {
              refetchUser();
              refetchPermissions();
              setVerificationStatus("verifying");
              setMessage("Checking account status...");

              setTimeout(() => {
                window.location.href = "/";
              }, 1000);
            }}
            className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Return to Dashboard
          </button>

          {verificationStatus === "error" && (
            <button
              onClick={() => {
                setVerificationStatus("verifying");
                setMessage("Retrying verification...");
                window.location.reload();
              }}
              className="w-full bg-gray-600 text-white py-3 px-6 rounded-lg hover:bg-gray-700 transition-colors font-medium"
            >
              Retry Verification
            </button>
          )}
        </div>

        {/* Support Information */}
        <div className="mt-8 pt-6 border-t border-gray-200 text-sm text-gray-500">
          <p>
            Having issues? Contact support with your transaction ID for
            assistance.
          </p>
        </div>
      </div>
    </div>
  );
}
