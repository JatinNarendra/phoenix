"use client";
import React, { useState, useRef, useEffect } from "react";
import { FaSpinner, FaUpload } from "react-icons/fa";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import Image from "next/image";

export default function NewCustomerPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [customerName, setCustomerName] = useState("");
  const [slug, setSlug] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  // Auto-generate slug from customer name
  useEffect(() => {
    if (customerName && !slug) {
      const generatedSlug = customerName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-") // Replace special characters with hyphens
        .replace(/^-+|-+$/g, ""); // Remove leading/trailing hyphens
      setSlug(generatedSlug);
    }
  }, [customerName, slug]);

  // Validate and format slug on change
  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "") // Only allow lowercase letters, numbers, and hyphens
      .replace(/-+/g, "-") // Replace multiple hyphens with single hyphen
      .replace(/^-+|-+$/g, ""); // Remove leading/trailing hyphens
    setSlug(value);
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        // 2MB limit
        toast.error("Logo must be less than 2MB");
        return;
      }

      if (!file.type.startsWith("image/")) {
        toast.error("Please upload an image file");
        return;
      }

      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCancel = () => {
    router.back();
  };

  const handleSubmit = async () => {
    if (!customerName.trim()) {
      toast.error("Customer name is required");
      return;
    }

    if (!slug.trim()) {
      toast.error("Slug is required");
      return;
    }

    // Validate slug format
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      toast.error(
        "Invalid slug format. Use only lowercase letters, numbers, and hyphens"
      );
      return;
    }

    // The slug check will be handled by the API

    setIsSubmitting(true);
    try {
      let logoUrl = null;
      if (logoFile) {
        const formData = new FormData();
        formData.append("file", logoFile);

        const uploadResponse = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (!uploadResponse.ok) {
          throw new Error("Failed to upload logo");
        }

        const { url } = await uploadResponse.json();
        logoUrl = url;
      }

      const customerResponse = await fetch("/api/nexus/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: customerName,
          slug: slug.trim(),
          logo_url: logoUrl,
        }),
      });

      if (!customerResponse.ok) throw new Error("Failed to create customer");
      const customer = await customerResponse.json();

      toast.success("Customer created successfully!");
      router.push(`/nexus/${customer.slug}`);
    } catch (error) {
      console.error("Error creating customer:", error);
      toast.error("Failed to create customer");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-6">
      <div className="max-w-2xl mx-auto">
        <header className="border-b border-gray-200/80 pb-4 md:pb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
            Create New Customer
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            Add customer details and their company URLs
          </p>
        </header>

        <form onSubmit={(e) => e.preventDefault()} className="mt-6 space-y-6">
          <div className="space-y-6">
            <label className="block space-y-2">
              <span className="block text-lg font-semibold text-gray-900">
                Company Name
              </span>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 text-gray-900 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 placeholder:text-gray-400"
                placeholder="Enter customer name"
              />
            </label>

            <div className="space-y-2">
              <span className="block text-lg font-semibold text-gray-900">
                Company Logo
              </span>
              <div className="flex flex-col gap-2">
                {logoPreview ? (
                  <Image
                    src={logoPreview}
                    alt="Logo preview"
                    width={128}
                    height={128}
                    className=" inset-0 object-cover rounded-xl"
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full h-32 flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    <FaUpload className="text-2xl text-gray-400 mb-2" />
                    <span className="text-sm text-gray-500">Upload Logo</span>
                  </button>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleLogoChange}
                  className="hidden"
                />
                <p className="text-sm text-gray-500">
                  512x512 recommended, max 2MB
                </p>
              </div>
            </div>
          </div>

          <section className="space-y-4">
            <label className="block space-y-2">
              <span className="block text-lg font-semibold text-gray-900">
                Slug
              </span>
              <input
                type="text"
                value={slug}
                onChange={handleSlugChange}
                className="w-full px-4 py-3 bg-gray-50 text-gray-900 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 placeholder:text-gray-400"
                placeholder="Enter slug"
              />
            </label>
          </section>

          <div className="flex">
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex-1 px-6 py-3.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-l-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20"
            >
              {isSubmitting ? (
                <>
                  <FaSpinner className="animate-spin text-sm" />
                  <span>Creating...</span>
                </>
              ) : (
                <span>Create Customer</span>
              )}
            </button>
            <button
              onClick={handleCancel}
              disabled={isSubmitting}
              className="flex-1 px-6 py-3.5 bg-gray-100 text-gray-700 rounded-r-xl hover:bg-gray-200 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center justify-center gap-2"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
