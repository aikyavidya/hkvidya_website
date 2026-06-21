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

interface FormErrors {
  fullName?: string;
  email?: string;
  phone?: string;
  areaOfStay?: string;
  pan?: string;
  flatHouseApartment?: string;
  streetAreaLocality?: string;
  pincode?: string;
  city?: string;
  state?: string;
  country?: string;
  locality?: string;
}

const validateEmail = (email: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const validatePhone = (phone: string) =>
  /^[6-9]\d{9}$/.test(phone);

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

  const [localityOptions, setLocalityOptions] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    areaOfStay: "",
    pan: "",
    flatHouseApartment: "",
    streetAreaLocality: "",
    pincode: "",
    city: "",
    state: "",
    country: "",
    locality: "",
  });
  const [wants80G, setWants80G] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const fetchPincodeDetails = async (pincode: string) => {
    if (!/^\d{6}$/.test(pincode)) return;
    try {
      const res = await fetch(`https://api.postalpincode.in/pincode/${pincode}`);
      const data = await res.json();
      if (data[0].Status === "Success") {
        const postOffices = data[0].PostOffice;
        const areaNames = postOffices.map((po: any) => po.Name);
        setLocalityOptions(areaNames);
        const postOffice = postOffices[0];
        handleInputChange("state", postOffice.State);
        handleInputChange("city", postOffice.District);
        handleInputChange("country", "India");
        handleInputChange("locality", areaNames[0]);
      }
    } catch {
      console.error("Pincode lookup failed");
    }
  };

  const validateStep2 = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.fullName.trim())
      newErrors.fullName = "Full name is required";
    else if (formData.fullName.trim().length < 2)
      newErrors.fullName = "Full name must be at least 2 characters";

    if (!formData.email.trim())
      newErrors.email = "Email is required";
    else if (!validateEmail(formData.email))
      newErrors.email = "Please enter a valid email address";

    if (!formData.phone.trim())
      newErrors.phone = "Phone number is required";
    else if (!validatePhone(formData.phone))
      newErrors.phone = "Please enter a valid 10-digit mobile number starting with 6, 7, 8, or 9";

    if (!formData.areaOfStay.trim())
      newErrors.areaOfStay = "Area of stay is required";
    else if (formData.areaOfStay.trim().length < 2)
      newErrors.areaOfStay = "Please enter a valid area name";

    if (wants80G && totalAmount >= 500) {
      if (!formData.pan.trim())
        newErrors.pan = "PAN is required for 80G tax exemption";
      else if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(formData.pan.toUpperCase()))
        newErrors.pan = "Please enter a valid PAN (e.g., ABCDE1234F)";

      if (!formData.flatHouseApartment.trim())
        newErrors.flatHouseApartment = "This field is required";
      if (!formData.streetAreaLocality.trim())
        newErrors.streetAreaLocality = "This field is required";
      if (!formData.pincode.trim())
        newErrors.pincode = "Pincode is required";
      else if (!/^\d{6}$/.test(formData.pincode))
        newErrors.pincode = "Pincode must be 6 digits";
      if (!formData.city.trim())
        newErrors.city = "City is required";
      if (!formData.state)
        newErrors.state = "Please select a State / UT";
      if (!formData.country.trim())
        newErrors.country = "Country is required";
      if (!formData.locality)
        newErrors.locality = "Please select a Locality / Area";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
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
          areaOfStay: formData.areaOfStay,
          addressLine1: formData.flatHouseApartment,
          addressLine2: formData.streetAreaLocality,
          pincode: formData.pincode,
          city: formData.city,
          locality: formData.locality,
          state: formData.state,
          country: formData.country,
          wants80G: wants80G,
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
        name: "HK Vidya",
        description: "Monthly Donation",
        prefill: {
          name: formData.fullName,
          email: formData.email,
          contact: formData.phone
        },
        hidden: {
          contact: true,
          email: true
        },
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
        name: "HK Vidya",
        description: "Monthly Donation",
        method: {
          upi: true,
          card: false,
          netbanking: false,
          wallet: false,
          paylater: false,
        },
        prefill: {
          name: formData.fullName,
          email: formData.email,
          contact: formData.phone
        },
        hidden: {
          contact: true,
          email: true
        },
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

            {/* Row 1 & 2 */}
            {/* Row 1 & 2 */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Row 1 */}
              <div>
                <label className="block text-sm font-medium mb-1">
                  Full Name<span className="text-[#D32F2F]">*</span>
                </label>
                <div className="relative">
                  <Input
                    placeholder="Your full name"
                    value={formData.fullName}
                    onChange={(e) => handleInputChange("fullName", e.target.value)}
                    className={errors.fullName ? "border-2 border-[#D32F2F] pr-8" : ""}
                  />
                  {errors.fullName && (
                    <span className="absolute right-3 top-[50%] -translate-y-1/2 flex items-center justify-center w-5 h-5 rounded-full border-2 border-[#D32F2F] bg-white text-[#D32F2F] text-xs font-bold pointer-events-none" style={{ top: '20px' }}>
                      !
                    </span>
                  )}
                </div>
                {errors.fullName && (
                  <p className="text-red-600 text-sm mt-1">{errors.fullName}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Phone<span className="text-[#D32F2F]">*</span>
                </label>
                <div className="relative">
                  <Input
                    type="tel"
                    placeholder="10-digit mobile number"
                    value={formData.phone}
                    onChange={(e) => handleInputChange("phone", e.target.value)}
                    maxLength={10}
                    className={errors.phone ? "border-2 border-[#D32F2F] pr-8" : ""}
                  />
                  {errors.phone && (
                    <span className="absolute right-3 top-[50%] -translate-y-1/2 flex items-center justify-center w-5 h-5 rounded-full border-2 border-[#D32F2F] bg-white text-[#D32F2F] text-xs font-bold pointer-events-none" style={{ top: '20px' }}>
                      !
                    </span>
                  )}
                </div>
                {errors.phone && (
                  <p className="text-red-600 text-sm mt-1">{errors.phone}</p>
                )}
              </div>

              {/* Row 2 */}
              <div>
                <label className="block text-sm font-medium mb-1">
                  Email<span className="text-[#D32F2F]">*</span>
                </label>
                <div className="relative">
                  <Input
                    type="email"
                    placeholder="your@email.com"
                    value={formData.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                    className={errors.email ? "border-2 border-[#D32F2F] pr-8" : ""}
                  />
                  {errors.email && (
                    <span className="absolute right-3 top-[50%] -translate-y-1/2 flex items-center justify-center w-5 h-5 rounded-full border-2 border-[#D32F2F] bg-white text-[#D32F2F] text-xs font-bold pointer-events-none" style={{ top: '20px' }}>
                      !
                    </span>
                  )}
                </div>
                {errors.email && (
                  <p className="text-red-600 text-sm mt-1">{errors.email}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Area of Stay<span className="text-[#D32F2F]">*</span>
                </label>
                <div className="relative">
                  <Input
                    placeholder="Your city or area"
                    value={formData.areaOfStay}
                    onChange={(e) => handleInputChange("areaOfStay", e.target.value)}
                    className={errors.areaOfStay ? "border-2 border-[#D32F2F] pr-8" : ""}
                  />
                  {errors.areaOfStay && (
                    <span className="absolute right-3 top-[50%] -translate-y-1/2 flex items-center justify-center w-5 h-5 rounded-full border-2 border-[#D32F2F] bg-white text-[#D32F2F] text-xs font-bold pointer-events-none" style={{ top: '20px' }}>
                      !
                    </span>
                  )}
                </div>
                {errors.areaOfStay && (
                  <p className="text-red-600 text-sm mt-1">{errors.areaOfStay}</p>
                )}
              </div>
            </div>

            {/* Row 3: Display category and amount */}
            <div className="mt-8 bg-muted/50 p-4 rounded-lg border">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Selected Plan</p>
                  <p className="font-semibold">{currentTier?.label}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Amount</p>
                  <p className="font-semibold">₹{totalAmount}/month</p>
                </div>
              </div>
            </div>

            {/* Row 4: Checkbox & Conditional Address */}
            {(selectedTier !== "custom" || customAmount >= 500) && (
              <div className="mt-6">
                <label className={`flex items-center gap-2 ${totalAmount < 500 ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}>
                  <input
                    type="checkbox"
                    checked={wants80G}
                    onChange={(e) => setWants80G(e.target.checked)}
                    disabled={totalAmount < 500}
                    className="w-4 h-4 rounded border-gray-300 text-orange-500 focus:ring-orange-500"
                  />
                  <span className="text-sm font-medium">AFG 80G Tax Exemption available for ₹500 or more</span>
                </label>

                {totalAmount < 500 && (
                  <p className="text-xs text-red-500 mt-1 ml-6">Minimum donation of ₹500 required for 80G exemption.</p>
                )}

                {wants80G && totalAmount >= 500 && (
                  <div className="mt-6 space-y-4">

                    {/* Row 1: PAN | Address Line 1 */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          PAN<span className="text-[#D32F2F]">*</span>
                        </label>
                        <div className="relative">
                          <Input
                            placeholder="e.g. ABCDE1234F"
                            value={formData.pan}
                            onChange={(e) => handleInputChange("pan", e.target.value)}
                            className={`uppercase ${errors.pan ? "border-2 border-[#D32F2F] pr-8" : ""}`}
                          />
                          {errors.pan && (
                            <span className="absolute right-3 top-[50%] -translate-y-1/2 flex items-center justify-center w-5 h-5 rounded-full border-2 border-[#D32F2F] bg-white text-[#D32F2F] text-xs font-bold pointer-events-none" style={{ top: '20px' }}>!</span>
                          )}
                        </div>
                        {errors.pan && <p className="text-red-600 text-sm mt-1">{errors.pan}</p>}
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Address Line 1<span className="text-[#D32F2F]">*</span>
                        </label>
                        <div className="relative">
                          <Input
                            placeholder="House / Apartment / Building No."
                            value={formData.flatHouseApartment}
                            onChange={(e) => handleInputChange("flatHouseApartment", e.target.value)}
                            className={errors.flatHouseApartment ? "border-2 border-[#D32F2F] pr-8" : ""}
                          />
                          {errors.flatHouseApartment && (
                            <span className="absolute right-3 top-[50%] -translate-y-1/2 flex items-center justify-center w-5 h-5 rounded-full border-2 border-[#D32F2F] bg-white text-[#D32F2F] text-xs font-bold pointer-events-none" style={{ top: '20px' }}>
                              !
                            </span>
                          )}
                        </div>
                        {errors.flatHouseApartment && (
                          <p className="text-red-600 text-sm mt-1">{errors.flatHouseApartment}</p>
                        )}
                      </div>
                    </div>

                    {/* Row 2: Address Line 2 | PIN Code */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Address Line 2<span className="text-[#D32F2F]">*</span>
                        </label>
                        <div className="relative">
                          <Input
                            placeholder="Street / Area / Locality"
                            value={formData.streetAreaLocality}
                            onChange={(e) => handleInputChange("streetAreaLocality", e.target.value)}
                            className={errors.streetAreaLocality ? "border-2 border-[#D32F2F] pr-8" : ""}
                          />
                          {errors.streetAreaLocality && (
                            <span className="absolute right-3 top-[50%] -translate-y-1/2 flex items-center justify-center w-5 h-5 rounded-full border-2 border-[#D32F2F] bg-white text-[#D32F2F] text-xs font-bold pointer-events-none" style={{ top: '20px' }}>
                              !
                            </span>
                          )}
                        </div>
                        {errors.streetAreaLocality && (
                          <p className="text-red-600 text-sm mt-1">{errors.streetAreaLocality}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-1">
                          PIN Code<span className="text-[#D32F2F]">*</span>
                        </label>
                        <div className="relative">
                          <Input
                            placeholder="6-digit PIN code"
                            value={formData.pincode}
                            onChange={(e) => {
                              handleInputChange("pincode", e.target.value);
                              fetchPincodeDetails(e.target.value);
                            }}
                            className={errors.pincode ? "border-2 border-[#D32F2F] pr-8" : ""}
                          />
                          {errors.pincode && (
                            <span className="absolute right-3 top-[50%] -translate-y-1/2 flex items-center justify-center w-5 h-5 rounded-full border-2 border-[#D32F2F] bg-white text-[#D32F2F] text-xs font-bold pointer-events-none" style={{ top: '20px' }}>
                              !
                            </span>
                          )}
                        </div>
                        {errors.pincode && (
                          <p className="text-red-600 text-sm mt-1">{errors.pincode}</p>
                        )}
                      </div>
                    </div>

                    {/* Row 3: City | Locality/Area */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          City<span className="text-[#D32F2F]">*</span>
                        </label>
                        <div className="relative">
                          <Input
                            placeholder="City name"
                            value={formData.city}
                            onChange={(e) => handleInputChange("city", e.target.value)}
                            className={errors.city ? "border-2 border-[#D32F2F] pr-8" : ""}
                          />
                          {errors.city && (
                            <span className="absolute right-3 top-[50%] -translate-y-1/2 flex items-center justify-center w-5 h-5 rounded-full border-2 border-[#D32F2F] bg-white text-[#D32F2F] text-xs font-bold pointer-events-none" style={{ top: '20px' }}>
                              !
                            </span>
                          )}
                        </div>
                        {errors.city && (
                          <p className="text-red-600 text-sm mt-1">{errors.city}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Locality/Area<span className="text-[#D32F2F]">*</span>
                        </label>
                        <div className="relative">
                          <select
                            value={formData.locality}
                            onChange={(e) => handleInputChange("locality", e.target.value)}
                            className={`w-full px-4 py-2 rounded-md border focus:outline-none bg-white text-sm ${errors.locality ? 'border-2 border-[#D32F2F] pr-10' : 'border-gray-300'}`}
                          >
                            {localityOptions.length === 0 ? (
                              <option value="">Select Locality / Area</option>
                            ) : (
                              localityOptions.map((area) => (
                                <option key={area} value={area}>{area}</option>
                              ))
                            )}
                          </select>
                          {errors.locality && (
                            <span className="absolute right-8 top-1/2 -translate-y-1/2 flex items-center justify-center w-5 h-5 rounded-full border-2 border-[#D32F2F] bg-white text-[#D32F2F] text-xs font-bold pointer-events-none">!</span>
                          )}
                        </div>
                        {errors.locality && <p className="text-red-600 text-sm mt-1">{errors.locality}</p>}
                      </div>
                    </div>

                    {/* Row 4: State | Country */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          State<span className="text-[#D32F2F]">*</span>
                        </label>
                        <div className="relative">
                          <select
                            name="state"
                            value={formData.state}
                            onChange={(e) => {
                              e.target.classList.remove("text-muted-foreground");
                              handleInputChange("state", e.target.value);
                            }}
                            className={`w-full px-4 py-2 rounded-md border focus:outline-none bg-white text-muted-foreground text-sm ${errors.state ? 'border-2 border-[#D32F2F] pr-10' : 'border-gray-300'}`}
                          >
                            <option value="">Select State / UT</option>
                            <option value="Andaman and Nicobar Islands">Andaman and Nicobar Islands</option>
                            <option value="Andhra Pradesh">Andhra Pradesh</option>
                            <option value="Arunachal Pradesh">Arunachal Pradesh</option>
                            <option value="Assam">Assam</option>
                            <option value="Bihar">Bihar</option>
                            <option value="Chandigarh">Chandigarh</option>
                            <option value="Chhattisgarh">Chhattisgarh</option>
                            <option value="Dadra and Nagar Haveli and Daman and Diu">Dadra and Nagar Haveli and Daman and Diu</option>
                            <option value="Delhi">Delhi</option>
                            <option value="Goa">Goa</option>
                            <option value="Gujarat">Gujarat</option>
                            <option value="Haryana">Haryana</option>
                            <option value="Himachal Pradesh">Himachal Pradesh</option>
                            <option value="Jammu and Kashmir">Jammu and Kashmir</option>
                            <option value="Jharkhand">Jharkhand</option>
                            <option value="Karnataka">Karnataka</option>
                            <option value="Kerala">Kerala</option>
                            <option value="Ladakh">Ladakh</option>
                            <option value="Lakshadweep">Lakshadweep</option>
                            <option value="Madhya Pradesh">Madhya Pradesh</option>
                            <option value="Maharashtra">Maharashtra</option>
                            <option value="Manipur">Manipur</option>
                            <option value="Meghalaya">Meghalaya</option>
                            <option value="Mizoram">Mizoram</option>
                            <option value="Nagaland">Nagaland</option>
                            <option value="Odisha">Odisha</option>
                            <option value="Puducherry">Puducherry</option>
                            <option value="Punjab">Punjab</option>
                            <option value="Rajasthan">Rajasthan</option>
                            <option value="Sikkim">Sikkim</option>
                            <option value="Tamil Nadu">Tamil Nadu</option>
                            <option value="Telangana">Telangana</option>
                            <option value="Tripura">Tripura</option>
                            <option value="Uttar Pradesh">Uttar Pradesh</option>
                            <option value="Uttarakhand">Uttarakhand</option>
                            <option value="West Bengal">West Bengal</option>
                          </select>
                          {errors.state && (
                            <span className="absolute right-8 top-1/2 -translate-y-1/2 flex items-center justify-center w-5 h-5 rounded-full border-2 border-[#D32F2F] bg-white text-[#D32F2F] text-xs font-bold pointer-events-none">!</span>
                          )}
                        </div>
                        {errors.state && (
                          <p className="text-red-600 text-sm mt-1">{errors.state}</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Country<span className="text-[#D32F2F]">*</span>
                        </label>
                        <div className="relative">
                          <Input
                            placeholder="Country name"
                            value={formData.country}
                            onChange={(e) => handleInputChange("country", e.target.value)}
                            className={errors.country ? "border-2 border-[#D32F2F] pr-8" : ""}
                          />
                          {errors.country && (
                            <span className="absolute right-3 top-[50%] -translate-y-1/2 flex items-center justify-center w-5 h-5 rounded-full border-2 border-[#D32F2F] bg-white text-[#D32F2F] text-xs font-bold pointer-events-none" style={{ top: '20px' }}>
                              !
                            </span>
                          )}
                        </div>
                        {errors.country && (
                          <p className="text-red-600 text-sm mt-1">{errors.country}</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-4 mt-8">
              <Button variant="outline" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button onClick={() => { if (validateStep2()) setStep(3); }}>
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