import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import childReading from "@/assets/child-reading.jpg";
import childrenMeal from "@/assets/children-meal.jpg";
import childrenActivities from "@/assets/children-activities.jpg";

const API_URL = import.meta.env.VITE_API_URL;

const SPONSORSHIP_TIERS = [
  {
    value: "education",
    amount: 800,
    goal: 8000,
    label: "Education",
    image: childReading,
    popular: false,
    includes: ["Quality education", "School supplies", "Academic support"],
  },
  {
    value: "food-education",
    amount: 1000,
    goal: 10000,
    label: "Food & Education",
    image: childrenMeal,
    popular: true,
    includes: ["Nutritious meals", "Education", "Health support"],
  },
  {
    value: "complete",
    amount: 1500,
    goal: 15000,
    label: "Complete Care",
    image: childrenActivities,
    popular: false,
    includes: ["Food", "Education", "Life skills"],
  },
  {
    value: "custom",
    amount: 0,
    goal: 5000,
    label: "Custom Amount",
    image: childReading,
    popular: false,
    includes: ["Choose your own monthly donation"],
  },
];

const DonationForm = ({ mode = "all" }: { mode?: "all" | "upi" }) => {
  const [step, setStep] = useState(1);
  const [selectedTier, setSelectedTier] = useState("food-education");
  const [numberOfChildren, setNumberOfChildren] = useState(1);
  const [customAmount, setCustomAmount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    pan: "",
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const currentTier = SPONSORSHIP_TIERS.find((t) => t.value === selectedTier);

  const totalAmount =
    selectedTier === "custom"
      ? customAmount
      : (currentTier?.amount || 0) * numberOfChildren;

  /*
  ===========================
  SHARED VERIFY HANDLER
  ===========================
  */

  const buildVerifyHandler = () => async (response: any) => {
    try {
      const verifyRes = await fetch(`${API_URL}/verify-subscription`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          razorpay_payment_id: response.razorpay_payment_id,
          razorpay_subscription_id: response.razorpay_subscription_id,
          razorpay_signature: response.razorpay_signature,
          fullName: formData.fullName,
          email: formData.email,
          phone: formData.phone,
          pan: formData.pan,
          planType: selectedTier,
          childrenCount: numberOfChildren,
          customAmount: selectedTier === "custom" ? customAmount : null,
          amount: totalAmount,
        }),
      });
      const verifyData = await verifyRes.json();
      if (verifyData.success) {
        toast.success("Donation confirmed! Thank you 🙏");
        setStep(4);
      } else {
        toast.error("Payment verification failed. Please contact support.");
      }
    } catch {
      toast.error("Verification error. Please contact support.");
    }
  };

  /*
  ===========================
  BANK AUTOPAY
  ===========================
  */

  const startBankAutoPay = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/create-subscription`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: formData.fullName,
          email: formData.email,
          phone: formData.phone,
          pan: formData.pan,
          planType: selectedTier,
          childrenCount: numberOfChildren,
          customAmount: selectedTier === "custom" ? customAmount : null,
        }),
      });

      const data = await response.json();
      const subscription = data.subscription;

      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID,
        subscription_id: subscription.id,
        order_id: data.order_id,
        name: "HK Vidya",
        description: "Monthly Donation",
        handler: buildVerifyHandler(),
        modal: {
          ondismiss: () => console.log("Checkout closed")
        }
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (error) {
      console.error(error);
      toast.error("Payment failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  /*
  ===========================
  UPI AUTOPAY
  ===========================
  */

  const startUPIAutoPay = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/create-subscription`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: formData.fullName,
          email: formData.email,
          phone: formData.phone,
          pan: formData.pan,
          planType: selectedTier,
          childrenCount: numberOfChildren,
          customAmount: selectedTier === "custom" ? customAmount : null,
        }),
      });

      const data = await response.json();
      const subscription = data.subscription;

      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID,
        subscription_id: subscription.id,
        order_id: data.order_id,
        name: "HK Vidya",
        description: "Monthly Donation",
        handler: buildVerifyHandler(),
        modal: {
          ondismiss: () => console.log("Checkout closed")
        }
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (error) {
      console.error(error);
      toast.error("UPI Payment failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="py-16 bg-background">
      <div className="container max-w-4xl mx-auto px-4">

        {/* STEP 1 — Choose Plan */}
        {step === 1 && (
          <>
            <h2 className="text-2xl font-bold mb-6">Choose Sponsorship Plan</h2>

            <div className="grid md:grid-cols-2 gap-6 mb-6">
              {SPONSORSHIP_TIERS.map((tier) => {
                // TODO: replace raised values with real DB data once Razorpay payments are working
                const raised = 0;
                const progress =
                  tier.goal > 0
                    ? Math.min((raised / tier.goal) * 100, 100)
                    : 0;

                return (
                  <div
                    key={tier.value}
                    onClick={() => setSelectedTier(tier.value)}
                    className={cn(
                      "rounded-xl border-2 overflow-hidden cursor-pointer transition-all",
                      selectedTier === tier.value
                        ? "border-orange-500"
                        : "border-border hover:border-orange-300"
                    )}
                  >
                    {/* Image — full width at top */}
                    <img
                      src={tier.image}
                      alt={tier.label}
                      className="h-40 w-full object-cover"
                    />

                    {/* Card body */}
                    <div className="p-4">
                      {/* Title */}
                      <h3 className="font-bold text-base mb-3">{tier.label}</h3>

                      {/* Progress bar */}
                      <div className="mb-4">
                        <p className="text-xs text-muted-foreground mb-1">
                          ₹{raised.toLocaleString()} / ₹{tier.goal.toLocaleString()}
                        </p>
                        <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${progress}%`,
                              backgroundColor: "#f97316",
                            }}
                          />
                        </div>
                      </div>

                      {/* Bottom row: Amount LEFT — Donate Now button RIGHT */}
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-sm">
                          {tier.value !== "custom"
                            ? `₹${tier.amount}/month`
                            : "Choose Amount"}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedTier(tier.value);
                            setStep(2);
                          }}
                          className="bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
                        >
                          Donate Now
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Number of Children — shown only for non-custom plans */}
            {selectedTier !== "custom" && (
              <div className="mb-6">
                <Label>Number of Children</Label>
                <div className="flex items-center gap-4 mt-2">
                  <button
                    onClick={() =>
                      setNumberOfChildren(Math.max(1, numberOfChildren - 1))
                    }
                    className="px-4 py-2 border rounded"
                  >
                    -
                  </button>
                  <span className="font-bold text-lg">{numberOfChildren}</span>
                  <button
                    onClick={() => setNumberOfChildren(numberOfChildren + 1)}
                    className="px-4 py-2 border rounded"
                  >
                    +
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* STEP 2 — Donor Info */}
        {step === 2 && (
          <>
            <h2 className="text-2xl font-bold mb-6">Your Information</h2>

            {/* Custom amount input — only shown when custom plan selected */}
            {selectedTier === "custom" && (
              <div className="mb-6">
                <Label>Enter Monthly Amount (₹)</Label>
                <Input
                  type="number"
                  min="1"
                  value={customAmount || ""}
                  onChange={(e) => setCustomAmount(Number(e.target.value))}
                  className="mt-2 max-w-xs"
                />
              </div>
            )}

            <div className="grid md:grid-cols-2 gap-6">
              <Input
                placeholder="Full Name"
                value={formData.fullName}
                onChange={(e) => handleInputChange("fullName", e.target.value)}
              />
              <Input
                type="email"
                placeholder="Email"
                value={formData.email}
                onChange={(e) => handleInputChange("email", e.target.value)}
              />
              <Input
                type="tel"
                placeholder="Phone"
                value={formData.phone}
                onChange={(e) => handleInputChange("phone", e.target.value)}
              />
              <Input
                placeholder="PAN (Optional)"
                value={formData.pan}
                onChange={(e) => handleInputChange("pan", e.target.value)}
              />
            </div>

            <div className="flex gap-4 mt-8">
              <Button variant="outline" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button
                onClick={() => setStep(3)}
                disabled={
                  !formData.fullName ||
                  !formData.email ||
                  !formData.phone ||
                  (selectedTier === "custom" && customAmount <= 0)
                }
              >
                Continue
              </Button>
            </div>
          </>
        )}

        {/* STEP 3 — Confirm & Pay */}
        {step === 3 && (
          <>
            <h2 className="text-2xl font-bold mb-4">Confirm Donation</h2>

            <div className="border p-6 rounded-lg mb-6">
              <p>
                <strong>Plan:</strong> {currentTier?.label}
              </p>
              <p>
                <strong>Children:</strong>{" "}
                {selectedTier === "custom" ? "-" : numberOfChildren}
              </p>
              <p>
                <strong>Monthly Amount:</strong> ₹{totalAmount}
              </p>
              <p>
                <strong>Name:</strong> {formData.fullName}
              </p>
            </div>

            <div className="flex gap-4">
              <Button variant="outline" onClick={() => setStep(2)} disabled={isLoading}>
                Back
              </Button>

              {mode === "all" && (
                <Button onClick={startBankAutoPay} disabled={isLoading}>
                  {isLoading ? "Processing..." : "Pay via Card / Netbanking"}
                </Button>
              )}

              {mode === "upi" && (
                <Button
                  onClick={startUPIAutoPay}
                  className="w-full"
                  disabled={isLoading}
                >
                  {isLoading ? "Processing..." : "Donate via UPI"}
                </Button>
              )}
            </div>
          </>
        )}

        {/* STEP 4 — Success */}
        {step === 4 && (
          <div className="text-center py-12">
            <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Thank You!</h2>
            <p className="text-muted-foreground">
              Your monthly donation of ₹{totalAmount} has been set up
              successfully.
            </p>
            <p className="text-sm mt-2">
              You will receive a confirmation email shortly.
            </p>
          </div>
        )}

      </div>
    </section>
  );
};

export default DonationForm;